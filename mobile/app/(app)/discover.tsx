import { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";
import CardDeck from "@/components/discover/CardDeck";
import type { CardProfile } from "@/components/discover/SwipeCard";

interface ApiCandidate {
  id: string;
  name: string;
  image: string | null;
  profile: {
    bio: string | null;
    location: string | null;
    occupation: string | null;
    education: string | null;
    birthDate: string | null;
    photos: Array<{ url: string }>;
  } | null;
  compatibility: {
    score: number;
    percentage: number;
    breakdown: Record<string, number>;
  };
}

export default function DiscoverScreen() {
  const [profiles, setProfiles] = useState<CardProfile[]>([]);
  const [deckKey, setDeckKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const prevProfileIdsRef = useRef("");

  useFocusEffect(
    useCallback(() => {
      setError("");
      api.get<{ candidates: ApiCandidate[] }>("/api/discover")
        .then((data) => {
          const mapped = data.candidates.map((c) => {
            const allPhotos = c.profile?.photos?.map((p) => p.url) ?? [];
            const photoUrl = allPhotos[0] ?? c.image ?? undefined;
            const age = c.profile?.birthDate
              ? Math.floor((Date.now() - new Date(c.profile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
              : 0;
            return {
              id: c.id,
              name: c.name,
              age,
              occupation: c.profile?.occupation ?? undefined,
              location: c.profile?.location ?? undefined,
              bio: c.profile?.bio ?? undefined,
              photoUrl,
              photos: allPhotos,
              compatibilityScore: c.compatibility.percentage,
              categoryBreakdown: c.compatibility.breakdown,
            };
          });
          const newIds = mapped.map((p) => p.id).join(",");
          if (newIds !== prevProfileIdsRef.current) {
            prevProfileIdsRef.current = newIds;
            setProfiles(mapped);
            setDeckKey((k) => k + 1);
          }
          setLoading(false);
        })
        .catch((e) => {
          if (!prevProfileIdsRef.current) setError((e as Error).message);
          setLoading(false);
        });
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>💞</Text>
        <Text style={styles.title}>Matchmaker</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.rose500} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <CardDeck key={deckKey} initialProfiles={profiles} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12, gap: 8 },
  logo: { fontSize: 24 },
  title: { fontSize: 20, fontWeight: "900", color: Colors.gray900 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14, color: "#ef4444" },
});
