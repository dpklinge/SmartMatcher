import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from "react-native";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setTokens = useAuthStore((s) => s.setTokens);

  const handleRegister = async () => {
    if (!name || !email || !password) { setError("All fields required"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setLoading(true); setError("");
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string; user: Parameters<typeof setTokens>[2] }>(
        "/api/mobile/register", { name, email, password, confirmPassword: confirm }
      );
      await setTokens(data.accessToken, data.refreshToken, data.user);
      router.replace("/(onboarding)/profile-setup");
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>💞</Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start finding your match today</Text>
        </View>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} autoComplete="name" />
          <TextInput style={styles.input} placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <TextInput style={styles.input} placeholder="Password (min 8 chars)" value={password} onChangeText={setPassword} secureTextEntry />
          <TextInput style={styles.input} placeholder="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity onPress={handleRegister} disabled={loading} style={styles.submitBtn}>
            <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Account</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity><Text style={styles.linkText}>Sign in</Text></TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff1f2", padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "800", color: Colors.gray900 },
  subtitle: { fontSize: 14, color: Colors.gray500, marginTop: 4 },
  form: { gap: 12 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, color: Colors.gray900 },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  gradient: { paddingVertical: 16, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { fontSize: 13, color: "#ef4444", textAlign: "center" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 14, color: Colors.gray500 },
  linkText: { fontSize: 14, color: Colors.rose500, fontWeight: "600" },
});
