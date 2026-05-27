import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";
import SwipeCard, { type CardProfile } from "./SwipeCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_HEIGHT = SCREEN_HEIGHT * 0.72;

interface CardDeckProps {
  initialProfiles: CardProfile[];
}

export default function CardDeck({ initialProfiles }: CardDeckProps) {
  const [profiles, setProfiles] = useState<CardProfile[]>(initialProfiles);
  const [skipped, setSkipped] = useState<CardProfile[]>([]);
  const [matchProfile, setMatchProfile] = useState<CardProfile | null>(null);
  const [swiping, setSwiping] = useState(false);

  const handleSwipe = useCallback(async (direction: "like" | "pass") => {
    if (profiles.length === 0 || swiping) return;
    const top = profiles[0];
    if (direction === "pass") setSkipped((prev) => [top, ...prev]);
    setSwiping(true);
    try {
      const data = await api.post<{ matched?: boolean; matchScore?: number }>("/api/swipe", {
        targetId: top.id,
        direction: direction.toUpperCase(),
      });
      if (data.matched) {
        setMatchProfile(top);
      }
    } catch {
      // Swipe recorded best-effort; remove card regardless
    }
    setProfiles((p) => p.slice(1));
    setSwiping(false);
  }, [profiles, swiping]);

  const handleReloadSkipped = useCallback(() => {
    setProfiles((prev) => [...prev, ...skipped]);
    setSkipped([]);
  }, [skipped]);

  const handleSwipeLeft = useCallback(() => handleSwipe("pass"), [handleSwipe]);
  const handleSwipeRight = useCallback(() => handleSwipe("like"), [handleSwipe]);

  if (profiles.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🔍</Text>
        <Text style={styles.emptyTitle}>No more profiles</Text>
        <Text style={styles.emptySubtitle}>Check back later for new matches!</Text>
        {skipped.length > 0 && (
          <TouchableOpacity onPress={handleReloadSkipped} style={styles.reloadBtn}>
            <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.reloadGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.reloadBtnText}>↩ Revisit {skipped.length} Skipped</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stack — render bottom cards first so top card is on top */}
      <View style={[styles.deck, { height: CARD_HEIGHT }]}>
        {profiles.slice(0, 3).reverse().map((profile, reversedIndex) => {
          const index = Math.min(profiles.slice(0, 3).length - 1 - reversedIndex, 2);
          const scale = 1 - index * 0.04;
          const translateY = index * 10;
          return (
            <View
              key={profile.id}
              style={[styles.cardWrapper, { transform: [{ scale }, { translateY }] }]}
            >
              <SwipeCard
                profile={profile}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                isTop={index === 0}
              />
            </View>
          );
        })}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleSwipeLeft} disabled={swiping} style={styles.passBtn}>
          <Text style={styles.passBtnText}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/(app)/profile/${profiles[0].id}` as never)}
          style={styles.infoBtn}
        >
          <Text style={styles.infoBtnText}>ℹ</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSwipeRight} disabled={swiping} style={styles.likeBtn}>
          <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.likeBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.likeBtnText}>♥</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {skipped.length > 0 && (
        <TouchableOpacity onPress={handleReloadSkipped} style={styles.rewindRow}>
          <Text style={styles.rewindText}>↩ Reload {skipped.length} skipped</Text>
        </TouchableOpacity>
      )}

      {/* Match Modal */}
      <Modal visible={!!matchProfile} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.matchEmoji}>🎉</Text>
            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchSubtitle}>
              You and {matchProfile?.name} liked each other!
            </Text>
            {matchProfile?.compatibilityScore && (
              <View style={styles.matchScore}>
                <Text style={styles.matchScoreText}>{matchProfile.compatibilityScore}% Compatible</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                setMatchProfile(null);
                router.push("/(app)/matches" as never);
              }}
              style={styles.matchCta}
            >
              <LinearGradient colors={["#f43f5e", "#ec4899"]} style={styles.matchCtaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.matchCtaText}>Send a Message</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMatchProfile(null)} style={styles.matchDismiss}>
              <Text style={styles.matchDismissText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center" },
  deck: { width: SCREEN_WIDTH - 32, position: "relative" },
  cardWrapper: { position: "absolute", top: 0, left: 0, right: 0 },
  actions: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 16 },
  passBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff", borderWidth: 2, borderColor: "#ef4444", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  passBtnText: { fontSize: 22, color: "#ef4444", fontWeight: "700" },
  likeBtn: { width: 64, height: 64, borderRadius: 32, overflow: "hidden", shadowColor: Colors.rose500, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  likeBtnGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  likeBtnText: { fontSize: 28, color: "#fff" },
  infoBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", borderWidth: 2, borderColor: Colors.gray200, alignItems: "center", justifyContent: "center" },
  infoBtnText: { fontSize: 18, color: Colors.gray500, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: Colors.gray900 },
  emptySubtitle: { fontSize: 14, color: Colors.gray500 },
  reloadBtn: { marginTop: 8, borderRadius: 16, overflow: "hidden", alignSelf: "stretch", marginHorizontal: 32 },
  reloadGradient: { paddingVertical: 14, alignItems: "center" },
  reloadBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  rewindRow: { marginTop: 6 },
  rewindText: { fontSize: 13, color: Colors.gray400, fontWeight: "600" },
  // Match modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 32 },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 24, padding: 28, alignItems: "center", gap: 12 },
  matchEmoji: { fontSize: 56 },
  matchTitle: { fontSize: 28, fontWeight: "900", color: Colors.gray900 },
  matchSubtitle: { fontSize: 15, color: Colors.gray600, textAlign: "center" },
  matchScore: { backgroundColor: "#fff1f2", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  matchScoreText: { fontSize: 16, fontWeight: "700", color: Colors.rose500 },
  matchCta: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 8 },
  matchCtaGradient: { paddingVertical: 16, alignItems: "center" },
  matchCtaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  matchDismiss: { paddingVertical: 8 },
  matchDismissText: { fontSize: 14, color: Colors.gray400 },
});
