import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/lib/auth-store";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { Colors } from "@/constants/colors";

interface Participant {
  userId: string;
  name: string | null;
  image: string | null;
  status: "APPROVED" | "PENDING" | "REJECTED";
  joinedAt: string;
}

interface ActivityDetail {
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
  isSponsored: boolean;
  sponsorName: string | null;
  creator: { id: string; name: string | null; image: string | null } | null;
  isCreator: boolean;
  myStatus: "APPROVED" | "PENDING" | "REJECTED" | null;
  participantCount: number;
  pendingCount: number;
  participants: Participant[];
}

function formatPrice(min: number, max: number | null): string {
  if (min === 0 && (max === 0 || max == null)) return "Free";
  if (max == null) return `From $${min}`;
  if (min === max) return `$${min}`;
  return `$${min}–$${max}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) +
    "\n" +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [messaging, setMessaging] = useState<string | null>(null);

  const openMessage = async (otherId: string) => {
    setMessaging(otherId);
    try {
      const data = await api.post<{ conversationId: string }>("/api/conversations", { otherId });
      router.push(`/(app)/messages/${data.conversationId}` as never);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setMessaging(null);
    }
  };

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ activity: ActivityDetail }>(`/api/activities/${id}`);
      setActivity(data.activity);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      const result = await api.post<{ status: string }>(`/api/activities/${id}/join`);
      await load();
      if (result.status === "PENDING") {
        Alert.alert("Request sent", "The host will review your request.");
      }
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = () => {
    Alert.alert("Leave activity", "Are you sure you want to leave this activity?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave", style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.delete(`/api/activities/${id}/join`);
            await load();
          } catch (e) {
            Alert.alert("Error", (e as Error).message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleParticipantAction = async (participantUserId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await api.patch(`/api/activities/${id}/participants/${participantUserId}`, { status });
      await load();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete activity", "This will permanently delete the activity and remove all participants.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/activities/${id}`);
            router.back();
          } catch (e) {
            Alert.alert("Error", (e as Error).message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>;
  }
  if (!activity) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.center}><Text style={styles.errorText}>Activity not found</Text></View>
      </SafeAreaView>
    );
  }

  const isPast = new Date(activity.dateTime) < new Date();
  const isFull = activity.participantCount >= activity.maxPeople;
  const approved = activity.participants.filter((p) => p.status === "APPROVED");
  const pending = activity.participants.filter((p) => p.status === "PENDING");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        {/* Title row */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{activity.title}</Text>
          <View style={styles.badgeRow}>
            {activity.isSponsored && activity.sponsorName && (
              <View style={styles.sponsorBadge}>
                <Text style={styles.sponsorText}>Sponsored · {activity.sponsorName}</Text>
              </View>
            )}
            <View style={[styles.openBadge, { backgroundColor: activity.isOpen ? "#d1fae5" : "#fef3c7" }]}>
              <Text style={[styles.openBadgeText, { color: activity.isOpen ? "#065f46" : "#92400e" }]}>
                {activity.isOpen ? "Open to all" : "Approval required"}
              </Text>
            </View>
          </View>
        </View>

        {/* Details grid */}
        <View style={styles.detailGrid}>
          <DetailRow icon="📍" label="Location">
            <Text style={styles.detailValue}>{activity.placeName}</Text>
            <Text style={styles.detailSub}>{activity.placeAddress}</Text>
          </DetailRow>
          <DetailRow icon="📅" label="When">
            <Text style={styles.detailValue}>{formatDateTime(activity.dateTime)}</Text>
          </DetailRow>
          <DetailRow icon="💰" label="Price">
            <Text style={styles.detailValue}>{formatPrice(activity.priceMin, activity.priceMax)}</Text>
          </DetailRow>
          <DetailRow icon="👥" label="Capacity">
            <Text style={styles.detailValue}>
              {activity.participantCount} / {activity.maxPeople} people
              {isFull ? "  · Full" : `  · ${activity.maxPeople - activity.participantCount} spots left`}
            </Text>
          </DetailRow>
          {activity.creator && (
            <DetailRow icon="🎟️" label="Hosted by">
              <Text style={styles.detailValue}>{activity.creator.name ?? "Unknown"}</Text>
            </DetailRow>
          )}
        </View>

        {/* Description */}
        {activity.description.trim().length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{activity.description}</Text>
          </View>
        )}

        {/* Message Host — visible to participants (any status) */}
        {!activity.isCreator && activity.creator && activity.myStatus !== null && (
          <TouchableOpacity
            style={styles.msgHostBtn}
            onPress={() => openMessage(activity.creator!.id)}
            disabled={messaging === activity.creator!.id}
          >
            {messaging === activity.creator!.id
              ? <ActivityIndicator color={Colors.rose500} size="small" />
              : <Text style={styles.msgHostBtnText}>💬 Message Host</Text>}
          </TouchableOpacity>
        )}

        {/* Action button */}
        {!activity.isCreator && !isPast && (
          <View style={styles.actionSection}>
            {activity.myStatus === null && (
              <TouchableOpacity
                style={[styles.actionBtn, isFull && styles.actionBtnDisabled]}
                onPress={handleJoin}
                disabled={actionLoading || isFull}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.actionBtnText}>
                      {isFull ? "Activity Full" : activity.isOpen ? "Join Activity" : "Request to Join"}
                    </Text>}
              </TouchableOpacity>
            )}
            {activity.myStatus === "APPROVED" && (
              <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} disabled={actionLoading}>
                <Text style={styles.leaveBtnText}>Leave Activity</Text>
              </TouchableOpacity>
            )}
            {activity.myStatus === "PENDING" && (
              <View style={styles.pendingBox}>
                <Text style={styles.pendingText}>⏳ Request pending — waiting for host approval</Text>
              </View>
            )}
            {activity.myStatus === "REJECTED" && (
              <View style={[styles.pendingBox, { backgroundColor: "#fef2f2" }]}>
                <Text style={[styles.pendingText, { color: "#991b1b" }]}>✕ Your request was declined</Text>
              </View>
            )}
          </View>
        )}

        {/* Creator controls */}
        {activity.isCreator && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage</Text>

            {pending.length > 0 && (
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Text style={styles.subheading}>Pending Requests ({pending.length})</Text>
                {pending.map((p) => (
                  <View key={p.userId} style={styles.participantRow}>
                    <Avatar name={p.name} image={p.image} />
                    <Text style={styles.participantName}>{p.name}</Text>
                    <TouchableOpacity
                      style={styles.msgIconBtn}
                      onPress={() => openMessage(p.userId)}
                      disabled={messaging === p.userId}
                    >
                      {messaging === p.userId
                        ? <ActivityIndicator size="small" color={Colors.rose500} />
                        : <Text style={styles.msgIconText}>💬</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleParticipantAction(p.userId, "APPROVED")}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleParticipantAction(p.userId, "REJECTED")}
                    >
                      <Text style={styles.rejectBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete Activity</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Participants list */}
        {approved.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Going ({approved.length})
            </Text>
            <View style={{ gap: 10 }}>
              {approved.map((p) => (
                <View key={p.userId} style={styles.participantRow}>
                  <Avatar name={p.name} image={p.image} />
                  <Text style={styles.participantName}>{p.name}</Text>
                  {activity.isCreator && p.userId !== userId && (
                    <TouchableOpacity
                      style={styles.msgIconBtn}
                      onPress={() => openMessage(p.userId)}
                      disabled={messaging === p.userId}
                    >
                      {messaging === p.userId
                        ? <ActivityIndicator size="small" color={Colors.rose500} />
                        : <Text style={styles.msgIconText}>💬</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  if (image) return <Image source={{ uri: image }} style={styles.avatar} />;
  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarInitial}>{(name ?? "?")[0].toUpperCase()}</Text>
    </View>
  );
}

function DetailRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14, color: "#ef4444" },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 4 },
  backBtnText: { fontSize: 15, color: Colors.rose500, fontWeight: "600" },
  titleSection: { gap: 8 },
  title: { fontSize: 24, fontWeight: "900", color: Colors.gray900, lineHeight: 30 },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  sponsorBadge: { backgroundColor: "#ede9fe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sponsorText: { fontSize: 11, fontWeight: "700", color: "#5b21b6" },
  openBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  openBadgeText: { fontSize: 11, fontWeight: "700" },
  detailGrid: { gap: 0, borderWidth: 1, borderColor: Colors.gray100, borderRadius: 16, overflow: "hidden" },
  detailRow: { flexDirection: "row", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.gray100, alignItems: "flex-start" },
  detailIcon: { fontSize: 20, marginTop: 1 },
  detailLabel: { fontSize: 11, fontWeight: "700", color: Colors.gray500, textTransform: "uppercase", marginBottom: 3 },
  detailValue: { fontSize: 14, color: Colors.gray900, fontWeight: "600" },
  detailSub: { fontSize: 12, color: Colors.gray500, marginTop: 1 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.gray700, textTransform: "uppercase", letterSpacing: 0.4 },
  description: { fontSize: 14, color: Colors.gray700, lineHeight: 22 },
  actionSection: { gap: 10 },
  actionBtn: { backgroundColor: Colors.rose500, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  actionBtnDisabled: { backgroundColor: Colors.gray300 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  leaveBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#ef4444" },
  leaveBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },
  pendingBox: { backgroundColor: "#fefce8", borderRadius: 12, padding: 14 },
  pendingText: { fontSize: 14, color: "#92400e", fontWeight: "600", textAlign: "center" },
  subheading: { fontSize: 12, fontWeight: "700", color: Colors.gray600 },
  participantRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 15, fontWeight: "700", color: Colors.rose500 },
  participantName: { flex: 1, fontSize: 14, color: Colors.gray900, fontWeight: "500" },
  msgHostBtn: {
    borderRadius: 12, paddingVertical: 12, alignItems: "center",
    borderWidth: 1.5, borderColor: Colors.rose500,
  },
  msgHostBtnText: { color: Colors.rose500, fontWeight: "700", fontSize: 14 },
  msgIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.gray100, alignItems: "center", justifyContent: "center",
  },
  msgIconText: { fontSize: 15 },
  approveBtn: { backgroundColor: "#d1fae5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  approveBtnText: { fontSize: 12, fontWeight: "700", color: "#065f46" },
  rejectBtn: { backgroundColor: "#fef2f2", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  rejectBtnText: { fontSize: 12, fontWeight: "700", color: "#991b1b" },
  deleteBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1.5, borderColor: "#ef4444" },
  deleteBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
});
