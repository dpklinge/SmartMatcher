import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";

interface MatchItem {
  matchId: string;
  matchedAt: string;
  score: number;
  user: {
    id: string;
    name: string;
    image: string | null;
    profile: {
      bio: string | null;
      occupation: string | null;
      location: string | null;
      birthDate: string | null;
      photos: Array<{ url: string }>;
    } | null;
  };
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ matches: MatchItem[] }>("/api/matches")
      .then((data) => { setMatches(data.matches); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches 💞</Text>
        <Text style={styles.subtitle}>{matches.length} mutual match{matches.length !== 1 ? "es" : ""}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>Keep swiping to find your match!</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {matches.map((m) => {
            const photoUrl = m.user.profile?.photos?.[0]?.url ?? m.user.image ?? null;
            const age = m.user.profile?.birthDate
              ? Math.floor((Date.now() - new Date(m.user.profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : null;
            const scoreColor = m.score >= 80 ? "#10b981" : m.score >= 60 ? "#f59e0b" : Colors.gray400;
            return (
              <TouchableOpacity
                key={m.matchId}
                style={styles.card}
                onPress={() => router.push(`/(app)/profile/${m.user.id}` as never)}
              >
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarEmoji}>👤</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name}>{m.user.name}{age ? `, ${age}` : ""}</Text>
                  {m.user.profile?.occupation && <Text style={styles.meta}>💼 {m.user.profile.occupation}</Text>}
                  {m.user.profile?.location && <Text style={styles.meta}>📍 {m.user.profile.location}</Text>}
                  <Text style={styles.matchDate}>
                    Matched {new Date(m.matchedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                  <Text style={styles.scoreText}>{m.score}%</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 24, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: "900", color: Colors.gray900 },
  subtitle: { fontSize: 13, color: Colors.gray500, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: Colors.gray900 },
  emptySubtitle: { fontSize: 14, color: Colors.gray500 },
  list: { padding: 16, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.gray50, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.gray100 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 28 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: "700", color: Colors.gray900 },
  meta: { fontSize: 12, color: Colors.gray500 },
  matchDate: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  scoreText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
