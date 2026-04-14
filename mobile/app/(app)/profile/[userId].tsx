import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { CATEGORY_LABELS, CATEGORY_ICONS, type QuestionCategory } from "@/lib/questions";

interface ProfileDetail {
  id: string;
  name: string;
  age: number;
  bio: string | null;
  occupation: string | null;
  location: string | null;
  education: string | null;
  photoUrl: string | null;
  compatibility: {
    score: number;
    percentage: number;
    categoryBreakdown: Record<string, number>;
    alignedPriorities: string[];
  } | null;
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    api.get<{ profile: ProfileDetail }>(`/api/profile/${userId}`)
      .then((data) => { setProfile(data.profile); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>;
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const compat = profile.compatibility;
  const scoreColor = compat
    ? compat.percentage >= 80 ? "#10b981" : compat.percentage >= 60 ? "#f59e0b" : Colors.gray400
    : Colors.gray300;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      {/* Photo & Name */}
      <View style={styles.heroSection}>
        {profile.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>👤</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.name}, {profile.age}</Text>
        {compat && (
          <View style={[styles.scorePill, { backgroundColor: scoreColor }]}>
            <Text style={styles.scorePillText}>{compat.percentage}% Compatible</Text>
          </View>
        )}
        {profile.occupation && <Text style={styles.metaText}>💼 {profile.occupation}</Text>}
        {profile.location && <Text style={styles.metaText}>📍 {profile.location}</Text>}
        {profile.education && <Text style={styles.metaText}>🎓 {profile.education}</Text>}
      </View>

      {profile.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      )}

      {/* Compatibility breakdown */}
      {compat && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compatibility Breakdown</Text>

          {Object.entries(compat.categoryBreakdown).map(([cat, pct]) => {
            const catKey = cat as QuestionCategory;
            const label = CATEGORY_LABELS[catKey] ?? cat;
            const icon = CATEGORY_ICONS[catKey] ?? "•";
            const barColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
            return (
              <View key={cat} style={styles.breakdownRow}>
                <Text style={styles.breakdownIcon}>{icon}</Text>
                <Text style={styles.breakdownLabel}>{label}</Text>
                <View style={styles.breakdownBarBg}>
                  <View style={[styles.breakdownBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.breakdownPct, { color: barColor }]}>{pct}%</Text>
              </View>
            );
          })}

          {compat.alignedPriorities.length > 0 && (
            <View style={styles.alignedSection}>
              <Text style={styles.alignedTitle}>Top Alignments</Text>
              <View style={styles.alignedList}>
                {compat.alignedPriorities.slice(0, 5).map((text, i) => (
                  <View key={i} style={styles.alignedItem}>
                    <Text style={styles.alignedCheck}>✓</Text>
                    <Text style={styles.alignedText}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, gap: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 14, color: "#ef4444" },
  backLink: { padding: 8 },
  backLinkText: { fontSize: 14, color: Colors.rose500 },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 14, fontWeight: "600", color: Colors.gray600 },
  heroSection: { alignItems: "center", gap: 8 },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  photoEmoji: { fontSize: 56 },
  name: { fontSize: 24, fontWeight: "800", color: Colors.gray900 },
  scorePill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  scorePillText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  metaText: { fontSize: 13, color: Colors.gray500 },
  section: { backgroundColor: Colors.gray50, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.gray100 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.gray700, textTransform: "uppercase", letterSpacing: 0.5 },
  bioText: { fontSize: 14, color: Colors.gray700, lineHeight: 22 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownIcon: { fontSize: 16, width: 22 },
  breakdownLabel: { width: 100, fontSize: 12, color: Colors.gray600 },
  breakdownBarBg: { flex: 1, height: 6, backgroundColor: Colors.gray200, borderRadius: 3, overflow: "hidden" },
  breakdownBarFill: { height: "100%", borderRadius: 3 },
  breakdownPct: { width: 36, fontSize: 12, fontWeight: "700", textAlign: "right" },
  alignedSection: { borderTopWidth: 1, borderColor: Colors.gray200, paddingTop: 12, gap: 8 },
  alignedTitle: { fontSize: 12, fontWeight: "700", color: Colors.gray600 },
  alignedList: { gap: 6 },
  alignedItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  alignedCheck: { fontSize: 12, color: "#10b981", fontWeight: "700", marginTop: 2 },
  alignedText: { flex: 1, fontSize: 13, color: Colors.gray700, lineHeight: 20 },
});
