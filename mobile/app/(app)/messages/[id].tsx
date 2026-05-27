import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Alert, Modal,
  Image, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedActivity {
  id: string;
  title: string;
  placeName: string;
  dateTime: string;
  priceMin: number;
  priceMax: number | null;
  maxPeople: number;
  isOpen: boolean;
  isCreatedByMe: boolean;
  myStatus: "APPROVED" | "PENDING" | "REJECTED" | null;
  participantCount: number;
}

interface MessageItem {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  linkedActivity: LinkedActivity | null;
}

interface OtherUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface ActivityCard {
  id: string;
  title: string;
  description: string;
  placeName: string;
  placeAddress: string;
  dateTime: string;
  priceMin: number;
  priceMax: number | null;
  maxPeople: number;
  isOpen: boolean;
  isCreator: boolean;
  participantCount: number;
  myStatus: "APPROVED" | "PENDING" | "REJECTED" | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return `Yesterday ${timeStr}`;
  if (diffDays < 7) return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${timeStr}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${timeStr}`;
}

function formatPrice(min: number, max: number | null): string {
  if (min === 0 && (max === 0 || max == null)) return "Free";
  if (max == null) return `From $${min}`;
  if (min === max) return `$${min}`;
  return `$${min}–$${max}`;
}

function shouldShowTimestamp(messages: MessageItem[], index: number): boolean {
  if (index === messages.length - 1) return true;
  const curr = new Date(messages[index].createdAt);
  const prev = new Date(messages[index + 1].createdAt);
  return curr.getTime() - prev.getTime() > 5 * 60 * 1000;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserAvatar({ name, image, size = 32 }: { name: string | null; image: string | null; size?: number }) {
  const r = size / 2;
  if (image) return <Image source={{ uri: image }} style={{ width: size, height: size, borderRadius: r }} />;
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: r }]}>
      <Text style={{ fontSize: size * 0.4, fontWeight: "700", color: Colors.rose500 }}>
        {(name ?? "?")[0].toUpperCase()}
      </Text>
    </View>
  );
}

function ActivityCardInline({
  activity,
  onJoinPress,
  joining,
}: {
  activity: LinkedActivity;
  onJoinPress: (a: LinkedActivity) => void;
  joining: boolean;
}) {
  const isPast = new Date(activity.dateTime) < new Date();
  const isFull = activity.participantCount >= activity.maxPeople;
  const canJoin = !activity.isCreatedByMe && !isPast && !isFull && activity.myStatus === null;
  const d = new Date(activity.dateTime);
  const dateStr =
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <View style={styles.activityCard}>
      <View style={styles.activityCardTop}>
        <Text style={styles.activityCardTitle} numberOfLines={2}>{activity.title}</Text>
      </View>
      <Text style={styles.activityCardRow}>📍 {activity.placeName}</Text>
      <Text style={styles.activityCardRow}>📅 {dateStr}</Text>
      <Text style={styles.activityCardRow}>
        💰 {formatPrice(activity.priceMin, activity.priceMax)}
        {"  "}
        👥 {activity.participantCount}/{activity.maxPeople}
      </Text>
      {!activity.isCreatedByMe && (
        <View style={styles.activityCardFooter}>
          {activity.myStatus === "APPROVED" && (
            <Text style={styles.activityStatusGoing}>✓ Going</Text>
          )}
          {activity.myStatus === "PENDING" && (
            <Text style={styles.activityStatusPending}>⏳ Request pending</Text>
          )}
          {activity.myStatus === "REJECTED" && (
            <Text style={styles.activityStatusRejected}>✕ Request declined</Text>
          )}
          {canJoin && (
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => onJoinPress(activity)}
              disabled={joining}
            >
              {joining
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.joinBtnText}>
                    {activity.isOpen ? "Join" : "Request to Join"}
                  </Text>}
            </TouchableOpacity>
          )}
          {isPast && <Text style={styles.activityStatusPast}>Event passed</Text>}
          {!isPast && isFull && <Text style={styles.activityStatusPast}>Full</Text>}
        </View>
      )}
      {activity.isCreatedByMe && (
        <Text style={styles.activityCreatedByMe}>Your activity</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [other, setOther] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  // Activity link picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerActivities, setPickerActivities] = useState<ActivityCard[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [linkedActivity, setLinkedActivity] = useState<ActivityCard | null>(null);

  const listRef = useRef<FlatList>(null);

  // Load conversation info from the conversations list (we derive other user from the id in the path)
  const loadMessages = useCallback(async (cursor?: string) => {
    const isInitial = !cursor;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const url = `/api/conversations/${id}/messages${cursor ? `?cursor=${cursor}` : ""}`;
      const data = await api.get<{ messages: MessageItem[]; nextCursor: string | null }>(url);

      if (isInitial) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [...prev, ...data.messages]);
      }
      setNextCursor(data.nextCursor);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);

  // Load other user info from conversations list
  const loadOtherUser = useCallback(async () => {
    try {
      const data = await api.get<{ conversations: Array<{ id: string; other: OtherUser }> }>(
        "/api/conversations"
      );
      const conv = data.conversations.find((c) => c.id === id);
      if (conv) setOther(conv.other);
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    loadMessages();
    loadOtherUser();
  }, [loadMessages, loadOtherUser]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    const textSnapshot = trimmed;
    const activitySnapshot = linkedActivity;
    setText("");
    setLinkedActivity(null);

    try {
      await api.post(`/api/conversations/${id}/messages`, {
        body: textSnapshot,
        linkedActivityId: activitySnapshot?.id ?? null,
      });
      await loadMessages();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
      setText(textSnapshot);
      setLinkedActivity(activitySnapshot);
    } finally {
      setSending(false);
    }
  };

  const handleJoin = async (activity: LinkedActivity) => {
    setJoining(activity.id);
    try {
      const result = await api.post<{ status: string }>(`/api/activities/${activity.id}/join`);
      await loadMessages();
      if (result.status === "PENDING") {
        Alert.alert("Request sent", "The host will review your request.");
      }
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setJoining(null);
    }
  };

  const openPicker = async () => {
    setShowPicker(true);
    setPickerLoading(true);
    try {
      const data = await api.get<{ activities: ActivityCard[] }>("/api/activities?created=1");
      setPickerActivities(data.activities);
    } catch {
      setPickerActivities([]);
    } finally {
      setPickerLoading(false);
    }
  };

  const renderMessage = ({ item, index }: { item: MessageItem; index: number }) => {
    const isMine = item.senderId === userId;
    const showTs = shouldShowTimestamp(messages, index);

    return (
      <View>
        <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
          {!isMine && <UserAvatar name={other?.name ?? null} image={other?.image ?? null} />}
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
              {item.body}
            </Text>
            {item.linkedActivity && (
              <ActivityCardInline
                activity={item.linkedActivity}
                onJoinPress={handleJoin}
                joining={joining === item.linkedActivity.id}
              />
            )}
          </View>
          {isMine && <View style={{ width: 32 }} />}
        </View>
        {showTs && (
          <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={Colors.rose500} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        {other && (
          <>
            <UserAvatar name={other.name} image={other.image} size={36} />
            <Text style={styles.chatHeaderName} numberOfLines={1}>{other.name ?? "Unknown"}</Text>
          </>
        )}
        <View style={{ flex: 1 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Message list (inverted = newest at bottom) */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.msgList}
          onEndReached={() => {
            if (nextCursor && !loadingMore) loadMessages(nextCursor);
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={Colors.rose500} style={{ padding: 12 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>No messages yet. Say hi! 👋</Text>
            </View>
          }
        />

        {/* Linked activity preview */}
        {linkedActivity && (
          <View style={styles.linkedPreview}>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkedPreviewLabel}>Linking activity:</Text>
              <Text style={styles.linkedPreviewTitle} numberOfLines={1}>{linkedActivity.title}</Text>
            </View>
            <TouchableOpacity onPress={() => setLinkedActivity(null)}>
              <Text style={styles.linkedPreviewRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={openPicker}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Message…"
            placeholderTextColor={Colors.gray400}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendBtnText}>↑</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Activity picker modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <SafeAreaView style={styles.pickerSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Link an Activity</Text>
            <View style={{ width: 56 }} />
          </View>
          <Text style={styles.pickerSubtitle}>
            Share one of your created activities so the other person can join.
          </Text>

          {pickerLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>
          ) : pickerActivities.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>🗓️</Text>
              <Text style={styles.emptyTitle}>No activities</Text>
              <Text style={styles.emptySub}>Create an activity first to share it here.</Text>
            </View>
          ) : (
            <FlatList
              data={pickerActivities}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => {
                const d = new Date(item.dateTime);
                const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const isPast = d < new Date();
                return (
                  <Pressable
                    style={[styles.pickerCard, isPast && styles.pickerCardPast]}
                    onPress={() => {
                      setLinkedActivity(item);
                      setShowPicker(false);
                    }}
                  >
                    <Text style={styles.pickerCardTitle}>{item.title}</Text>
                    <Text style={styles.pickerCardMeta}>📍 {item.placeName}</Text>
                    <Text style={styles.pickerCardMeta}>📅 {dateStr}{isPast ? " · Past" : ""}</Text>
                    <Text style={styles.pickerCardMeta}>
                      👥 {item.participantCount}/{item.maxPeople} · {formatPrice(item.priceMin, item.priceMax)}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.gray900 },
  emptySub: { fontSize: 13, color: Colors.gray500, textAlign: "center", paddingHorizontal: 20 },
  // Header
  chatHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  backBtn: { paddingRight: 4 },
  backBtnText: { fontSize: 28, color: Colors.rose500, lineHeight: 30, fontWeight: "300" },
  chatHeaderName: { fontSize: 16, fontWeight: "700", color: Colors.gray900, flex: 1 },
  avatarFallback: { backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  // Messages
  msgList: { padding: 12, gap: 4 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginVertical: 2 },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", borderRadius: 18, padding: 10, paddingHorizontal: 14 },
  bubbleMine: { backgroundColor: Colors.rose500, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.gray100, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: "#fff" },
  bubbleTextTheirs: { color: Colors.gray900 },
  timestamp: { fontSize: 11, color: Colors.gray400, textAlign: "center", marginVertical: 6 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyChatText: { fontSize: 14, color: Colors.gray400, textAlign: "center" },
  // Activity card inside bubble
  activityCard: {
    marginTop: 8, backgroundColor: "#fff", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", gap: 4,
  },
  activityCardTop: { flexDirection: "row", alignItems: "flex-start" },
  activityCardTitle: { fontSize: 13, fontWeight: "700", color: Colors.gray900, flex: 1 },
  activityCardRow: { fontSize: 12, color: Colors.gray600 },
  activityCardFooter: { marginTop: 6 },
  activityStatusGoing: { fontSize: 12, fontWeight: "700", color: "#065f46" },
  activityStatusPending: { fontSize: 12, fontWeight: "600", color: "#92400e" },
  activityStatusRejected: { fontSize: 12, fontWeight: "600", color: "#991b1b" },
  activityStatusPast: { fontSize: 12, color: Colors.gray500 },
  activityCreatedByMe: { fontSize: 12, color: Colors.gray500, fontStyle: "italic" },
  joinBtn: {
    backgroundColor: Colors.rose500, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start", marginTop: 4,
  },
  joinBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  // Linked activity preview strip above input
  linkedPreview: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff7f8", paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: "#fce7f3",
  },
  linkedPreviewLabel: { fontSize: 10, fontWeight: "700", color: Colors.rose500, textTransform: "uppercase" },
  linkedPreviewTitle: { fontSize: 13, fontWeight: "600", color: Colors.gray900 },
  linkedPreviewRemove: { fontSize: 16, color: Colors.gray400, fontWeight: "700", padding: 4 },
  // Input bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: Colors.gray100,
    backgroundColor: "#fff",
  },
  attachBtn: { paddingBottom: 10 },
  attachIcon: { fontSize: 22 },
  textInput: {
    flex: 1, backgroundColor: Colors.gray50, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.gray200,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 15, color: Colors.gray900,
    maxHeight: 120, minHeight: 42,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.rose500,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: Colors.gray300 },
  sendBtnText: { color: "#fff", fontSize: 18, fontWeight: "700", lineHeight: 20 },
  // Activity picker modal
  pickerSafe: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  modalCancel: { fontSize: 15, color: Colors.gray500, width: 56 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.gray900 },
  pickerSubtitle: {
    fontSize: 13, color: Colors.gray500, textAlign: "center",
    paddingHorizontal: 24, paddingTop: 12,
  },
  pickerCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.gray200,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2, gap: 4,
  },
  pickerCardPast: { opacity: 0.55 },
  pickerCardTitle: { fontSize: 15, fontWeight: "700", color: Colors.gray900 },
  pickerCardMeta: { fontSize: 12, color: Colors.gray600 },
});
