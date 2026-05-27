import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, ScrollView, TextInput, Switch, Platform, Alert, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";

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
  isSponsored: boolean;
  sponsorName: string | null;
  creator: { id: string; name: string; image: string | null } | null;
  isCreator: boolean;
  participantCount: number;
  myStatus: "APPROVED" | "PENDING" | "REJECTED" | null;
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
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

const defaultDateTime = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  return d;
};

export default function ActivitiesScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [activities, setActivities] = useState<ActivityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState("");
  const [formPlace, setFormPlace] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDateTime, setFormDateTime] = useState(defaultDateTime);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [formPriceMin, setFormPriceMin] = useState("0");
  const [formPriceMax, setFormPriceMax] = useState("");
  const [formMaxPeople, setFormMaxPeople] = useState("10");
  const [formIsOpen, setFormIsOpen] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const mine = tab === "mine" ? "?mine=1" : "";
      const data = await api.get<{ activities: ActivityCard[] }>(`/api/activities${mine}`);
      setActivities(data.activities);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const resetCreateForm = () => {
    setFormTitle("");
    setFormPlace("");
    setFormAddress("");
    setFormDesc("");
    setFormDateTime(defaultDateTime());
    setFormPriceMin("0");
    setFormPriceMax("");
    setFormMaxPeople("10");
    setFormIsOpen(true);
    setPickerMode(null);
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formPlace.trim() || !formAddress.trim()) {
      Alert.alert("Missing fields", "Title, place name, and address are required.");
      return;
    }
    const maxPeople = parseInt(formMaxPeople) || 1;
    if (maxPeople < 1) {
      Alert.alert("Invalid", "Max people must be at least 1.");
      return;
    }
    setCreating(true);
    try {
      await api.post("/api/activities", {
        title: formTitle.trim(),
        description: formDesc.trim(),
        placeName: formPlace.trim(),
        placeAddress: formAddress.trim(),
        dateTime: formDateTime.toISOString(),
        priceMin: parseInt(formPriceMin) || 0,
        priceMax: formPriceMax.trim() ? parseInt(formPriceMax) : null,
        maxPeople,
        isOpen: formIsOpen,
      });
      setShowCreate(false);
      resetCreateForm();
      await load();
      if (tab !== "mine") setTab("mine");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handlePickerChange = (_: unknown, date?: Date) => {
    if (Platform.OS !== "ios") setPickerMode(null);
    if (!date) return;
    const next = new Date(formDateTime);
    if (pickerMode === "date") {
      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      if (Platform.OS === "android") setPickerMode("time");
    } else {
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    }
    setFormDateTime(next);
  };

  const renderItem = ({ item }: { item: ActivityCard }) => {
    const spots = item.maxPeople - item.participantCount;
    const isFull = spots <= 0;
    const isPast = new Date(item.dateTime) < new Date();

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/activities/${item.id}` as never)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.isSponsored && item.sponsorName && (
              <View style={styles.sponsorBadge}>
                <Text style={styles.sponsorText}>Sponsored · {item.sponsorName}</Text>
              </View>
            )}
          </View>
          <View style={[styles.openBadge, { backgroundColor: item.isOpen ? "#d1fae5" : "#fef3c7" }]}>
            <Text style={[styles.openBadgeText, { color: item.isOpen ? "#065f46" : "#92400e" }]}>
              {item.isOpen ? "Open" : "Approval req."}
            </Text>
          </View>
        </View>

        <Text style={styles.cardPlace}>📍 {item.placeName}</Text>
        <Text style={styles.cardMeta}>{formatDateTime(item.dateTime)}</Text>

        <View style={styles.cardBottom}>
          <Text style={styles.cardPrice}>{formatPrice(item.priceMin, item.priceMax)}</Text>
          <Text style={[styles.cardSpots, isFull && { color: "#ef4444" }]}>
            {isPast ? "Past" : isFull ? "Full" : `${item.participantCount}/${item.maxPeople} going`}
          </Text>
          {item.myStatus === "APPROVED" && !item.isCreator && (
            <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>Going ✓</Text></View>
          )}
          {item.myStatus === "PENDING" && (
            <View style={[styles.statusBadge, { backgroundColor: "#fef3c7" }]}>
              <Text style={[styles.statusBadgeText, { color: "#92400e" }]}>Pending</Text>
            </View>
          )}
          {item.isCreator && (
            <View style={[styles.statusBadge, { backgroundColor: "#ede9fe" }]}>
              <Text style={[styles.statusBadgeText, { color: "#5b21b6" }]}>Host</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activities 🎉</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Tab toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "browse" && styles.tabBtnActive]}
          onPress={() => setTab("browse")}
        >
          <Text style={[styles.tabBtnText, tab === "browse" && styles.tabBtnTextActive]}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "mine" && styles.tabBtnActive]}
          onPress={() => setTab("mine")}
        >
          <Text style={[styles.tabBtnText, tab === "mine" && styles.tabBtnTextActive]}>My Activities</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.rose500} /></View>
      ) : activities.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🗓️</Text>
          <Text style={styles.emptyTitle}>
            {tab === "browse" ? "No upcoming activities" : "No activities yet"}
          </Text>
          <Text style={styles.emptySub}>
            {tab === "browse" ? "Check back soon!" : "Create one or join an activity to get started."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[Colors.rose500]} />}
        />
      )}

      {/* Create Activity Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowCreate(false); resetCreateForm(); }}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowCreate(false); resetCreateForm(); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Activity</Text>
            <TouchableOpacity onPress={handleCreate} disabled={creating}>
              {creating
                ? <ActivityIndicator color={Colors.rose500} />
                : <Text style={styles.modalDone}>Create</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Field label="Title *">
              <TextInput
                style={styles.input}
                placeholder="e.g. Sunset Hike at Crowders Mountain"
                value={formTitle}
                onChangeText={setFormTitle}
                maxLength={80}
              />
            </Field>

            <Field label="Place Name *">
              <TextInput
                style={styles.input}
                placeholder="e.g. Freedom Park"
                value={formPlace}
                onChangeText={setFormPlace}
              />
            </Field>

            <Field label="Address *">
              <TextInput
                style={styles.input}
                placeholder="e.g. 1900 East Blvd, Charlotte NC"
                value={formAddress}
                onChangeText={setFormAddress}
              />
            </Field>

            <Field label="Date & Time *">
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.datePill} onPress={() => setPickerMode("date")}>
                  <Text style={styles.datePillLabel}>Date</Text>
                  <Text style={styles.datePillValue}>
                    {formDateTime.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.datePill} onPress={() => setPickerMode("time")}>
                  <Text style={styles.datePillLabel}>Time</Text>
                  <Text style={styles.datePillValue}>
                    {formDateTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </Text>
                </TouchableOpacity>
              </View>
              {pickerMode !== null && (
                <DateTimePicker
                  value={formDateTime}
                  mode={pickerMode}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={pickerMode === "date" ? new Date() : undefined}
                  onChange={handlePickerChange}
                />
              )}
              {pickerMode !== null && Platform.OS === "ios" && (
                <TouchableOpacity style={styles.pickerDone} onPress={() => setPickerMode(null)}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </Field>

            <Field label="Description">
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="What are you planning?"
                value={formDesc}
                onChangeText={setFormDesc}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Field>

            <Field label="Price Range ($)">
              <View style={styles.priceRow}>
                <View style={styles.priceField}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    value={formPriceMin}
                    onChangeText={setFormPriceMin}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={styles.priceDash}>–</Text>
                <View style={styles.priceField}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Free"
                    value={formPriceMax}
                    onChangeText={setFormPriceMax}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </Field>

            <Field label="Max People *">
              <TextInput
                style={styles.input}
                placeholder="10"
                value={formMaxPeople}
                onChangeText={setFormMaxPeople}
                keyboardType="numeric"
              />
            </Field>

            <Field label="Admission">
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>{formIsOpen ? "Open to everyone" : "Approval required"}</Text>
                  <Text style={styles.switchSub}>
                    {formIsOpen
                      ? "Anyone can join immediately"
                      : "You approve or decline each request"}
                  </Text>
                </View>
                <Switch
                  value={formIsOpen}
                  onValueChange={setFormIsOpen}
                  trackColor={{ false: Colors.gray200, true: Colors.rose500 }}
                  thumbColor="#fff"
                />
              </View>
            </Field>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: Colors.gray900 },
  createBtn: { backgroundColor: Colors.rose500, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  tabRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 12, backgroundColor: Colors.gray100, borderRadius: 12, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: Colors.gray500 },
  tabBtnTextActive: { color: Colors.gray900 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  emptySub: { fontSize: 13, color: Colors.gray500, textAlign: "center", paddingHorizontal: 32 },
  list: { padding: 16, gap: 12 },
  // Card
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.gray100, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: Colors.gray900 },
  sponsorBadge: { backgroundColor: "#ede9fe", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
  sponsorText: { fontSize: 10, fontWeight: "700", color: "#5b21b6" },
  openBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  openBadgeText: { fontSize: 11, fontWeight: "700" },
  cardPlace: { fontSize: 13, color: Colors.gray600 },
  cardMeta: { fontSize: 12, color: Colors.gray500 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  cardPrice: { fontSize: 13, fontWeight: "700", color: Colors.gray700 },
  cardSpots: { fontSize: 12, color: Colors.gray500, flex: 1 },
  statusBadge: { backgroundColor: "#d1fae5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", color: "#065f46" },
  // Create modal
  modalSafe: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.gray900 },
  modalCancel: { fontSize: 15, color: Colors.gray500 },
  modalDone: { fontSize: 15, fontWeight: "700", color: Colors.rose500 },
  formScroll: { flex: 1 },
  formContent: { padding: 20, gap: 20, paddingBottom: 40 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.gray700, textTransform: "uppercase", letterSpacing: 0.4 },
  input: { backgroundColor: Colors.gray50, borderRadius: 12, borderWidth: 1, borderColor: Colors.gray200, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: Colors.gray900 },
  inputMulti: { height: 80, paddingTop: 11 },
  dateRow: { flexDirection: "row", gap: 10 },
  datePill: { flex: 1, backgroundColor: Colors.gray50, borderRadius: 12, borderWidth: 1, borderColor: Colors.gray200, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  datePillLabel: { fontSize: 10, fontWeight: "700", color: Colors.gray500, textTransform: "uppercase" },
  datePillValue: { fontSize: 14, fontWeight: "600", color: Colors.gray900 },
  pickerDone: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 14 },
  pickerDoneText: { color: Colors.rose500, fontWeight: "700", fontSize: 15 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceField: { flex: 1, gap: 4 },
  priceLabel: { fontSize: 11, color: Colors.gray500, fontWeight: "600" },
  priceInput: { backgroundColor: Colors.gray50, borderRadius: 10, borderWidth: 1, borderColor: Colors.gray200, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.gray900 },
  priceDash: { fontSize: 18, color: Colors.gray400, marginTop: 18 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.gray50, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.gray200 },
  switchLabel: { fontSize: 14, fontWeight: "600", color: Colors.gray900 },
  switchSub: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
});
