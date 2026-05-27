import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Alert, Modal, TextInput, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";

const MAX_PHOTOS = 6;
const GENDER_OPTIONS = [
  { label: "Man",        value: "man" },
  { label: "Woman",      value: "woman" },
  { label: "Non-binary", value: "nonbinary" },
  { label: "Other",      value: "other" },
];
const SEEKING_OPTIONS = [
  { label: "Men",      value: "men" },
  { label: "Women",    value: "women" },
  { label: "Everyone", value: "everyone" },
];

interface ProfileData {
  profile: {
    bio: string | null;
    occupation: string | null;
    location: string | null;
    education: string | null;
    gender: string | null;
    seeking: string | null;
    birthDate: string | null;
    height: number | null;
    photos: Array<{ url: string }>;
  } | null;
  user: {
    name: string;
    email: string | null;
    image: string | null;
    onboardingStep: string;
    twoFactorEnabled: boolean;
    phoneNumber: string | null;
  };
}

interface EditForm {
  name: string;
  bio: string;
  birthDate: Date | null;
  gender: string;
  seeking: string;
  occupation: string;
  location: string;
  education: string;
  height: string;
}

export default function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [photosSaved, setPhotosSaved] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<EditForm>({
    name: "", bio: "", birthDate: null, gender: "",
    seeking: "", occupation: "", location: "", education: "", height: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(() => {
    api.get<ProfileData>("/api/profile")
      .then((d) => {
        setData(d);
        setPhotos(d.profile?.photos?.map((p) => p.url) ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const openEdit = () => {
    if (!data) return;
    setForm({
      name: data.user.name ?? "",
      bio: data.profile?.bio ?? "",
      birthDate: data.profile?.birthDate ? new Date(data.profile.birthDate) : null,
      gender: data.profile?.gender ?? "",
      seeking: data.profile?.seeking ?? "",
      occupation: data.profile?.occupation ?? "",
      location: data.profile?.location ?? "",
      education: data.profile?.education ?? "",
      height: data.profile?.height != null ? String(data.profile.height) : "",
    });
    setShowDatePicker(false);
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Required", "Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/api/profile", {
        name: form.name.trim(),
        bio: form.bio.trim(),
        birthDate: form.birthDate?.toISOString() ?? null,
        gender: form.gender || null,
        seeking: form.seeking || null,
        occupation: form.occupation.trim() || null,
        location: form.location.trim() || null,
        education: form.education.trim() || null,
        height: form.height ? parseInt(form.height) : null,
      });
      setShowEdit(false);
      loadProfile();
    } catch (e) {
      Alert.alert("Save failed", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login" as never);
  };

  const pickAndUpload = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to your photo library to upload photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [3, 4], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = uri.split("/").pop() ?? "photo.jpg";
    const mimeType = asset.mimeType ?? "image/jpeg";
    const formData = new FormData();
    formData.append("file", { uri, name: filename, type: mimeType } as unknown as Blob);
    try {
      const { url } = await api.upload<{ url: string }>("/api/upload", formData);
      setPhotos((prev) => [...prev, url]);
      setPhotosSaved(false);
    } catch (e) {
      Alert.alert("Upload failed", (e as Error).message);
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    Alert.alert("Remove photo", "Remove this photo from your profile?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: () => { setPhotos((prev) => prev.filter((_, i) => i !== index)); setPhotosSaved(false); },
      },
    ]);
  }, []);

  const savePhotos = useCallback(async () => {
    setSavingPhotos(true);
    try {
      await api.patch("/api/profile", { photos });
      setPhotosSaved(true);
    } catch (e) {
      Alert.alert("Save failed", (e as Error).message);
    } finally {
      setSavingPhotos(false);
    }
  }, [photos]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>;
  }
  if (!data) {
    return <View style={styles.center}><Text style={styles.errorText}>Failed to load profile</Text></View>;
  }

  const { user, profile } = data;
  const avatarUrl = photos[0] ?? user.image ?? null;
  const age = profile?.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
          <Text style={styles.editBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            : <View style={styles.avatarPlaceholder}><Text style={styles.avatarEmoji}>👤</Text></View>}
          <Text style={styles.name}>{user.name}{age ? `, ${age}` : ""}</Text>
          {user.email && <Text style={styles.email}>{user.email}</Text>}
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          {profile?.bio
            ? <Text style={styles.bio}>{profile.bio}</Text>
            : <Text style={styles.placeholder}>No bio yet — tap Edit to add one</Text>}
        </View>

        {/* Info */}
        <View style={styles.infoGrid}>
          {profile?.occupation && <InfoItem icon="💼" label="Occupation" value={profile.occupation} />}
          {profile?.location && <InfoItem icon="📍" label="Location" value={profile.location} />}
          {profile?.education && <InfoItem icon="🎓" label="Education" value={profile.education} />}
          {profile?.gender && <InfoItem icon="🧬" label="Gender" value={profile.gender} />}
          {profile?.seeking && <InfoItem icon="🔍" label="Seeking" value={profile.seeking} />}
          {profile?.height && <InfoItem icon="📏" label="Height" value={`${profile.height} cm`} />}
        </View>

        {/* Preferences link */}
        <TouchableOpacity style={styles.prefBtn} onPress={() => router.push("/(app)/preferences" as never)}>
          <View style={styles.prefBtnInner}>
            <Text style={styles.prefBtnIcon}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefBtnTitle}>Preferences & Questionnaire</Text>
              <Text style={styles.prefBtnSub}>Edit your answers and matching priorities</Text>
            </View>
            <Text style={styles.prefBtnArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.securityRow}>
            <Text style={styles.securityLabel}>Two-Factor Auth</Text>
            <View style={[styles.badge, { backgroundColor: user.twoFactorEnabled ? "#d1fae5" : Colors.gray100 }]}>
              <Text style={[styles.badgeText, { color: user.twoFactorEnabled ? "#065f46" : Colors.gray500 }]}>
                {user.twoFactorEnabled ? "Enabled" : "Disabled"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/(app)/settings" as never)} style={styles.settingsBtn}>
            <Text style={styles.settingsBtnText}>Manage Security Settings →</Text>
          </TouchableOpacity>
        </View>

        {/* Photo Gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photoGrid}>
            {photos.map((uri, i) => (
              <TouchableOpacity key={i} onLongPress={() => removePhoto(i)} style={styles.photoCell}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(i)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.addPhotoCell} onPress={pickAndUpload}>
                <Text style={styles.addPhotoIcon}>+</Text>
                <Text style={styles.addPhotoLabel}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.photoHint}>Long-press or tap ✕ to remove. First photo is your main image.</Text>
          {photosSaved
            ? <View style={styles.savedBanner}><Text style={styles.savedText}>Photos saved!</Text></View>
            : <TouchableOpacity style={[styles.savePhotosBtn, savingPhotos && styles.savingBtn]} onPress={savePhotos} disabled={savingPhotos}>
                {savingPhotos ? <ActivityIndicator color="#fff" /> : <Text style={styles.savePhotosBtnText}>Save Photos</Text>}
              </TouchableOpacity>}
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <Modal
        visible={showEdit}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEdit(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEdit(false)} disabled={saving}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color={Colors.rose500} size="small" />
                : <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

            <FormSection title="Basic Info">
              <Field label="Name *">
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="Your name"
                  maxLength={80}
                />
              </Field>
              <Field label="Bio">
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={form.bio}
                  onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
                  placeholder="Tell people about yourself…"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </Field>
            </FormSection>

            <FormSection title="About You">
              <Field label="Date of Birth">
                <TouchableOpacity
                  style={styles.datePill}
                  onPress={() => setShowDatePicker((v) => !v)}
                >
                  <Text style={form.birthDate ? styles.datePillValue : styles.datePillPlaceholder}>
                    {form.birthDate
                      ? form.birthDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : "Select date"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={form.birthDate ?? new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                    onChange={(_, date) => {
                      if (Platform.OS !== "ios") setShowDatePicker(false);
                      if (date) setForm((f) => ({ ...f, birthDate: date }));
                    }}
                  />
                )}
                {showDatePicker && Platform.OS === "ios" && (
                  <TouchableOpacity style={styles.pickerDone} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </Field>

              <Field label="Gender">
                <View style={styles.chipRow}>
                  {GENDER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, form.gender === opt.value && styles.chipActive]}
                      onPress={() => setForm((f) => ({ ...f, gender: f.gender === opt.value ? "" : opt.value }))}
                    >
                      <Text style={[styles.chipText, form.gender === opt.value && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label="Seeking">
                <View style={styles.chipRow}>
                  {SEEKING_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, form.seeking === opt.value && styles.chipActive]}
                      onPress={() => setForm((f) => ({ ...f, seeking: f.seeking === opt.value ? "" : opt.value }))}
                    >
                      <Text style={[styles.chipText, form.seeking === opt.value && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label="Height (cm)">
                <TextInput
                  style={styles.input}
                  value={form.height}
                  onChangeText={(v) => setForm((f) => ({ ...f, height: v.replace(/[^0-9]/g, "") }))}
                  placeholder="e.g. 175"
                  keyboardType="numeric"
                  maxLength={3}
                />
              </Field>
            </FormSection>

            <FormSection title="Background">
              <Field label="Occupation">
                <TextInput
                  style={styles.input}
                  value={form.occupation}
                  onChangeText={(v) => setForm((f) => ({ ...f, occupation: v }))}
                  placeholder="e.g. Software Engineer"
                  maxLength={80}
                />
              </Field>
              <Field label="Location">
                <TextInput
                  style={styles.input}
                  value={form.location}
                  onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
                  placeholder="e.g. Charlotte, NC"
                  maxLength={80}
                />
              </Field>
              <Field label="Education">
                <TextInput
                  style={styles.input}
                  value={form.education}
                  onChangeText={(v) => setForm((f) => ({ ...f, education: v }))}
                  placeholder="e.g. Bachelor's degree"
                  maxLength={80}
                />
              </Field>
            </FormSection>

          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.formSection}>
      <Text style={styles.formSectionTitle}>{title}</Text>
      <View style={styles.formSectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14, color: "#ef4444" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: Colors.gray900 },
  editBtn: {
    backgroundColor: Colors.rose500, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  content: { padding: 24, gap: 20 },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 48 },
  name: { fontSize: 22, fontWeight: "800", color: Colors.gray900 },
  email: { fontSize: 14, color: Colors.gray500 },

  section: { backgroundColor: Colors.gray50, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: Colors.gray100 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.gray700, textTransform: "uppercase", letterSpacing: 0.5 },

  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  photoCell: { position: "relative" },
  photoThumb: { width: 88, height: 88, borderRadius: 10 },
  removeBtn: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fff" },
  removeBtnText: { color: "#fff", fontSize: 11, fontWeight: "800", lineHeight: 14 },
  addPhotoCell: { width: 88, height: 88, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.rose400, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 2 },
  addPhotoIcon: { fontSize: 24, color: Colors.rose500, fontWeight: "300" },
  addPhotoLabel: { fontSize: 10, color: Colors.rose500, fontWeight: "600" },
  photoHint: { fontSize: 11, color: Colors.gray400, fontStyle: "italic", lineHeight: 16 },
  savedBanner: { backgroundColor: "#d1fae5", borderRadius: 10, padding: 10, alignItems: "center" },
  savedText: { color: "#065f46", fontWeight: "700", fontSize: 13 },
  savePhotosBtn: { backgroundColor: Colors.rose500, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  savingBtn: { opacity: 0.6 },
  savePhotosBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  bio: { fontSize: 14, color: Colors.gray700, lineHeight: 22 },
  placeholder: { fontSize: 14, color: Colors.gray400, fontStyle: "italic" },
  infoGrid: { gap: 10 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.gray50, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.gray100 },
  infoIcon: { fontSize: 20 },
  infoLabel: { fontSize: 11, color: Colors.gray400, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: Colors.gray800 },

  // Preferences button
  prefBtn: { backgroundColor: Colors.gray50, borderRadius: 16, borderWidth: 1, borderColor: Colors.gray100 },
  prefBtnInner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  prefBtnIcon: { fontSize: 24 },
  prefBtnTitle: { fontSize: 15, fontWeight: "700", color: Colors.gray900 },
  prefBtnSub: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  prefBtnArrow: { fontSize: 24, color: Colors.gray300, fontWeight: "300" },

  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  securityLabel: { fontSize: 14, color: Colors.gray700 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  settingsBtn: { marginTop: 4 },
  settingsBtnText: { fontSize: 13, color: Colors.rose500, fontWeight: "600" },
  logoutBtn: { paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: "#ef4444", alignItems: "center" },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },

  // Edit modal
  modalSafe: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  modalCancel: { fontSize: 15, color: Colors.gray500, width: 56 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.gray900 },
  modalSave: { fontSize: 15, fontWeight: "700", color: Colors.rose500, width: 56, textAlign: "right" },

  formContent: { padding: 20, gap: 24, paddingBottom: 48 },
  formSection: { gap: 12 },
  formSectionTitle: {
    fontSize: 11, fontWeight: "700", color: Colors.gray500,
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  formSectionBody: { gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.gray700 },
  input: {
    backgroundColor: Colors.gray50, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.gray200,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: Colors.gray900,
  },
  inputMulti: { height: 100, paddingTop: 11, textAlignVertical: "top" },
  datePill: {
    backgroundColor: Colors.gray50, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.gray200,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  datePillValue: { fontSize: 15, color: Colors.gray900 },
  datePillPlaceholder: { fontSize: 15, color: Colors.gray400 },
  pickerDone: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 14 },
  pickerDoneText: { color: Colors.rose500, fontWeight: "700", fontSize: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.gray200, backgroundColor: "#fff",
  },
  chipActive: { borderColor: Colors.rose500, backgroundColor: "#fff1f2" },
  chipText: { fontSize: 13, fontWeight: "600", color: Colors.gray600 },
  chipTextActive: { color: Colors.rose500 },
});
