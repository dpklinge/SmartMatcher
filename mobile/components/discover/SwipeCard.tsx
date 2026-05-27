import { View, Text, Image, StyleSheet, Dimensions, ScrollView } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const ROTATION_FACTOR = 15;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.72;

export interface CardProfile {
  id: string;
  name: string;
  age: number;
  occupation?: string;
  location?: string;
  bio?: string;
  photoUrl?: string;
  photos?: string[];
  compatibilityScore?: number;
  categoryBreakdown?: Record<string, number>;
}

interface SwipeCardProps {
  profile: CardProfile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
}

export default function SwipeCard({ profile, onSwipeLeft, onSwipeRight, isTop }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // activeOffsetX: only capture gesture once horizontal movement clears 15px.
  // failOffsetY: yield to ScrollView if vertical movement clears 10px first.
  const gesture = Gesture.Pan()
    .enabled(isTop)
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY * 0.3;
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      if (Math.abs(translateX.value) > SWIPE_THRESHOLD || Math.abs(velocity) > 800) {
        const direction = translateX.value > 0 ? 1 : -1;
        translateX.value = withTiming(direction * SCREEN_WIDTH * 1.5, { duration: 250 });
        translateY.value = withTiming(translateY.value * 2, { duration: 250 });
        if (direction > 0) {
          runOnJS(onSwipeRight)();
        } else {
          runOnJS(onSwipeLeft)();
        }
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-ROTATION_FACTOR, 0, ROTATION_FACTOR],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const score = profile.compatibilityScore ?? 0;
  const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : Colors.gray400;
  const allPhotos = profile.photos?.length
    ? profile.photos
    : profile.photoUrl
    ? [profile.photoUrl]
    : [];

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Swipe overlays — pointer-events none so they never block scroll */}
        <Animated.View style={[styles.overlayLike, likeOpacity]} pointerEvents="none">
          <Text style={styles.overlayTextLike}>LIKE 💚</Text>
        </Animated.View>
        <Animated.View style={[styles.overlayPass, passOpacity]} pointerEvents="none">
          <Text style={styles.overlayTextPass}>PASS ✕</Text>
        </Animated.View>

        <ScrollView
          scrollEnabled={isTop}
          showsVerticalScrollIndicator={false}
          bounces
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. Name & personal details */}
          <View style={styles.detailsSection}>
            <Text style={styles.name}>{profile.name}, {profile.age}</Text>
            {profile.occupation ? <Text style={styles.meta}>💼 {profile.occupation}</Text> : null}
            {profile.location ? <Text style={styles.meta}>📍 {profile.location}</Text> : null}
          </View>

          {/* 2. Match percentage & category breakdown */}
          {score > 0 && (
            <View style={styles.scoreSection}>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                <Text style={styles.scoreText}>{score}% Match</Text>
              </View>
              {profile.categoryBreakdown && Object.keys(profile.categoryBreakdown).length > 0 && (
                <View style={styles.breakdown}>
                  {Object.entries(profile.categoryBreakdown).map(([cat, pct]) => (
                    <View key={cat} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{cat}</Text>
                      <View style={styles.breakdownBar}>
                        <View style={[styles.breakdownFill, { width: `${pct}%`, backgroundColor: scoreColor }]} />
                      </View>
                      <Text style={styles.breakdownPct}>{pct}%</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 3. About me */}
          {profile.bio ? (
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>About me</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* 4. Photos */}
          {allPhotos.length > 0 ? (
            <View style={styles.photosSection}>
              {allPhotos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.photo} />
              ))}
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>👤</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: SCREEN_WIDTH - 32,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    overflow: "hidden",
  },
  overlayLike: {
    position: "absolute", zIndex: 10, top: 40, left: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 4, borderColor: "#10b981", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
    transform: [{ rotate: "-15deg" }],
  },
  overlayTextLike: { fontSize: 26, fontWeight: "900", color: "#10b981" },
  overlayPass: {
    position: "absolute", zIndex: 10, top: 40, right: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 4, borderColor: "#ef4444", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
    transform: [{ rotate: "15deg" }],
  },
  overlayTextPass: { fontSize: 26, fontWeight: "900", color: "#ef4444" },
  scrollContent: { padding: 20, gap: 16 },

  // 1. Details
  detailsSection: { gap: 6 },
  name: { fontSize: 26, fontWeight: "800", color: Colors.gray900 },
  meta: { fontSize: 14, color: Colors.gray500 },

  // 2. Score
  scoreSection: { gap: 10 },
  scoreBadge: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  scoreText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  breakdown: { gap: 6 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownLabel: { width: 80, fontSize: 12, color: Colors.gray500 },
  breakdownBar: { flex: 1, height: 5, backgroundColor: Colors.gray100, borderRadius: 3, overflow: "hidden" },
  breakdownFill: { height: "100%", borderRadius: 3 },
  breakdownPct: { width: 32, fontSize: 12, color: Colors.gray500, textAlign: "right" },

  // 3. About me
  aboutSection: { gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.gray400, textTransform: "uppercase", letterSpacing: 1 },
  bio: { fontSize: 14, color: Colors.gray700, lineHeight: 22 },

  // 4. Photos
  photosSection: { gap: 10 },
  photo: { width: "100%", height: 320, borderRadius: 16, resizeMode: "cover" },
  photoPlaceholder: { height: 200, backgroundColor: "#fce7f3", borderRadius: 16, alignItems: "center", justifyContent: "center" },
  photoEmoji: { fontSize: 64 },
});
