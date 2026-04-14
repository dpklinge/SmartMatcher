import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";

const GENDER_OPTIONS = ["Man", "Woman", "Non-binary", "Other"];
const SEEKING_OPTIONS = ["Men", "Women", "Everyone"];
const EDUCATION_OPTIONS = ["High School", "Some College", "Bachelor's", "Master's", "PhD", "Other"];

export default function ProfileSetupScreen() {
  const updateUser = useAuthStore((s) => s.updateUser);
  const [form, setForm] = useState({ name: "", bio: "", birthDate: "", gender: "", seeking: "", location: "", occupation: "", education: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.birthDate || !form.gender || !form.seeking) { setError("Please fill in all required fields"); return; }
    setSaving(true); setError("");
    try {
      await api.post("/api/onboarding/complete-profile", form);
      updateUser({ onboardingStep: "QUESTIONNAIRE" });
      router.replace("/(onboarding)/questionnaire");
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Progress */}
      <View style={styles.progressRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.progressBar, i === 0 && styles.progressBarActive]} />
        ))}
      </View>
      <Text style={styles.step}>Step 1 of 3</Text>
      <Text style={styles.title}>Your Profile</Text>
      <Text style={styles.subtitle}>Tell us about yourself</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => update("name", v)} placeholder="Your name" />

        <Text style={styles.label}>Bio</Text>
        <TextInput style={[styles.input, styles.textarea]} value={form.bio} onChangeText={(v) => update("bio", v)} placeholder="A little about yourself..." multiline numberOfLines={3} />

        <Text style={styles.label}>Date of Birth *</Text>
        <TextInput style={styles.input} value={form.birthDate} onChangeText={(v) => update("birthDate", v)} placeholder="YYYY-MM-DD" keyboardType="numeric" />

        <Text style={styles.label}>I am a *</Text>
        <View style={styles.chips}>
          {GENDER_OPTIONS.map((g) => (
            <TouchableOpacity key={g} onPress={() => update("gender", g.toLowerCase().replace("-", ""))} style={[styles.chip, form.gender === g.toLowerCase().replace("-", "") && styles.chipActive]}>
              <Text style={[styles.chipText, form.gender === g.toLowerCase().replace("-", "") && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Looking for *</Text>
        <View style={styles.chips}>
          {SEEKING_OPTIONS.map((s) => (
            <TouchableOpacity key={s} onPress={() => update("seeking", s.toLowerCase())} style={[styles.chip, form.seeking === s.toLowerCase() && styles.chipActive]}>
              <Text style={[styles.chipText, form.seeking === s.toLowerCase() && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={form.location} onChangeText={(v) => update("location", v)} placeholder="City, State" />

        <Text style={styles.label}>Occupation</Text>
        <TextInput style={styles.input} value={form.occupation} onChangeText={(v) => update("occupation", v)} placeholder="Job title" />

        <Text style={styles.label}>Education</Text>
        <View style={styles.chips}>
          {EDUCATION_OPTIONS.map((e) => (
            <TouchableOpacity key={e} onPress={() => update("education", e)} style={[styles.chip, form.education === e && styles.chipActive]}>
              <Text style={[styles.chipText, form.education === e && styles.chipTextActive]}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={handleSubmit} disabled={saving} style={styles.btn}>
          <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue →</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, paddingBottom: 48 },
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  progressBar: { flex: 1, height: 6, backgroundColor: Colors.gray100, borderRadius: 3 },
  progressBarActive: { backgroundColor: Colors.rose500 },
  step: { fontSize: 12, color: Colors.gray400, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "800", color: Colors.gray900, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.gray500, marginBottom: 24 },
  form: { gap: 12 },
  label: { fontSize: 13, fontWeight: "700", color: Colors.gray700, marginBottom: -4 },
  input: { backgroundColor: Colors.gray50, borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: Colors.gray900 },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: Colors.gray50 },
  chipActive: { borderColor: Colors.rose500, backgroundColor: "#fff1f2" },
  chipText: { fontSize: 13, fontWeight: "600", color: Colors.gray600 },
  chipTextActive: { color: Colors.rose500 },
  btn: { borderRadius: 16, overflow: "hidden", marginTop: 12 },
  gradient: { paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { fontSize: 13, color: "#ef4444", textAlign: "center" },
});
