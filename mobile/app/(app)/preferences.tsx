import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";
import {
  CATEGORY_LABELS, CATEGORY_ICONS, CATEGORIES,
  type QuestionCategory, type QuestionType, type Importance,
} from "@/lib/questions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  key: string;
  category: QuestionCategory;
  text: string;
  type: QuestionType;
  options?: string[];
  minLabel?: string;
  maxLabel?: string;
  order: number;
}

type Answers = Record<string, string | string[] | number>;
type PriorityMap = Record<string, Importance>;

const IMPORTANCE_OPTIONS: { value: Importance; label: string; color: string; bg: string }[] = [
  { value: "IMPORTANT", label: "Important", color: Colors.rose500, bg: "#fff1f2" },
  { value: "SOMEWHAT_IMPORTANT", label: "Somewhat", color: "#f59e0b", bg: "#fffbeb" },
  { value: "NOT_IMPORTANT", label: "Not Important", color: Colors.gray400, bg: Colors.gray50 },
];

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PreferencesScreen() {
  const [tab, setTab] = useState<"answers" | "priorities">("answers");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [priorities, setPriorities] = useState<PriorityMap>({});
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<{ questions: Question[]; answers: Record<string, string> }>("/api/questionnaire"),
      api.get<{ priorities: Record<string, string> }>("/api/priorities"),
    ]).then(([qData, pData]) => {
      setQuestions(qData.questions);

      const prefilled: Answers = {};
      for (const [qId, val] of Object.entries(qData.answers)) {
        try { prefilled[qId] = JSON.parse(val); } catch { prefilled[qId] = val; }
      }
      setAnswers(prefilled);

      const prefillPriorities: PriorityMap = {};
      qData.questions.forEach((q) => {
        prefillPriorities[q.id] =
          (pData.priorities[q.id] as Importance) ?? "SOMEWHAT_IMPORTANT";
      });
      setPriorities(prefillPriorities);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showBanner = (msg: string) => {
    setSavedBanner(msg);
    setTimeout(() => setSavedBanner(""), 2500);
  };

  const saveAnswers = async () => {
    setSaving(true); setError("");
    try {
      const payload: Record<string, unknown> = {};
      for (const [qId, val] of Object.entries(answers)) payload[qId] = val;
      await api.post("/api/questionnaire", { answers: payload });
      showBanner("Answers saved");
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  };

  const savePriorities = async () => {
    setSaving(true); setError("");
    try {
      await api.post("/api/priorities", { priorities: priorities as Record<string, string> });
      showBanner("Priorities saved");
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  };

  const setAnswer = useCallback((id: string, value: string | string[] | number) => {
    setAnswers((p) => ({ ...p, [id]: value }));
  }, []);

  const toggleMulti = useCallback((id: string, option: string) => {
    setAnswers((p) => {
      const current = (p[id] as string[]) ?? [];
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...p, [id]: next };
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.rose500} />
      </View>
    );
  }

  const currentCategory = CATEGORIES[categoryIndex];
  const categoryQuestions = questions.filter((q) => q.category === currentCategory);
  const answeredCount = categoryQuestions.filter((q) => answers[q.id] !== undefined).length;
  const isLastCategory = categoryIndex === CATEGORIES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Preferences</Text>
        <View style={{ width: 60 }} />
      </View>

      {savedBanner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>✓ {savedBanner}</Text>
        </View>
      ) : null}

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "answers" && styles.tabBtnActive]}
          onPress={() => { setTab("answers"); setCategoryIndex(0); setError(""); }}
        >
          <Text style={[styles.tabText, tab === "answers" && styles.tabTextActive]}>Answers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "priorities" && styles.tabBtnActive]}
          onPress={() => { setTab("priorities"); setError(""); }}
        >
          <Text style={[styles.tabText, tab === "priorities" && styles.tabTextActive]}>Priorities</Text>
        </TouchableOpacity>
      </View>

      {/* ── Answers tab ── */}
      {tab === "answers" && (
        <View style={styles.flex}>
          {/* Category progress */}
          <View style={styles.progressRow}>
            {CATEGORIES.map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.progressBar, i <= categoryIndex && styles.progressBarActive]}
                onPress={() => setCategoryIndex(i)}
              />
            ))}
          </View>

          <View style={styles.catHeader}>
            <Text style={styles.catTitle}>
              {CATEGORY_ICONS[currentCategory]} {CATEGORY_LABELS[currentCategory]}
            </Text>
            <Text style={styles.catSub}>{answeredCount} of {categoryQuestions.length} answered</Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {categoryQuestions.map((q, qi) => (
              <View key={q.id} style={styles.questionCard}>
                <Text style={styles.questionNum}>Q{qi + 1}</Text>
                <Text style={styles.questionText}>{q.text}</Text>
                {q.type === "SCALE" && (
                  <ScaleQuestion value={answers[q.id] as number} onChange={(v) => setAnswer(q.id, v)} minLabel={q.minLabel} maxLabel={q.maxLabel} />
                )}
                {q.type === "SINGLE_CHOICE" && (
                  <ChoiceQuestion options={q.options ?? []} value={answers[q.id] as string} onChange={(v) => setAnswer(q.id, v)} multi={false} />
                )}
                {q.type === "MULTI_CHOICE" && (
                  <ChoiceQuestion options={q.options ?? []} value={answers[q.id] as string[]} onChange={(v) => toggleMulti(q.id, v as string)} multi={true} />
                )}
                {q.type === "RANK" && (
                  <RankQuestion options={q.options ?? []} value={answers[q.id] as string[]} onChange={(v) => setAnswer(q.id, v)} />
                )}
              </View>
            ))}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            {categoryIndex > 0 ? (
              <TouchableOpacity onPress={() => setCategoryIndex((i) => i - 1)} style={styles.prevBtn}>
                <Text style={styles.prevText}>← Prev</Text>
              </TouchableOpacity>
            ) : null}
            {!isLastCategory ? (
              <TouchableOpacity onPress={() => setCategoryIndex((i) => i + 1)} style={styles.nextBtn}>
                <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.nextText}>Next →</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={saveAnswers} disabled={saving} style={styles.nextBtn}>
                <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextText}>Save Answers</Text>}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Priorities tab ── */}
      {tab === "priorities" && (
        <View style={styles.flex}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Text style={styles.priorityHint}>
              Set how much each topic matters when finding your matches.
              {Object.values(priorities).filter((v) => v === "IMPORTANT").length > 0
                ? ` ${Object.values(priorities).filter((v) => v === "IMPORTANT").length} marked important.`
                : ""}
            </Text>
            {CATEGORIES.map((cat) => {
              const catQs = questions.filter((q) => q.category === cat);
              if (catQs.length === 0) return null;
              return (
                <View key={cat} style={styles.categorySection}>
                  <Text style={styles.categoryHeader}>
                    {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                  </Text>
                  {catQs.map((q) => (
                    <View key={q.id} style={styles.questionRow}>
                      <Text style={styles.priorityText}>{q.text}</Text>
                      <View style={styles.importanceRow}>
                        {IMPORTANCE_OPTIONS.map((opt) => {
                          const active = priorities[q.id] === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              onPress={() => setPriorities((p) => ({ ...p, [q.id]: opt.value }))}
                              style={[styles.impBtn, active && { borderColor: opt.color, backgroundColor: opt.bg }]}
                            >
                              <Text style={[styles.impText, active && { color: opt.color, fontWeight: "700" }]}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={savePriorities} disabled={saving} style={styles.nextBtn}>
              <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextText}>Save Priorities</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Question sub-components ─────────────────────────────────────────────────

function ScaleQuestion({ value, onChange, minLabel, maxLabel }: {
  value: number | undefined; onChange: (v: number) => void;
  minLabel?: string; maxLabel?: string;
}) {
  return (
    <View>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => onChange(s)}
            style={[styles.scaleBtn, value === s && styles.scaleBtnActive]}>
            <Text style={[styles.scaleBtnText, value === s && styles.scaleBtnTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {(minLabel || maxLabel) && (
        <View style={styles.scaleLabels}>
          <Text style={styles.scaleLabel}>{minLabel}</Text>
          <Text style={styles.scaleLabel}>{maxLabel}</Text>
        </View>
      )}
    </View>
  );
}

function ChoiceQuestion({ options, value, onChange, multi }: {
  options: string[]; value: string | string[] | undefined;
  onChange: (v: string) => void; multi: boolean;
}) {
  const isSelected = (opt: string) =>
    multi ? Array.isArray(value) && value.includes(opt) : value === opt;
  return (
    <View style={styles.choiceList}>
      {options.map((opt) => (
        <TouchableOpacity key={opt} onPress={() => onChange(opt)}
          style={[styles.choiceBtn, isSelected(opt) && styles.choiceBtnActive]}>
          <View style={[styles.choiceCheck, isSelected(opt) && styles.choiceCheckActive]}>
            {isSelected(opt) && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={[styles.choiceText, isSelected(opt) && styles.choiceTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function RankQuestion({ options, value, onChange }: {
  options: string[]; value: string[] | undefined; onChange: (v: string[]) => void;
}) {
  const ranked = value ?? [];
  const unranked = options.filter((o) => !ranked.includes(o));
  return (
    <View>
      <Text style={styles.rankHint}>Tap to rank in order of preference:</Text>
      {ranked.length > 0 && (
        <View style={styles.rankList}>
          {ranked.map((opt, i) => (
            <TouchableOpacity key={opt} onPress={() => onChange(ranked.filter((r) => r !== opt))}
              style={styles.rankItemActive}>
              <Text style={styles.rankNum}>{i + 1}</Text>
              <Text style={styles.rankItemTextActive}>{opt}</Text>
              <Text style={styles.rankRemove}>×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.rankList}>
        {unranked.map((opt) => (
          <TouchableOpacity key={opt} onPress={() => onChange([...ranked, opt])} style={styles.rankItem}>
            <Text style={styles.rankItemText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: Colors.gray100 },
  backBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  backText: { fontSize: 15, color: Colors.rose500, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: Colors.gray900 },

  banner: { backgroundColor: "#d1fae5", paddingVertical: 10, paddingHorizontal: 20, alignItems: "center" },
  bannerText: { fontSize: 13, fontWeight: "700", color: "#065f46" },

  tabBar: { flexDirection: "row", backgroundColor: Colors.gray100, margin: 16, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: Colors.gray500 },
  tabTextActive: { color: Colors.gray900 },

  progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 16, paddingBottom: 4 },
  progressBar: { flex: 1, height: 5, backgroundColor: Colors.gray100, borderRadius: 3 },
  progressBarActive: { backgroundColor: Colors.rose500 },

  catHeader: { paddingHorizontal: 16, paddingBottom: 8 },
  catTitle: { fontSize: 18, fontWeight: "800", color: Colors.gray900 },
  catSub: { fontSize: 12, color: Colors.gray500, marginTop: 2 },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 16 },

  questionCard: { backgroundColor: Colors.gray50, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.gray100 },
  questionNum: { fontSize: 11, fontWeight: "700", color: Colors.rose500, marginBottom: 4, textTransform: "uppercase" },
  questionText: { fontSize: 14, fontWeight: "600", color: Colors.gray800, marginBottom: 12, lineHeight: 20 },

  scaleRow: { flexDirection: "row", gap: 6, justifyContent: "space-between" },
  scaleBtn: { flex: 1, aspectRatio: 1, borderRadius: 10, backgroundColor: Colors.gray100, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
  scaleBtnActive: { backgroundColor: "#fff1f2", borderColor: Colors.rose500 },
  scaleBtnText: { fontSize: 15, fontWeight: "700", color: Colors.gray500 },
  scaleBtnTextActive: { color: Colors.rose500 },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  scaleLabel: { fontSize: 10, color: Colors.gray400 },

  choiceList: { gap: 6 },
  choiceBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: "#fff" },
  choiceBtnActive: { borderColor: Colors.rose500, backgroundColor: "#fff1f2" },
  choiceCheck: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.gray300, alignItems: "center", justifyContent: "center" },
  choiceCheckActive: { borderColor: Colors.rose500, backgroundColor: Colors.rose500 },
  checkMark: { color: "#fff", fontSize: 11, fontWeight: "700" },
  choiceText: { fontSize: 13, color: Colors.gray700 },
  choiceTextActive: { color: Colors.rose500, fontWeight: "600" },

  rankHint: { fontSize: 11, color: Colors.gray400, marginBottom: 6 },
  rankList: { gap: 5, marginBottom: 6 },
  rankItem: { padding: 9, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: "#fff" },
  rankItemText: { fontSize: 12, color: Colors.gray700 },
  rankItemActive: { flexDirection: "row", alignItems: "center", gap: 6, padding: 9, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.rose500, backgroundColor: "#fff1f2" },
  rankNum: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.rose500, textAlign: "center", color: "#fff", fontSize: 11, fontWeight: "700", lineHeight: 18 },
  rankItemTextActive: { flex: 1, fontSize: 12, color: Colors.rose500, fontWeight: "600" },
  rankRemove: { fontSize: 14, color: Colors.gray400 },

  priorityHint: { fontSize: 13, color: Colors.gray500, lineHeight: 20, marginBottom: 4 },
  categorySection: { gap: 10 },
  categoryHeader: { fontSize: 14, fontWeight: "800", color: Colors.gray800 },
  questionRow: { backgroundColor: Colors.gray50, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: Colors.gray100 },
  priorityText: { fontSize: 13, color: Colors.gray700, lineHeight: 18 },
  importanceRow: { flexDirection: "row", gap: 5 },
  impBtn: { flex: 1, paddingVertical: 6, paddingHorizontal: 2, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: "#fff", alignItems: "center" },
  impText: { fontSize: 10, color: Colors.gray500, fontWeight: "600", textAlign: "center" },

  footer: { flexDirection: "row", padding: 16, gap: 10, borderTopWidth: 1, borderColor: Colors.gray100 },
  prevBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.gray200, alignItems: "center", justifyContent: "center" },
  prevText: { fontSize: 14, fontWeight: "600", color: Colors.gray600 },
  nextBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  gradient: { paddingVertical: 15, alignItems: "center" },
  nextText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  errorText: { fontSize: 13, color: "#ef4444", textAlign: "center" },
});
