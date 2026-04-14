import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Image, SafeAreaView } from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";

interface SecurityInfo {
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  email: string | null;
  phoneNumber: string | null;
}

interface LocationPrefs {
  latitude: number | null;
  longitude: number | null;
  searchRadius: number;
}

type SetupView = "idle" | "setup-totp" | "setup-sms" | "disable";

const RADIUS_OPTIONS = [10, 25, 50, 100, 250, 0] as const; // 0 = anywhere
const radiusLabel = (r: number) => (r === 0 ? "Anywhere" : `${r} km`);

export default function SettingsScreen() {
  const [info, setInfo] = useState<SecurityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<SetupView>("idle");
  const [totpQr, setTotpQr] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [phone, setPhone] = useState("");
  const [smsStep, setSmsStep] = useState<"phone" | "verify">("phone");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Location filter state
  const [locPrefs, setLocPrefs] = useState<LocationPrefs>({ latitude: null, longitude: null, searchRadius: 50 });
  const [locWorking, setLocWorking] = useState(false);
  const [locError, setLocError] = useState("");
  const [locSuccess, setLocSuccess] = useState("");

  const loadInfo = () => {
    setLoading(true);
    api.get<{
      profile: { latitude?: number | null; longitude?: number | null; searchRadius?: number } | null;
      user: { twoFactorEnabled: boolean; twoFactorMethod?: string | null; email: string | null; phoneNumber?: string | null };
    }>("/api/profile").then((d) => {
      setInfo({
        twoFactorEnabled: d.user.twoFactorEnabled,
        twoFactorMethod: d.user.twoFactorMethod ?? null,
        email: d.user.email,
        phoneNumber: d.user.phoneNumber ?? null,
      });
      setLocPrefs({
        latitude: d.profile?.latitude ?? null,
        longitude: d.profile?.longitude ?? null,
        searchRadius: d.profile?.searchRadius ?? 50,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadInfo(); }, []);

  const startTotpSetup = async () => {
    setWorking(true); setError("");
    try {
      const data = await api.post<{ qrCode: string; secret: string }>("/api/2fa/setup", { method: "TOTP" });
      setTotpQr(data.qrCode);
      setTotpSecret(data.secret);
      setView("setup-totp");
    } catch (e) { setError((e as Error).message); }
    setWorking(false);
  };

  const verifyTotp = async () => {
    if (verifyCode.length !== 6) { setError("Enter the 6-digit code"); return; }
    setWorking(true); setError("");
    try {
      await api.post("/api/2fa/verify", { code: verifyCode });
      setSuccess("Two-factor authentication enabled!");
      setView("idle");
      setVerifyCode("");
      setTotpQr("");
      setTotpSecret("");
      loadInfo();
    } catch (e) { setError((e as Error).message); }
    setWorking(false);
  };

  const sendSmsOtp = async () => {
    setWorking(true); setError("");
    try {
      await api.post("/api/2fa/setup", { method: "SMS", phoneNumber: phone });
      setSmsStep("verify");
    } catch (e) { setError((e as Error).message); }
    setWorking(false);
  };

  const verifySmsSetup = async () => {
    if (verifyCode.length !== 6) { setError("Enter the 6-digit code"); return; }
    setWorking(true); setError("");
    try {
      await api.post("/api/2fa/verify", { code: verifyCode });
      setSuccess("SMS two-factor authentication enabled!");
      setView("idle");
      setVerifyCode("");
      setPhone("");
      setSmsStep("phone");
      loadInfo();
    } catch (e) { setError((e as Error).message); }
    setWorking(false);
  };

  const disable2FA = async () => {
    setWorking(true); setError("");
    try {
      await api.post("/api/2fa/disable", {});
      setSuccess("Two-factor authentication disabled.");
      setView("idle");
      loadInfo();
    } catch (e) { setError((e as Error).message); }
    setWorking(false);
  };

  const useGpsLocation = async () => {
    setLocWorking(true); setLocError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocError("Location permission denied. Enable it in device settings.");
        setLocWorking(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocPrefs((p) => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
    } catch { setLocError("Could not get location. Try again."); }
    setLocWorking(false);
  };

  const saveLocationPrefs = async () => {
    setLocWorking(true); setLocError(""); setLocSuccess("");
    try {
      await api.patch("/api/profile", {
        latitude: locPrefs.latitude,
        longitude: locPrefs.longitude,
        searchRadius: locPrefs.searchRadius === 0 ? null : locPrefs.searchRadius,
      });
      setLocSuccess("Location preferences saved.");
      setTimeout(() => setLocSuccess(""), 2500);
    } catch (e) { setLocError((e as Error).message); }
    setLocWorking(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Settings ⚙️</Text>

        {success ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ {success}</Text>
          </View>
        ) : null}

        {/* Preferences link */}
        <TouchableOpacity style={styles.navRow} onPress={() => router.push("/(app)/preferences")}>
          <View style={styles.navRowLeft}>
            <Text style={styles.navRowIcon}>💡</Text>
            <View>
              <Text style={styles.navRowTitle}>My Preferences</Text>
              <Text style={styles.navRowSub}>Review and edit your questionnaire answers and priorities</Text>
            </View>
          </View>
          <Text style={styles.navRowChevron}>›</Text>
        </TouchableOpacity>

        {/* Location filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Filter 📍</Text>
          <Text style={styles.sectionSubtitle}>
            Only show profiles within a set distance. Requires location access.
          </Text>

          {locPrefs.latitude != null ? (
            <View style={styles.coordsBox}>
              <Text style={styles.coordsText}>
                📌 {locPrefs.latitude.toFixed(4)}, {locPrefs.longitude?.toFixed(4)}
              </Text>
              <TouchableOpacity onPress={() => setLocPrefs((p) => ({ ...p, latitude: null, longitude: null }))}>
                <Text style={styles.clearCoords}>✕ Clear</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity onPress={useGpsLocation} disabled={locWorking} style={styles.gpsBtn}>
            {locWorking
              ? <ActivityIndicator color={Colors.rose500} size="small" />
              : <Text style={styles.gpsBtnText}>📡 Use My Current Location</Text>}
          </TouchableOpacity>

          <Text style={styles.radiusLabel}>Search radius:</Text>
          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS.map((r) => {
              const active = locPrefs.searchRadius === r || (r === 0 && locPrefs.latitude == null);
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setLocPrefs((p) => ({ ...p, searchRadius: r }))}
                  style={[styles.radiusBtn, active && styles.radiusBtnActive]}
                >
                  <Text style={[styles.radiusBtnText, active && styles.radiusBtnTextActive]}>
                    {radiusLabel(r)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {locError ? <Text style={styles.locError}>{locError}</Text> : null}
          {locSuccess ? <Text style={styles.locSuccess}>✓ {locSuccess}</Text> : null}

          <TouchableOpacity onPress={saveLocationPrefs} disabled={locWorking} style={styles.primaryBtn}>
            {locWorking
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.primaryBtnText}>Save Location Settings</Text>}
          </TouchableOpacity>
        </View>

        {/* 2FA section */}
        <View style={styles.section}>
          <View style={styles.statusRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Two-Factor Authentication 🔒</Text>
              <Text style={styles.sectionSubtitle}>
                {info?.twoFactorEnabled
                  ? `Enabled via ${info.twoFactorMethod === "SMS" ? "SMS" : "Authenticator App"}`
                  : "Not enabled — add extra protection to your account"}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: info?.twoFactorEnabled ? "#d1fae5" : Colors.gray100 }]}>
              <Text style={[styles.badgeText, { color: info?.twoFactorEnabled ? "#065f46" : Colors.gray500 }]}>
                {info?.twoFactorEnabled ? "ON" : "OFF"}
              </Text>
            </View>
          </View>

          {view === "idle" && (
            <View style={styles.btnGroup}>
              {!info?.twoFactorEnabled ? (
                <>
                  <TouchableOpacity onPress={startTotpSetup} disabled={working} style={styles.primaryBtn}>
                    {working ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Set Up Authenticator App</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setView("setup-sms"); setSmsStep("phone"); setError(""); }} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>Set Up SMS</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={() => { setView("disable"); setError(""); }} style={styles.dangerBtn}>
                  <Text style={styles.dangerBtnText}>Disable 2FA</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* TOTP Setup */}
          {view === "setup-totp" && (
            <View style={styles.setupSection}>
              <Text style={styles.setupStep}>1. Scan this QR code with your authenticator app:</Text>
              {totpQr ? (
                <Image source={{ uri: totpQr }} style={styles.qrCode} resizeMode="contain" />
              ) : null}
              <Text style={styles.setupStep}>2. Or enter this secret manually:</Text>
              <View style={styles.secretBox}>
                <Text style={styles.secretText} selectable>{totpSecret}</Text>
              </View>
              <Text style={styles.setupStep}>3. Enter the 6-digit code from your app:</Text>
              <TextInput
                style={styles.codeInput}
                value={verifyCode}
                onChangeText={setVerifyCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={Colors.gray300}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.btnGroup}>
                <TouchableOpacity onPress={verifyTotp} disabled={working} style={styles.primaryBtn}>
                  {working ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Verify & Enable</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setView("idle"); setTotpQr(""); setTotpSecret(""); setError(""); }} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SMS Setup */}
          {view === "setup-sms" && (
            <View style={styles.setupSection}>
              {smsStep === "phone" ? (
                <>
                  <Text style={styles.setupStep}>Enter your phone number to receive verification codes:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="+1 234 567 8900"
                    placeholderTextColor={Colors.gray300}
                  />
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <View style={styles.btnGroup}>
                    <TouchableOpacity onPress={sendSmsOtp} disabled={working} style={styles.primaryBtn}>
                      {working ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Send Code</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setView("idle"); setError(""); }} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.setupStep}>Enter the 6-digit code sent to {phone}:</Text>
                  <TextInput
                    style={styles.codeInput}
                    value={verifyCode}
                    onChangeText={setVerifyCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                    placeholderTextColor={Colors.gray300}
                  />
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <View style={styles.btnGroup}>
                    <TouchableOpacity onPress={verifySmsSetup} disabled={working} style={styles.primaryBtn}>
                      {working ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Verify & Enable</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSmsStep("phone")} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>← Change Number</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Disable confirm */}
          {view === "disable" && (
            <View style={styles.setupSection}>
              <Text style={styles.setupStep}>Are you sure you want to disable two-factor authentication? This will make your account less secure.</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.btnGroup}>
                <TouchableOpacity onPress={disable2FA} disabled={working} style={styles.dangerBtn}>
                  {working ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dangerBtnText}>Yes, Disable 2FA</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setView("idle"); setError(""); }} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 24, gap: 20 },
  pageTitle: { fontSize: 24, fontWeight: "900", color: Colors.gray900 },
  successBanner: { backgroundColor: "#d1fae5", borderRadius: 12, padding: 12 },
  successText: { fontSize: 14, fontWeight: "600", color: "#065f46" },
  section: { backgroundColor: Colors.gray50, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.gray100 },
  statusRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.gray800 },
  sectionSubtitle: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  btnGroup: { gap: 8 },
  primaryBtn: { backgroundColor: Colors.rose500, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondaryBtn: { backgroundColor: "#fff", paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1.5, borderColor: Colors.rose500 },
  secondaryBtnText: { color: Colors.rose500, fontSize: 14, fontWeight: "700" },
  dangerBtn: { backgroundColor: "#ef4444", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  dangerBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cancelBtn: { paddingVertical: 10, alignItems: "center" },
  cancelBtnText: { fontSize: 14, color: Colors.gray400 },
  setupSection: { gap: 10 },
  setupStep: { fontSize: 13, color: Colors.gray700, lineHeight: 20 },
  qrCode: { width: 180, height: 180, alignSelf: "center", backgroundColor: "#fff" },
  secretBox: { backgroundColor: Colors.gray100, borderRadius: 8, padding: 12 },
  secretText: { fontSize: 13, fontFamily: "monospace", color: Colors.gray700, textAlign: "center" },
  codeInput: { backgroundColor: "#fff", borderWidth: 2, borderColor: Colors.gray200, borderRadius: 12, paddingVertical: 14, textAlign: "center", fontSize: 28, letterSpacing: 12, fontWeight: "700", color: Colors.gray900 },
  textInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: Colors.gray200, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, color: Colors.gray900 },
  errorText: { fontSize: 13, color: "#ef4444", textAlign: "center" },
  // Preferences nav row
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.gray50, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.gray100 },
  navRowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  navRowIcon: { fontSize: 24 },
  navRowTitle: { fontSize: 15, fontWeight: "700", color: Colors.gray800 },
  navRowSub: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  navRowChevron: { fontSize: 22, color: Colors.gray400, fontWeight: "300" },
  // Location
  coordsBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10 },
  coordsText: { fontSize: 12, color: "#166534", fontFamily: "monospace" },
  clearCoords: { fontSize: 12, color: "#ef4444", fontWeight: "600" },
  gpsBtn: { borderWidth: 1.5, borderColor: Colors.rose500, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  gpsBtnText: { fontSize: 14, fontWeight: "600", color: Colors.rose500 },
  radiusLabel: { fontSize: 13, fontWeight: "600", color: Colors.gray700 },
  radiusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  radiusBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: "#fff" },
  radiusBtnActive: { borderColor: Colors.rose500, backgroundColor: "#fff1f2" },
  radiusBtnText: { fontSize: 12, fontWeight: "600", color: Colors.gray500 },
  radiusBtnTextActive: { color: Colors.rose500 },
  locError: { fontSize: 12, color: "#ef4444" },
  locSuccess: { fontSize: 12, color: "#059669", fontWeight: "600" },
});
