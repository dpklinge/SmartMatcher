import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { STAGE_LABELS, STATUS_LABELS, type FeedbackForm, type ResearchState } from "@/lib/research";

export default function ResearchScreen() {
  const [data, setData] = useState<ResearchState>();
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => setData(await api.get<ResearchState>("/api/research"));
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  const action = async (fn: () => Promise<void>) => {
    setBusy(true); setError(""); setMessage("");
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const consent = (enabled: boolean) => action(async () => {
    await api.post("/api/research", { enabled, policyVersion: data?.consent.policyVersion });
    setForm(null); await load();
  });
  const open = (match: ResearchState["matches"][number], stage: string) => {
    const prior = match.reports.find(r => r.stage === stage);
    const latest = [...match.reports].reverse().find(r => r.relationshipStartedAt);
    setForm({ matchId: match.id, stage, status: prior?.status ?? (stage === "AFTER_MEETING" ? "NOT_MET" : "IN_RELATIONSHIP"),
      metAt: (prior?.metAt ?? (stage === "AFTER_MEETING" ? null : latest?.metAt))?.slice(0, 10) ?? null,
      relationshipStartedAt: (prior?.relationshipStartedAt ?? (stage === "AFTER_MEETING" ? null : latest?.relationshipStartedAt))?.slice(0, 10) ?? null,
      satisfaction: prior?.satisfaction ?? null, respect: prior?.respect ?? null, wantsToContinue: prior?.wantsToContinue ?? null });
    setMessage(""); setError("");
  };
  const button = (label: string, fn: () => void, disabled = false) => <TouchableOpacity disabled={busy || disabled} onPress={fn}
    style={{ padding: 13, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: disabled ? "#f3f4f6" : "white", opacity: busy ? .5 : 1 }}><Text>{label}</Text></TouchableOpacity>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}><ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
    {button("← Back", () => router.back())}
    <Text style={{ fontSize: 24, fontWeight: "700" }}>Relationship check-ins</Text>
    <Text>Help us learn whether introductions lead to relationships both people enjoy and want to continue.</Text>
    <Text>Participation is optional and does not change your ranking. If you join, we record your questionnaire, priorities, and optional personality answers when future matches form. Your check-ins and those saved answers may be used to evaluate and improve matching within this app. They are private from other users and are not sent to external AI services.</Text>
    <Text>You can export your records or withdraw and delete them at any time. Unmatching deletes check-ins for that match. Choosing not to respond is never treated as a failed relationship.</Text>
    {!data && !error && <ActivityIndicator />}
    {data && (data.consent.enabled ? <>
      <Text>You have opted in.</Text>
      {button("Export my research data", () => action(async () => { const records = await api.get("/api/research/export"); await Share.share({ message: JSON.stringify(records, null, 2) }); }))}
      {button("Stop participating and delete my research data", () => consent(false))}
    </> : button("I agree to participate", () => consent(true)))}
    {data?.consent.enabled && !form && data.matches.length === 0 && <Text>Your matches will appear here. No check-in is required to keep using the app.</Text>}
    {data?.consent.enabled && !form && data.matches.map(m => <View key={m.id} style={{ gap: 8, padding: 14, backgroundColor: "#f9fafb", borderRadius: 12 }}>
      <Text style={{ fontWeight: "700" }}>Your connection with {m.name}</Text>
      {m.checkpoints.map(c => <View key={c.stage}>{button(`${STAGE_LABELS[c.stage]}${m.reports.some(r => r.stage === c.stage) ? " (saved)" : ""}${!c.available ? c.dueAt ? ` — due ${c.dueAt.slice(0, 10)}` : " — after a relationship starts" : ""}`, () => open(m, c.stage), !c.available)}</View>)}
    </View>)}
    {form && <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>{STAGE_LABELS[form.stage]} · {data?.matches.find(m => m.id === form.matchId)?.name}</Text>
      <Text>Only your responses appear here. Your match cannot see them.</Text>
      {Object.entries(STATUS_LABELS).map(([key, label]) => <View key={key}>{button(`${form.status === key ? "● " : "○ "}${label}`, () => setForm({ ...form, status: key,
        ...(key === "NOT_MET" ? { metAt: null, relationshipStartedAt: null, satisfaction: null, respect: null, wantsToContinue: null } : key === "GETTING_TO_KNOW" ? { relationshipStartedAt: null } : {}) }))}</View>)}
      {form.status !== "NOT_MET" && <>
        <Text>When did you first meet in person? (YYYY-MM-DD)</Text>
        <TextInput accessibilityLabel="First meeting date" placeholder="YYYY-MM-DD" value={form.metAt ?? ""} onChangeText={metAt => setForm({ ...form, metAt: metAt || null })} style={{ padding: 12, borderWidth: 1, borderColor: "#d1d5db" }} />
        {form.status !== "GETTING_TO_KNOW" && <><Text>When did the relationship begin? (optional if you only dated)</Text>
          <TextInput accessibilityLabel="Relationship start date" placeholder="YYYY-MM-DD" value={form.relationshipStartedAt ?? ""} onChangeText={relationshipStartedAt => setForm({ ...form, relationshipStartedAt: relationshipStartedAt || null })} style={{ padding: 12, borderWidth: 1, borderColor: "#d1d5db" }} />
        </>}
        {([ ["satisfaction", "How satisfied are you with this connection? 1 = very dissatisfied; 7 = very satisfied."],
          ["respect", "How respected did you feel? 1 = not at all; 7 = very respected."] ] as const).map(([key, label]) => <View key={key} style={{ gap: 8 }}>
          <Text>{label}</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{[1, 2, 3, 4, 5, 6, 7].map(n => <View key={n}>{button(`${form[key] === n ? "● " : ""}${n}`, () => setForm({ ...form, [key]: n }))}</View>)}</View>
          {button("Skip this rating", () => setForm({ ...form, [key]: null }))}
        </View>)}
        <Text>Do you want this connection to continue?</Text>
        {[["YES", "Yes"], ["NO", "No"], ["UNSURE", "Not sure"], ["", "Skip this question"]].map(([key, label]) => <View key={key}>{button(`${form.wantsToContinue === key ? "● " : ""}${label}`, () => setForm({ ...form, wantsToContinue: key || null }))}</View>)}
      </>}
      {button("Save private check-in", () => action(async () => { await api.post("/api/research/follow-ups", form); setForm(null); await load(); setMessage("Your private check-in was saved."); }))}
      {button("Cancel", () => setForm(null))}
    </View>}
    {error ? <Text accessibilityRole="alert" style={{ color: "#b91c1c" }}>{error}</Text> : null}
    {message ? <Text style={{ color: "#047857" }}>{message}</Text> : null}
  </ScrollView></SafeAreaView>;
}
