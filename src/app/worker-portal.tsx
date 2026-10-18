import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function WorkerPortalScreen() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => { loadWorkerData(); }, []);

  async function loadWorkerData() {
    setLoading(true);
    try {
      const [profRes, bookRes] = await Promise.all([
        api.get("/workers/me"),
        api.get("/bookings"),
      ]);
      if (profRes.data?.success && profRes.data.worker) {
        const w = profRes.data.worker;
        const online = w.onlineStatus ?? w.online_status;
        const avail = w.availabilityStatus ?? w.availability_status;
        setIsOnline(online === true || online === "ONLINE" || avail === "AVAILABLE");
      }
      if (bookRes.data?.success) setBookings(bookRes.data.bookings || []);
    } catch (err: any) {
      console.error("Worker load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleToggleOnline = async (value: boolean) => {
    setIsOnline(value);
    try {
      let lat = 23.2599;
      let lon = 77.4126;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }
      } catch (locErr) {
        console.warn("Location fetch note:", locErr);
      }

      await api.put("/workers/status", {
        onlineStatus: value,
        availabilityStatus: value ? "AVAILABLE" : "OFFLINE",
        latitude: lat,
        longitude: lon,
      });

      if (value) {
        await api.put("/workers/location", { latitude: lat, longitude: lon });
      }
    } catch (err: any) {
      Alert.alert("Status Error", err.response?.data?.message || "Failed to update status.");
      setIsOnline(!value);
    }
  };

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    setActionLoadingId(bookingId);
    try {
      const res = await api.put(`/bookings/${bookingId}/status`, { status });
      if (res.data?.success) {
        Alert.alert("Updated", `Booking updated to ${status}.`);
        loadWorkerData();
      }
    } catch (err: any) {
      Alert.alert("Update Failed", err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const pending = bookings.filter((b) => (b.booking_status || b.status) === "PENDING").length;
  const active = bookings.filter((b) => ["IN_PROGRESS", "ACCEPTED", "ARRIVING", "STARTED"].includes(b.booking_status || b.status)).length;
  const completed = bookings.filter((b) => (b.booking_status || b.status) === "COMPLETED").length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadWorkerData(); }}
          tintColor="#075c31"
        />
      }
    >
      {/* Online toggle — like worker-dashboard status panel */}
      <View style={styles.statusCard}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? "#10B981" : "#94A3B8" }]} />
          <View>
            <Text style={styles.statusTitle}>{isOnline ? "You Are ONLINE" : "You Are OFFLINE"}</Text>
            <Text style={styles.statusSubtitle}>
              {isOnline ? "Visible to customers within search radius" : "Not receiving on-demand requests"}
            </Text>
          </View>
        </View>
        <Switch
          value={isOnline}
          onValueChange={handleToggleOnline}
          trackColor={{ false: "#CBD5E1", true: "#6EE7B7" }}
          thumbColor={isOnline ? "#075c31" : "#F1F5F9"}
        />
      </View>

      {/* Metrics row — .admin-summary-card style */}
      <View style={styles.metricsRow}>
        {[
          { label: "New Requests", val: pending, color: "#102a1c" },
          { label: "Active Jobs", val: active, color: "#102a1c" },
          { label: "Completed", val: completed, color: "#076332" },
        ].map((m) => (
          <View key={m.label} style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: m.color }]}>{m.val}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Incoming Bookings */}
      <Text style={styles.eyebrow}>INCOMING REQUESTS</Text>
      <Text style={styles.sectionHeading}>Booking Requests</Text>

      {loading ? (
        <ActivityIndicator size="small" color="#075c31" style={{ marginVertical: 20 }} />
      ) : bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 32 }}>🔔</Text>
          <Text style={styles.emptyText}>No customer bookings assigned yet.</Text>
        </View>
      ) : (
        bookings.map((b) => (
          <View key={b.id} style={styles.workerCard}>
            {/* Job header */}
            <View style={styles.jobHeader}>
              <View>
                <Text style={styles.customerName}>{b.customer_name || "Customer"}</Text>
                <Text style={styles.customerPhone}>{b.customer_phone || "Contact via App"}</Text>
              </View>
              <View style={getStatusBadgeStyle(b.status).container}>
                <Text style={getStatusBadgeStyle(b.status).text}>{b.status}</Text>
              </View>
            </View>

            {b.description && (
              <Text style={styles.desc}>"{b.description}"</Text>
            )}

            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={13} color="#61726a" />
              <Text style={styles.locText} numberOfLines={1}>
                {b.address || "Customer delivery address"}
              </Text>
            </View>

            {/* Actions — .admin-actions row */}
            {b.status === "PENDING" && (
              <View style={styles.adminActions}>
                <Pressable
                  style={({ pressed }) => [styles.btnDanger, styles.actionBtn, pressed && styles.btnDangerHover]}
                  onPress={() => handleStatusUpdate(b.id, "REJECTED")}
                  disabled={actionLoadingId === b.id}
                >
                  <Text style={styles.btnDangerText}>Decline</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.btnPrimary, styles.actionBtn, pressed && styles.btnPrimaryHover]}
                  onPress={() => handleStatusUpdate(b.id, "ACCEPTED")}
                  disabled={actionLoadingId === b.id}
                >
                  <Text style={styles.btnPrimaryText}>Accept Request</Text>
                </Pressable>
              </View>
            )}

            {b.status === "ACCEPTED" && (
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, { marginTop: 10 }, pressed && styles.btnPrimaryHover]}
                onPress={() => handleStatusUpdate(b.id, "IN_PROGRESS")}
                disabled={actionLoadingId === b.id}
              >
                <Ionicons name="play" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.btnPrimaryText}>Start Service Job</Text>
              </Pressable>
            )}

            {b.status === "IN_PROGRESS" && (
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, { marginTop: 10 }, pressed && styles.btnPrimaryHover]}
                onPress={() => handleStatusUpdate(b.id, "COMPLETED")}
                disabled={actionLoadingId === b.id}
              >
                <Ionicons name="checkmark-done" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.btnPrimaryText}>Mark Job Completed</Text>
              </Pressable>
            )}
          </View>
        ))
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

