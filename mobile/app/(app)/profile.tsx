import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  SafeAreaView, ActivityIndicator, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";

const MAX_PHOTOS = 6;

interface ProfileData {
  profile: {
    bio: string | null;
    occupation: string | null;
    location: string | null;
    education: string | null;
    gender: string | null;
    seeking: string | null;
    birthDate: string | null;
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

export default function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [photosSaved, setPhotosSaved] = useState(false);

  useEffect(() => {
    api.get<ProfileData>("/api/profile")
      .then((d) => {
        setData(d);
        setPhotos(d.profile?.photos?.map((p) => p.url) ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
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
        onPress: () => {
          setPhotos((prev) => prev.filter((_, i) => i !== index));
          setPhotosSaved(false);
        },
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
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load profile</Text>
      </View>
    );
  }

  const { user, profile } = data;
  const avatarUrl = photos[0] ?? user.image ?? null;
  const age = profile?.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          )}
          <Text style={styles.name}>{user.name}{age ? `, ${age}` : ""}</Text>
          {user.email && <Text style={styles.email}>{user.email}</Text>}
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
          <Text style={styles.photoHint}>Tap ✕ or long-press a photo to remove. First photo is your main image.</Text>
          {photosSaved ? (
            <View style={styles.savedBanner}>
              <Text style={styles.savedText}>Photos saved!</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.savePhotosBtn, savingPhotos && styles.savingBtn]}
              onPress={savePhotos}
              disabled={savingPhotos}
            >
              {savingPhotos
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.savePhotosBtnText}>Save Photos</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <Text style={styles.placeholder}>No bio yet</Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoGrid}>
          {profile?.occupation && <InfoItem icon="💼" label="Occupation" value={profile.occupation} />}
          {profile?.location && <InfoItem icon="📍" label="Location" value={profile.location} />}
          {profile?.education && <InfoItem icon="🎓" label="Education" value={profile.education} />}
          {profile?.gender && <InfoItem icon="🧬" label="Gender" value={profile.gender} />}
          {profile?.seeking && <InfoItem icon="🔍" label="Seeking" value={profile.seeking} />}
        </View>

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

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  content: { padding: 24, gap: 20 },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 48 },
  name: { fontSize: 22, fontWeight: "800", color: Colors.gray900 },
  email: { fontSize: 14, color: Colors.gray500 },
  section: { backgroundColor: Colors.gray50, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: Colors.gray100 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.gray700, textTransform: "uppercase", letterSpacing: 0.5 },
  // Photo gallery
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  photoCell: { position: "relative" },
  photoThumb: { width: 88, height: 88, borderRadius: 10 },
  removeBtn: {
    position: "absolute", top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#fff",
  },
  removeBtnText: { color: "#fff", fontSize: 11, fontWeight: "800", lineHeight: 14 },
  addPhotoCell: {
    width: 88, height: 88, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.rose400, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  addPhotoIcon: { fontSize: 24, color: Colors.rose500, fontWeight: "300" },
  addPhotoLabel: { fontSize: 10, color: Colors.rose500, fontWeight: "600" },
  photoHint: { fontSize: 11, color: Colors.gray400, fontStyle: "italic", lineHeight: 16 },
  savedBanner: { backgroundColor: "#d1fae5", borderRadius: 10, padding: 10, alignItems: "center" },
  savedText: { color: "#065f46", fontWeight: "700", fontSize: 13 },
  savePhotosBtn: { backgroundColor: Colors.rose500, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  savingBtn: { opacity: 0.6 },
  savePhotosBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  // Bio / info
  bio: { fontSize: 14, color: Colors.gray700, lineHeight: 22 },
  placeholder: { fontSize: 14, color: Colors.gray400, fontStyle: "italic" },
  infoGrid: { gap: 10 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.gray50, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.gray100 },
  infoIcon: { fontSize: 20 },
  infoLabel: { fontSize: 11, color: Colors.gray400, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: Colors.gray800 },
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  securityLabel: { fontSize: 14, color: Colors.gray700 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  settingsBtn: { marginTop: 4 },
  settingsBtnText: { fontSize: 13, color: Colors.rose500, fontWeight: "600" },
  logoutBtn: { paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: "#ef4444", alignItems: "center" },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
});
