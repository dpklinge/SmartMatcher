import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, Modal, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";

interface ConversationItem {
  id: string;
  other: { id: string; name: string | null; image: string | null };
  lastMessage: {
    body: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
}

interface Contact {
  id: string;
  name: string | null;
  image: string | null;
  connectionType: "match" | "activity";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ name, image, size = 48 }: { name: string | null; image: string | null; size?: number }) {
  const r = size / 2;
  if (image) {
    return <Image source={{ uri: image }} style={{ width: size, height: size, borderRadius: r }} />;
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: r }]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.38 }]}>
        {(name ?? "?")[0].toUpperCase()}
      </Text>
    </View>
  );
}

export default function MessagesScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [convos, setConvos] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const loadConvos = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api.get<{ conversations: ConversationItem[] }>("/api/conversations");
      setConvos(data.conversations);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  const openCompose = async () => {
    setShowCompose(true);
    setContactsLoading(true);
    try {
      const data = await api.get<{ contacts: Contact[] }>("/api/messageable-users");
      setContacts(data.contacts);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  const startConversation = async (otherId: string) => {
    setStarting(otherId);
    try {
      const data = await api.post<{ conversationId: string }>("/api/conversations", { otherId });
      setShowCompose(false);
      router.push(`/(app)/messages/${data.conversationId}` as never);
    } catch (e) {
      // ignore
    } finally {
      setStarting(null);
    }
  };

  const renderConvo = ({ item }: { item: ConversationItem }) => {
    const isUnread = item.unreadCount > 0;
    const isMine = item.lastMessage?.senderId === userId;
    const preview = item.lastMessage
      ? (isMine ? "You: " : "") + item.lastMessage.body
      : "No messages yet";

    return (
      <TouchableOpacity
        style={[styles.convoRow, isUnread && styles.convoRowUnread]}
        onPress={() => router.push(`/(app)/messages/${item.id}` as never)}
        activeOpacity={0.7}
      >
        <Avatar name={item.other.name} image={item.other.image} />
        <View style={styles.convoBody}>
          <View style={styles.convoTopRow}>
            <Text style={[styles.convoName, isUnread && styles.convoNameBold]} numberOfLines={1}>
              {item.other.name ?? "Unknown"}
            </Text>
            <Text style={[styles.convoTime, isUnread && styles.convoTimeUnread]}>
              {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ""}
            </Text>
          </View>
          <View style={styles.convoBotRow}>
            <Text
              style={[styles.convoPreview, isUnread && styles.convoPreviewBold]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {isUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages 💬</Text>
        <TouchableOpacity style={styles.composeBtn} onPress={openCompose}>
          <Text style={styles.composeBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>
      ) : convos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySub}>
            Start a conversation with a match or activity connection.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openCompose}>
            <Text style={styles.emptyBtnText}>Start a conversation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={(item) => item.id}
          renderItem={renderConvo}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadConvos(true)} colors={[Colors.rose500]} />
          }
        />
      )}

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompose(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCompose(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Message</Text>
            <View style={{ width: 56 }} />
          </View>

          {contactsLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>
          ) : contacts.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>🤝</Text>
              <Text style={styles.emptyTitle}>No contacts yet</Text>
              <Text style={styles.emptySub}>
                Match with someone or join an activity to start messaging.
              </Text>
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <Text style={styles.contactsHeader}>Who can you message</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => startConversation(item.id)}
                  disabled={starting === item.id}
                >
                  <Avatar name={item.name} image={item.image} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{item.name ?? "Unknown"}</Text>
                    <Text style={styles.contactType}>
                      {item.connectionType === "match" ? "💞 Match" : "🎉 Activity connection"}
                    </Text>
                  </View>
                  {starting === item.id
                    ? <ActivityIndicator color={Colors.rose500} />
                    : <Text style={styles.contactArrow}>›</Text>}
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: Colors.gray900 },
  composeBtn: {
    backgroundColor: Colors.rose500, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  composeBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  emptySub: { fontSize: 13, color: Colors.gray500, textAlign: "center" },
  emptyBtn: {
    marginTop: 8, backgroundColor: Colors.rose500,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  // Conversation row
  convoRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  convoRowUnread: { backgroundColor: "#fff7f8" },
  convoBody: { flex: 1, gap: 3 },
  convoTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convoName: { fontSize: 15, fontWeight: "500", color: Colors.gray800, flex: 1, marginRight: 8 },
  convoNameBold: { fontWeight: "700" },
  convoTime: { fontSize: 12, color: Colors.gray400 },
  convoTimeUnread: { color: Colors.rose500, fontWeight: "600" },
  convoBotRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  convoPreview: { flex: 1, fontSize: 13, color: Colors.gray500 },
  convoPreviewBold: { color: Colors.gray700, fontWeight: "600" },
  badge: {
    backgroundColor: Colors.rose500, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  avatarFallback: {
    backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontWeight: "700", color: Colors.rose500 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  modalCancel: { fontSize: 15, color: Colors.gray500, width: 56 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.gray900 },
  contactsHeader: {
    fontSize: 11, fontWeight: "700", color: Colors.gray500,
    textTransform: "uppercase", letterSpacing: 0.6,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  contactName: { fontSize: 15, fontWeight: "600", color: Colors.gray900 },
  contactType: { fontSize: 12, color: Colors.gray500, marginTop: 1 },
  contactArrow: { fontSize: 22, color: Colors.gray300, fontWeight: "300" },
});
