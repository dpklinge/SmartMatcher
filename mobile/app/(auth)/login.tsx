import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from "react-native";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setTokens = useAuthStore((s) => s.setTokens);

  const googleConfigured = !!(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
  );
  // Always call hooks (Rules of Hooks). Use placeholder when unconfigured so the
  // platform invariant is satisfied — buttons are hidden anyway when not configured.
  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "unconfigured",
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "unconfigured",
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "unconfigured",
  });
  const fbConfigured = !!process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const [fbRequest, fbResponse, promptFacebook] = Facebook.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "unconfigured",
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params.id_token ?? (googleResponse as Record<string, unknown>).authentication?.idToken;
      if (idToken) handleOAuth("google", { idToken });
    }
  }, [googleResponse]);

  useEffect(() => {
    if (fbResponse?.type === "success") {
      const accessToken = fbResponse.params.access_token;
      if (accessToken) handleOAuth("facebook", { accessToken });
    }
  }, [fbResponse]);

  const handleOAuth = async (provider: string, tokenData: Record<string, string>) => {
    setLoading(true); setError("");
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string; user: Parameters<typeof setTokens>[2] }>(
        "/api/mobile/oauth", { provider, ...tokenData }
      );
      await setTokens(data.accessToken, data.refreshToken, data.user);
      navigateAfterLogin(data.user.onboardingStep);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };

  const handleEmailLogin = async () => {
    setLoading(true); setError("");
    try {
      const data = await api.post<{ accessToken?: string; refreshToken?: string; user?: Parameters<typeof setTokens>[2]; requires2FA?: boolean; pendingToken?: string; twoFactorMethod?: string }>(
        "/api/mobile/login", { email, password }
      );
      if (data.requires2FA && data.pendingToken) {
        router.push({ pathname: "/(auth)/verify-2fa", params: { pendingToken: data.pendingToken, method: data.twoFactorMethod ?? "TOTP" } });
        return;
      }
      if (data.accessToken && data.user) {
        await setTokens(data.accessToken, data.refreshToken!, data.user);
        navigateAfterLogin(data.user.onboardingStep);
      }
    } catch (e) { setError("Invalid email or password"); }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    setLoading(true); setError("");
    try {
      await api.post("/api/mobile/phone/send-otp", { phoneNumber: phone });
      setOtpSent(true);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true); setError("");
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string; user: Parameters<typeof setTokens>[2] }>(
        "/api/mobile/phone/verify-otp", { phoneNumber: phone, otp }
      );
      await setTokens(data.accessToken, data.refreshToken, data.user);
      navigateAfterLogin(data.user.onboardingStep);
    } catch (e) { setError("Invalid or expired code"); }
    setLoading(false);
  };

  const navigateAfterLogin = (step: string) => {
    const routes: Record<string, string> = {
      PROFILE_SETUP: "/(onboarding)/profile-setup",
      QUESTIONNAIRE: "/(onboarding)/questionnaire",
      PRIORITIES: "/(onboarding)/priorities",
      COMPLETE: "/(app)/discover",
    };
    router.replace((routes[step] ?? "/(app)/discover") as never);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>💞</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* OAuth Buttons */}
        {googleConfigured && (
          <TouchableOpacity onPress={() => promptGoogle()} disabled={!googleRequest || loading} style={styles.oauthBtn}>
            <Text style={styles.oauthIcon}>🇬</Text>
            <Text style={styles.oauthText}>Continue with Google</Text>
          </TouchableOpacity>
        )}
        {fbConfigured && (
          <TouchableOpacity onPress={() => promptFacebook()} disabled={!fbRequest || loading} style={[styles.oauthBtn, { marginTop: 10 }]}>
            <Text style={styles.oauthIcon}>𝕗</Text>
            <Text style={styles.oauthText}>Continue with Meta</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setTab("email")} style={[styles.tab, tab === "email" && styles.tabActive]}>
            <Text style={[styles.tabText, tab === "email" && styles.tabTextActive]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("phone")} style={[styles.tab, tab === "phone" && styles.tabActive]}>
            <Text style={[styles.tabText, tab === "phone" && styles.tabTextActive]}>Phone</Text>
          </TouchableOpacity>
        </View>

        {tab === "email" ? (
          <View style={styles.form}>
            <TextInput style={styles.input} placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity onPress={handleEmailLogin} disabled={loading} style={styles.submitBtn}>
              <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Sign In</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {!otpSent ? (
              <>
                <TextInput style={styles.input} placeholder="+1 234 567 8900" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity onPress={handleSendOtp} disabled={loading} style={styles.submitBtn}>
                  <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send Code</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.otpHint}>Enter the 6-digit code sent to {phone}</Text>
                <TextInput style={[styles.input, styles.otpInput]} placeholder="000000" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <TouchableOpacity onPress={handleVerifyOtp} disabled={loading} style={styles.submitBtn}>
                  <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Verify Code</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOtpSent(false)}><Text style={styles.linkText}>Change number</Text></TouchableOpacity>
              </>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity><Text style={styles.linkText}>Create one</Text></TouchableOpacity>
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
  oauthBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20 },
  oauthIcon: { fontSize: 18 },
  oauthText: { fontSize: 15, fontWeight: "600", color: Colors.gray700 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.gray100 },
  dividerText: { fontSize: 12, color: Colors.gray400, fontWeight: "600" },
  tabs: { flexDirection: "row", backgroundColor: Colors.gray100, borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: Colors.gray500 },
  tabTextActive: { color: Colors.gray900 },
  form: { gap: 12 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, color: Colors.gray900 },
  otpInput: { textAlign: "center", fontSize: 24, letterSpacing: 12, fontWeight: "700" },
  otpHint: { fontSize: 13, color: Colors.gray500, textAlign: "center" },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  gradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { fontSize: 13, color: "#ef4444", textAlign: "center" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 14, color: Colors.gray500 },
  linkText: { fontSize: 14, color: Colors.rose500, fontWeight: "600" },
});
