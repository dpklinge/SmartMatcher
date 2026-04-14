import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORIES, type QuestionCategory, type QuestionType } from "@/lib/questions";

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

export default function QuestionnaireScreen() {
  const updateUser = useAuthStore((s) => s.updateUser);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<{ questions: Question[]; answers: Record<string, string> }>("/api/questionnaire")
      .then((data) => {
        setQuestions(data.questions);
        // Pre-fill with existing answers
        const prefilled: Answers = {};
        for (const [qId, val] of Object.entries(data.answers)) {
          try { prefilled[qId] = JSON.parse(val); } catch { prefilled[qId] = val; }
        }
        setAnswers(prefilled);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const currentCategory = CATEGORIES[categoryIndex];
  const categoryQuestions = questions.filter((q) => q.category === currentCategory);
  const answeredCount = categoryQuestions.filter((q) => answers[q.id] !== undefined).length;
  const isLastCategory = categoryIndex === CATEGORIES.length - 1;

  const setAnswer = (id: string, value: string | string[] | number) => {
    setAnswers((p) => ({ ...p, [id]: value }));
  };

  const toggleMulti = (id: string, option: string) => {
    const current = (answers[id] as string[]) ?? [];
    const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
    setAnswer(id, next);
  };

  const handleNext = async () => {
    if (!isLastCategory) {
      setCategoryIndex((i) => i + 1);
      return;
    }
    setSaving(true); setError("");
    try {
      // Backend takes Record<string, unknown> — pass values directly
      const answersPayload: Record<string, unknown> = {};
      for (const [qId, val] of Object.entries(answers)) {
        answersPayload[qId] = val;
      }
      await api.post("/api/questionnaire", { answers: answersPayload });
      updateUser({ onboardingStep: "PRIORITIES" });
      router.replace("/(onboarding)/priorities");
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.rose500} />
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      {/* Progress */}
      <View style={styles.progressRow}>
        {CATEGORIES.map((_, i) => (
          <View key={i} style={[styles.progressBar, i <= categoryIndex && styles.progressBarActive]} />
        ))}
      </View>

      <View style={styles.header}>
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>{CATEGORY_ICONS[currentCategory]} {CATEGORY_LABELS[currentCategory]}</Text>
        <Text style={styles.subtitle}>{answeredCount} of {categoryQuestions.length} answered</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {categoryQuestions.map((q, qi) => (
          <View key={q.id} style={styles.questionCard}>
            <Text style={styles.questionNum}>Q{qi + 1}</Text>
            <Text style={styles.questionText}>{q.text}</Text>

            {q.type === "SCALE" && (
              <ScaleQuestion
                value={answers[q.id] as number}
                onChange={(v) => setAnswer(q.id, v)}
                minLabel={q.minLabel}
                maxLabel={q.maxLabel}
              />
            )}
            {q.type === "SINGLE_CHOICE" && (
              <ChoiceQuestion
                options={q.options ?? []}
                value={answers[q.id] as string}
                onChange={(v) => setAnswer(q.id, v)}
                multi={false}
              />
            )}
            {q.type === "MULTI_CHOICE" && (
              <ChoiceQuestion
                options={q.options ?? []}
                value={answers[q.id] as string[]}
                onChange={(v) => toggleMulti(q.id, v as string)}
                multi={true}
              />
            )}
            {q.type === "RANK" && (
              <RankQuestion
                options={q.options ?? []}
                value={answers[q.id] as string[]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            )}
          </View>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {categoryIndex > 0 && (
          <TouchableOpacity onPress={() => setCategoryIndex((i) => i - 1)} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleNext} disabled={saving} style={styles.nextBtn}>
          <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.nextText}>{isLastCategory ? "Finish →" : "Next →"}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ScaleQuestion({ value, onChange, minLabel, maxLabel }: {
  value: number | undefined;
  onChange: (v: number) => void;
  minLabel?: string;
  maxLabel?: string;
}) {
  const steps = [1, 2, 3, 4, 5];
  return (
    <View>
      <View style={styles.scaleRow}>
        {steps.map((s) => (
          <TouchableOpacity key={s} onPress={() => onChange(s)} style={[styles.scaleBtn, value === s && styles.scaleBtnActive]}>
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
  options: string[];
  value: string | string[] | undefined;
  onChange: (v: string) => void;
  multi: boolean;
}) {
  const isSelected = (opt: string) => {
    if (multi) return Array.isArray(value) && value.includes(opt);
    return value === opt;
  };
  return (
    <View style={styles.choiceList}>
      {options.map((opt) => (
        <TouchableOpacity key={opt} onPress={() => onChange(opt)} style={[styles.choiceBtn, isSelected(opt) && styles.choiceBtnActive]}>
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
  options: string[];
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const ranked = value ?? [];
  const unranked = options.filter((o) => !ranked.includes(o));

  const addToRank = (opt: string) => onChange([...ranked, opt]);
  const removeFromRank = (opt: string) => onChange(ranked.filter((r) => r !== opt));

  return (
    <View>
      <Text style={styles.rankHint}>Tap to rank in order of preference:</Text>
      {ranked.length > 0 && (
        <View style={styles.rankList}>
          {ranked.map((opt, i) => (
            <TouchableOpacity key={opt} onPress={() => removeFromRank(opt)} style={styles.rankItemActive}>
              <Text style={styles.rankNum}>{i + 1}</Text>
              <Text style={styles.rankItemTextActive}>{opt}</Text>
              <Text style={styles.rankRemove}>×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.rankList}>
        {unranked.map((opt) => (
          <TouchableOpacity key={opt} onPress={() => addToRank(opt)} style={styles.rankItem}>
            <Text style={styles.rankItemText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 24, paddingTop: 16 },
  progressBar: { flex: 1, height: 5, backgroundColor: Colors.gray100, borderRadius: 3 },
  progressBarActive: { backgroundColor: Colors.rose500 },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  step: { fontSize: 12, color: Colors.gray400, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "800", color: Colors.gray900 },
  subtitle: { fontSize: 13, color: Colors.gray500, marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 24, gap: 16, paddingBottom: 16 },
  questionCard: { backgroundColor: Colors.gray50, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.gray100 },
  questionNum: { fontSize: 11, fontWeight: "700", color: Colors.rose500, marginBottom: 4, textTransform: "uppercase" },
  questionText: { fontSize: 15, fontWeight: "600", color: Colors.gray800, marginBottom: 14, lineHeight: 22 },
  // Scale
  scaleRow: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  scaleBtn: { flex: 1, aspectRatio: 1, borderRadius: 12, backgroundColor: Colors.gray100, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
  scaleBtnActive: { backgroundColor: "#fff1f2", borderColor: Colors.rose500 },
  scaleBtnText: { fontSize: 16, fontWeight: "700", color: Colors.gray500 },
  scaleBtnTextActive: { color: Colors.rose500 },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  scaleLabel: { fontSize: 10, color: Colors.gray400, flex: 1 },
  // Choice
  choiceList: { gap: 8 },
  choiceBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: "#fff" },
  choiceBtnActive: { borderColor: Colors.rose500, backgroundColor: "#fff1f2" },
  choiceCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.gray300, alignItems: "center", justifyContent: "center" },
  choiceCheckActive: { borderColor: Colors.rose500, backgroundColor: Colors.rose500 },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  choiceText: { fontSize: 14, color: Colors.gray700 },
  choiceTextActive: { color: Colors.rose500, fontWeight: "600" },
  // Rank
  rankHint: { fontSize: 12, color: Colors.gray400, marginBottom: 8 },
  rankList: { gap: 6, marginBottom: 8 },
  rankItem: { padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: "#fff" },
  rankItemText: { fontSize: 13, color: Colors.gray700 },
  rankItemActive: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.rose500, backgroundColor: "#fff1f2" },
  rankNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.rose500, textAlign: "center", color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 20 },
  rankItemTextActive: { flex: 1, fontSize: 13, color: Colors.rose500, fontWeight: "600" },
  rankRemove: { fontSize: 16, color: Colors.gray400 },
  // Footer
  footer: { flexDirection: "row", padding: 16, gap: 12, borderTopWidth: 1, borderColor: Colors.gray100 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.gray200, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 14, fontWeight: "600", color: Colors.gray600 },
  nextBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  gradient: { paddingVertical: 15, alignItems: "center" },
  nextText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  error: { fontSize: 13, color: "#ef4444", textAlign: "center" },
});
