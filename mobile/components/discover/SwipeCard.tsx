import { useRef } from "react";
import { View, Text, Image, StyleSheet, Dimensions, ScrollView } from "react-native";
import { PanGestureHandler, type PanGestureHandlerGestureEvent } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const ROTATION_FACTOR = 15;

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

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: (_, ctx: Record<string, number>) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY * 0.3;
    },
    onEnd: (event) => {
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
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-ROTATION_FACTOR, 0, ROTATION_FACTOR], Extrapolation.CLAMP);
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

  return (
    <PanGestureHandler onGestureEvent={isTop ? gestureHandler : undefined} enabled={isTop}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Photo */}
        {profile.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>👤</Text>
          </View>
        )}

        {/* Overlay labels */}
        <Animated.View style={[styles.overlayLike, likeOpacity]}>
          <Text style={styles.overlayTextLike}>LIKE 💚</Text>
        </Animated.View>
        <Animated.View style={[styles.overlayPass, passOpacity]}>
          <Text style={styles.overlayTextPass}>PASS ✕</Text>
        </Animated.View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}, {profile.age}</Text>
            {score > 0 && (
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                <Text style={styles.scoreText}>{score}%</Text>
              </View>
            )}
          </View>

          {profile.occupation && (
            <Text style={styles.meta}>💼 {profile.occupation}</Text>
          )}
          {profile.location && (
            <Text style={styles.meta}>📍 {profile.location}</Text>
          )}
          {profile.bio ? (
            <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
          ) : null}

          {/* Category breakdown */}
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

          {/* Photo gallery strip — shows additional photos beyond the first */}
          {(profile.photos?.length ?? 0) > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.galleryStrip}
              contentContainerStyle={styles.galleryContent}
            >
              {profile.photos!.slice(1).map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.galleryThumb} />
              ))}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: SCREEN_WIDTH - 32,
    borderRadius: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    overflow: "hidden",
  },
  photo: { width: "100%", height: 360, resizeMode: "cover" },
  photoPlaceholder: { width: "100%", height: 360, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  photoEmoji: { fontSize: 80 },
  overlayLike: {
    position: "absolute",
    top: 40,
    left: 20,
    borderWidth: 4,
    borderColor: "#10b981",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    transform: [{ rotate: "-15deg" }],
  },
  overlayTextLike: { fontSize: 26, fontWeight: "900", color: "#10b981" },
  overlayPass: {
    position: "absolute",
    top: 40,
    right: 20,
    borderWidth: 4,
    borderColor: "#ef4444",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    transform: [{ rotate: "15deg" }],
  },
  overlayTextPass: { fontSize: 26, fontWeight: "900", color: "#ef4444" },
  info: { padding: 16, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 22, fontWeight: "800", color: Colors.gray900 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  meta: { fontSize: 13, color: Colors.gray500 },
  bio: { fontSize: 13, color: Colors.gray600, lineHeight: 20, marginTop: 2 },
  breakdown: { marginTop: 8, gap: 4 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownLabel: { width: 80, fontSize: 11, color: Colors.gray500 },
  breakdownBar: { flex: 1, height: 4, backgroundColor: Colors.gray100, borderRadius: 2, overflow: "hidden" },
  breakdownFill: { height: "100%", borderRadius: 2 },
  breakdownPct: { width: 30, fontSize: 11, color: Colors.gray500, textAlign: "right" },
  galleryStrip: { marginTop: 10 },
  galleryContent: { gap: 6, paddingVertical: 2 },
  galleryThumb: { width: 72, height: 72, borderRadius: 10, resizeMode: "cover" },
});
