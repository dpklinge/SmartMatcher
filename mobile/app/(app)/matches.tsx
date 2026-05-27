import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";

interface UserStub {
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
}

interface MatchItem {
  matchId: string;
  matchedAt: string;
  score: number;
  user: UserStub;
}

interface PendingLikeItem {
  swipeId: string;
  likedAt: string;
  score: number;
  user: UserStub;
}

function getAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function scoreColor(score: number): string {
  return score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : Colors.gray400;
}

function Avatar({ user }: { user: UserStub }) {
  const photoUrl = user.profile?.photos?.[0]?.url ?? user.image ?? null;
  if (photoUrl) return <Image source={{ uri: photoUrl }} style={styles.avatar} />;
  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarEmoji}>👤</Text>
    </View>
  );
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [pendingLikes, setPendingLikes] = useState<PendingLikeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ matches: MatchItem[]; pendingLikes: PendingLikeItem[] }>("/api/matches")
      .then((data) => {
        setMatches(data.matches);
        setPendingLikes(data.pendingLikes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openMessage = async (userId: string) => {
    setStarting(userId);
    try {
      const data = await api.post<{ conversationId: string }>("/api/conversations", { otherId: userId });
      router.push(`/(app)/messages/${data.conversationId}` as never);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setStarting(null);
    }
  };

  const confirmUnmatch = (m: MatchItem) => {
    Alert.alert(
      "Unmatch",
      `Are you sure you want to unmatch with ${m.user.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unmatch", style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/matches/${m.matchId}`);
              setMatches((prev) => prev.filter((x) => x.matchId !== m.matchId));
            } catch (e) {
              Alert.alert("Error", (e as Error).message);
            }
          },
        },
      ]
    );
  };

  const confirmUnlike = (p: PendingLikeItem) => {
    Alert.alert(
      "Unlike",
      `Remove your like for ${p.user.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlike", style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/swipe/${p.swipeId}`);
              setPendingLikes((prev) => prev.filter((x) => x.swipeId !== p.swipeId));
            } catch (e) {
              Alert.alert("Error", (e as Error).message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>
      </SafeAreaView>
    );
  }

  const isEmpty = matches.length === 0 && pendingLikes.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches 💞</Text>
        <Text style={styles.subtitle}>
          {matches.length} mutual · {pendingLikes.length} pending
        </Text>
      </View>

      {isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>Keep swiping to find your match!</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {/* ── Mutual matches ── */}
          {matches.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mutual Matches</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{matches.length}</Text>
                </View>
              </View>
              {matches.map((m) => {
                const age = getAge(m.user.profile?.birthDate ?? null);
                const color = scoreColor(m.score);
                return (
                  <TouchableOpacity
                    key={m.matchId}
                    style={styles.card}
                    onPress={() => router.push(`/(app)/profile/${m.user.id}` as never)}
                    activeOpacity={0.8}
                  >
                    <Avatar user={m.user} />
                    <View style={styles.info}>
                      <Text style={styles.name}>{m.user.name}{age ? `, ${age}` : ""}</Text>
                      {m.user.profile?.occupation
                        ? <Text style={styles.meta}>💼 {m.user.profile.occupation}</Text>
                        : null}
                      {m.user.profile?.location
                        ? <Text style={styles.meta}>📍 {m.user.profile.location}</Text>
                        : null}
                      <Text style={styles.dateText}>
                        Matched {new Date(m.matchedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.rightCol}>
                      {m.score > 0 && (
                        <View style={[styles.scoreBadge, { backgroundColor: color }]}>
                          <Text style={styles.scoreText}>{m.score}%</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.msgBtn}
                        onPress={() => openMessage(m.user.id)}
                        disabled={starting === m.user.id}
                      >
                        {starting === m.user.id
                          ? <ActivityIndicator color={Colors.rose500} size="small" />
                          : <Text style={styles.msgBtnText}>💬</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => confirmUnmatch(m)}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* ── Pending likes ── */}
          {pendingLikes.length > 0 && (
            <>
              <View style={[styles.sectionHeader, matches.length > 0 && styles.sectionHeaderSpaced]}>
                <Text style={styles.sectionTitle}>Liked · Waiting</Text>
                <View style={[styles.sectionBadge, styles.sectionBadgeMuted]}>
                  <Text style={[styles.sectionBadgeText, styles.sectionBadgeTextMuted]}>
                    {pendingLikes.length}
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionHint}>People you liked who haven't matched back yet</Text>
              {pendingLikes.map((p) => {
                const age = getAge(p.user.profile?.birthDate ?? null);
                const color = scoreColor(p.score);
                return (
                  <TouchableOpacity
                    key={p.swipeId}
                    style={[styles.card, styles.cardPending]}
                    onPress={() => router.push(`/(app)/profile/${p.user.id}` as never)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.pendingAvatarWrap}>
                      <Avatar user={p.user} />
                      <View style={styles.heartBadge}>
                        <Text style={styles.heartBadgeText}>♥</Text>
                      </View>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.name}>{p.user.name}{age ? `, ${age}` : ""}</Text>
                      {p.user.profile?.occupation
                        ? <Text style={styles.meta}>💼 {p.user.profile.occupation}</Text>
                        : null}
                      {p.user.profile?.location
                        ? <Text style={styles.meta}>📍 {p.user.profile.location}</Text>
                        : null}
                      <Text style={styles.dateText}>
                        Liked {new Date(p.likedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.rightCol}>
                      {p.score > 0 && (
                        <View style={[styles.scoreBadge, { backgroundColor: color }]}>
                          <Text style={styles.scoreText}>{p.score}%</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => confirmUnlike(p)}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
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

  list: { padding: 16, gap: 10 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionHeaderSpaced: { marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: Colors.gray700 },
  sectionBadge: { backgroundColor: Colors.rose500, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sectionBadgeMuted: { backgroundColor: Colors.gray200 },
  sectionBadgeTextMuted: { color: Colors.gray600 },
  sectionHint: { fontSize: 12, color: Colors.gray400, marginTop: -4, marginBottom: 2 },

  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.gray50, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.gray100,
  },
  cardPending: { backgroundColor: "#fff", borderColor: Colors.gray200 },

  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 28 },

  pendingAvatarWrap: { position: "relative" },
  heartBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.rose500, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  heartBadgeText: { color: "#fff", fontSize: 9, lineHeight: 12 },

  info: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: "700", color: Colors.gray900 },
  meta: { fontSize: 12, color: Colors.gray500 },
  dateText: { fontSize: 11, color: Colors.gray400, marginTop: 2 },

  rightCol: { alignItems: "center", gap: 8 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  scoreText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  msgBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.gray100, alignItems: "center", justifyContent: "center" },
  msgBtnText: { fontSize: 17 },
  removeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: Colors.gray200, alignItems: "center", justifyContent: "center" },
  removeBtnText: { fontSize: 13, color: Colors.gray400, fontWeight: "700" },
});
