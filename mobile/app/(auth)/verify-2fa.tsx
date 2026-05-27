import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

const STEP_ROUTES: Record<string, string> = {
  PROFILE_SETUP: "/(onboarding)/profile-setup",
  QUESTIONNAIRE: "/(onboarding)/questionnaire",
  PRIORITIES: "/(onboarding)/priorities",
  COMPLETE: "/(app)/discover",
};

export default function Verify2FAScreen() {
  const { pendingToken, method } = useLocalSearchParams<{ pendingToken: string; method: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setTokens = useAuthStore((s) => s.setTokens);

  const handleVerify = async () => {
    if (code.length !== 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/mobile/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pendingToken}` },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Invalid code");
        return;
      }

      const data = await res.json();
      await setTokens(data.accessToken, data.refreshToken, data.user);
      const route = STEP_ROUTES[data.user.onboardingStep] ?? "/(app)/discover";
      router.replace(route as never);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🔐</Text>
      <Text style={styles.title}>Two-Factor Authentication</Text>
      <Text style={styles.subtitle}>
        {method === "SMS" ? "Enter the code sent to your phone" : "Enter the code from your authenticator app"}
      </Text>

      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={Colors.gray300}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity onPress={handleVerify} disabled={loading || code.length !== 6} style={styles.btn}>
        <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff1f2", alignItems: "center", justifyContent: "center", padding: 32 },
  logo: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: Colors.gray900, textAlign: "center" },
  subtitle: { fontSize: 14, color: Colors.gray500, textAlign: "center", marginTop: 8, marginBottom: 32 },
  codeInput: { width: "100%", backgroundColor: "#fff", borderWidth: 2, borderColor: Colors.gray200, borderRadius: 16, paddingVertical: 18, textAlign: "center", fontSize: 32, letterSpacing: 16, fontWeight: "700", color: Colors.gray900 },
  error: { fontSize: 13, color: "#ef4444", marginTop: 8 },
  btn: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 20 },
  gradient: { paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  back: { marginTop: 20, fontSize: 14, color: Colors.gray500 },
});
