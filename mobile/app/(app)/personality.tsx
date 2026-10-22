import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "@/lib/api";
interface Assessment { version: string; items: string[]; anchors: string[]; answers: number[] | null; scores: Record<string, number> | null; }

export default function PersonalityScreen() {
  const [data, setData] = useState<Assessment>();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(20).fill(null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => { const next = await api.get<Assessment>("/api/personality"); setData(next); setAnswers(next.answers ?? Array(20).fill(null)); };
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  const save = async (remove = false) => {
    setBusy(true); setError("");
    try {
      if (remove) await api.delete("/api/personality"); else await api.post("/api/personality", { version: data?.version, answers });
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}><ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
    <TouchableOpacity onPress={() => router.back()}><Text>← Back</Text></TouchableOpacity>
    <Text style={{ fontSize: 24, fontWeight: "700" }}>Optional personality reflection</Text>
    <Text>Describe yourself as you generally are now. Rate how accurately each statement describes you. The 20-item Mini-IPIP is a brief, imperfect view of broad traits, not a diagnosis. It is private and does not affect matching rank.</Text>
    <Text>If you opt into relationship check-ins, these answers may also be recorded when future matches form to evaluate matching. You can delete your responses and saved research copies below.</Text>
    {!data && !error && <ActivityIndicator />}
    {data?.items.map((item, i) => <View key={i} style={{ gap: 8, padding: 14, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12 }}>
      <Text>{i + 1}. {item}</Text>{data.anchors.map((anchor, j) => <TouchableOpacity key={j} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: answers[i] === j + 1 }}
        onPress={() => setAnswers(prev => prev.map((v, k) => k === i ? j + 1 : v))} style={{ padding: 10, backgroundColor: answers[i] === j + 1 ? "#ffe4e6" : "#f9fafb" }}><Text>{anchor}</Text></TouchableOpacity>)}
    </View>)}
    {error ? <Text accessibilityRole="alert" style={{ color: "#b91c1c" }}>{error}</Text> : null}
    {data && <>
      <TouchableOpacity disabled={busy || answers.some(a => a === null)} onPress={() => save()} style={{ opacity: busy || answers.some(a => a === null) ? .5 : 1, padding: 14, backgroundColor: "#ffe4e6" }}><Text>Save and view my scores</Text></TouchableOpacity>
      <TouchableOpacity disabled={busy} onPress={() => save(true)} style={{ padding: 14 }}><Text style={{ color: "#b91c1c" }}>Delete my personality responses</Text></TouchableOpacity>
      {data.scores && <><Text style={{ fontWeight: "700" }}>Your scores on a 1–5 scale</Text>
        {Object.entries(data.scores).map(([label, value]) => <Text key={label}>{label}: {value.toFixed(2)}</Text>)}
        <Text>Higher means more of the named trait. These are not quality ratings or population percentiles. Short scales have measurement uncertainty.</Text>
      </>}
    </>}
    <Text>Public-domain IPIP Mini-IPIP; Donnellan et al. (2006).</Text>
  </ScrollView></SafeAreaView>;
}