function getStatusBadgeStyle(status: string) {
  if (status === "COMPLETED") return {
    container: { backgroundColor: "#ddf2e4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    text: { color: "#076332", fontSize: 11, fontWeight: "700" as const },
  };
  if (status === "REJECTED") return {
    container: { backgroundColor: "#fee4e2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    text: { color: "#a61b1b", fontSize: 11, fontWeight: "700" as const },
  };
  if (status === "IN_PROGRESS") return {
    container: { backgroundColor: "#fff3cf", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    text: { color: "#8b5c00", fontSize: 11, fontWeight: "700" as const },
  };
  return {
    container: { backgroundColor: "#effaf3", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    text: { color: "#075c31", fontSize: 11, fontWeight: "700" as const },
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#effaf3", padding: 16 },
  // Status card
  statusCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    marginBottom: 16,
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 3,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  statusTitle: { fontSize: 14, fontWeight: "700", color: "#102a1c" },
  statusSubtitle: { fontSize: 11, color: "#61726a", marginTop: 2 },
  // Metrics — .admin-summary-card
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 2,
  },
  metricVal: { fontSize: 28, fontWeight: "800", color: "#102a1c" },
  metricLabel: { fontSize: 11, color: "#61726a", fontWeight: "700", marginTop: 4, textAlign: "center" },
  eyebrow: { color: "#08713d", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 },
  sectionHeading: { fontSize: 20, fontWeight: "800", color: "#102a1c", marginBottom: 14 },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e8e3",
  },
  emptyText: { fontSize: 13, color: "#61726a", marginTop: 8, textAlign: "center" },
  // .worker-card
  workerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    marginBottom: 12,
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 2,
  },
  jobHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  customerName: { fontSize: 15, fontWeight: "700", color: "#102a1c" },
  customerPhone: { fontSize: 12, color: "#61726a", marginTop: 2 },
  desc: { fontSize: 13, color: "#334155", fontStyle: "italic", marginVertical: 8 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  locText: { fontSize: 12, color: "#61726a", flex: 1 },
  // admin-actions
  adminActions: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 8 },
  actionBtn: { flex: 1, minHeight: 40 },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 20,
    backgroundColor: "#075c31",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
  },
  btnPrimaryHover: { backgroundColor: "#064a28" },
  btnPrimaryText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  // .btn-danger
  btnDanger: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#dba2a2",
  },
  btnDangerHover: { backgroundColor: "#b42318", borderColor: "#b42318" },
  btnDangerText: { color: "#a61b1b", fontWeight: "800", fontSize: 13 },
});
