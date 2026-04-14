import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from "react-native";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<{ candidates: ApiCandidate[] }>("/api/discover")
      .then((data) => {
        setProfiles(data.candidates.map((c) => {
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
        }));
        setLoading(false);
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  }, []);

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
        <CardDeck initialProfiles={profiles} />
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
