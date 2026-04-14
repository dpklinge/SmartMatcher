import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORIES, type QuestionCategory, type QuestionType, type Importance } from "@/lib/questions";

interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  type: QuestionType;
  order: number;
}

type PriorityMap = Record<string, Importance>;

const IMPORTANCE_OPTIONS: { value: Importance; label: string; color: string; bg: string }[] = [
  { value: "IMPORTANT", label: "Important", color: Colors.rose500, bg: "#fff1f2" },
  { value: "SOMEWHAT_IMPORTANT", label: "Somewhat", color: "#f59e0b", bg: "#fffbeb" },
  { value: "NOT_IMPORTANT", label: "Not Important", color: Colors.gray400, bg: Colors.gray50 },
];

export default function PrioritiesScreen() {
  const updateUser = useAuthStore((s) => s.updateUser);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [priorities, setPriorities] = useState<PriorityMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<{ questions: Question[] }>("/api/questionnaire")
      .then((data) => {
        setQuestions(data.questions);
        // Default all to SOMEWHAT_IMPORTANT
        const defaults: PriorityMap = {};
        data.questions.forEach((q) => { defaults[q.id] = "SOMEWHAT_IMPORTANT"; });
        setPriorities(defaults);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      // Backend takes Record<string, string>
      await api.post("/api/priorities", { priorities: priorities as Record<string, string> });
      updateUser({ onboardingStep: "COMPLETE" });
      router.replace("/(app)/discover");
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

  const importantCount = Object.values(priorities).filter((v) => v === "IMPORTANT").length;

  return (
    <View style={styles.outer}>
      {/* Progress */}
      <View style={styles.progressRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.progressBar, styles.progressBarActive]} />
        ))}
      </View>

      <View style={styles.header}>
        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.title}>Your Priorities</Text>
        <Text style={styles.subtitle}>
          Tell us what matters most to you.{importantCount > 0 ? ` ${importantCount} marked as important.` : ""}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {CATEGORIES.map((cat) => {
          const catQs = questions.filter((q) => q.category === cat);
          if (catQs.length === 0) return null;
          return (
            <View key={cat} style={styles.categorySection}>
              <Text style={styles.categoryHeader}>{CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}</Text>
              {catQs.map((q) => (
                <View key={q.id} style={styles.questionRow}>
                  <Text style={styles.questionText}>{q.text}</Text>
                  <View style={styles.importanceRow}>
                    {IMPORTANCE_OPTIONS.map((opt) => {
                      const active = priorities[q.id] === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setPriorities((p) => ({ ...p, [q.id]: opt.value }))}
                          style={[styles.impBtn, active && { borderColor: opt.color, backgroundColor: opt.bg }]}
                        >
                          <Text style={[styles.impText, active && { color: opt.color, fontWeight: "700" }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          );
        })}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Find My Matches →</Text>}
          </LinearGradient>
        </TouchableOpacity>
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
  content: { padding: 24, gap: 20, paddingBottom: 16 },
  categorySection: { gap: 12 },
  categoryHeader: { fontSize: 15, fontWeight: "800", color: Colors.gray800, marginBottom: 4 },
  questionRow: { backgroundColor: Colors.gray50, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.gray100 },
  questionText: { fontSize: 13, color: Colors.gray700, lineHeight: 20 },
  importanceRow: { flexDirection: "row", gap: 6 },
  impBtn: { flex: 1, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: "#fff", alignItems: "center" },
  impText: { fontSize: 11, color: Colors.gray500, fontWeight: "600", textAlign: "center" },
  footer: { flexDirection: "row", padding: 16, gap: 12, borderTopWidth: 1, borderColor: Colors.gray100 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.gray200, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 14, fontWeight: "600", color: Colors.gray600 },
  saveBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  gradient: { paddingVertical: 15, alignItems: "center" },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  error: { fontSize: 13, color: "#ef4444", textAlign: "center" },
});
