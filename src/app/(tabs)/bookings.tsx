import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadBookings();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function loadBookings() {
    setLoading(true);
    try {
      const res = await api.get("/bookings");
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
      }
    } catch (err: any) {
      console.warn("Bookings status note:", err?.response?.data?.message || err?.message || err);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    if (user) {
      loadBookings();
    } else {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centerBox}>
        <View style={styles.guestCard}>
          <View style={styles.guestIconBox}>
            <Ionicons name="lock-closed" size={32} color="#075c31" />
          </View>
          <Text style={styles.eyebrow}>SIGN IN REQUIRED</Text>
          <Text style={styles.guestTitle}>Sign in to view your bookings</Text>
          <Text style={styles.guestSubtitle}>
            Track your active service appointments, live worker arrivals, and work history.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryHover]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.btnPrimaryText}>Sign In / Register</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#075c31" />}
    >
      {user?.role === "ADMIN" && (
        <Pressable
          style={({ pressed }) => [styles.adminBanner, pressed && { opacity: 0.85 }]}
          onPress={() => router.push("/admin-portal")}
        >
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.adminBannerTitle}>Administrator Security Overview</Text>
            <Text style={styles.adminBannerSubtitle}>Tap to inspect audit logs, workers & security alerts</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>
      )}

      <View style={styles.header}>
        <Text style={styles.eyebrow}>CUSTOMER DASHBOARD</Text>
        <Text style={styles.title}>Your Appointments</Text>
        <Text style={styles.subtitle}>
          Real-time tracking and job progress
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#075c31" />
          <Text style={styles.loadingText}>Fetching your bookings...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.guestIconBox}>
            <Ionicons name="calendar-outline" size={36} color="#075c31" />
          </View>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyText}>
            Find a verified technician or service worker on the home tab to schedule an appointment.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, { marginTop: 16 }, pressed && styles.btnPrimaryHover]}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.btnPrimaryText}>Find Services Nearby</Text>
          </Pressable>
        </View>
      ) : (
        bookings.map((b) => {
          const rawStatus = b.booking_status || b.status || "PENDING";
          let statusColor = "#076332";
          let statusBg = "#ddf2e4";

          if (rawStatus === "PENDING") {
            statusColor = "#8b5c00";
            statusBg = "#fff3cf";
          } else if (rawStatus === "CANCELLED" || rawStatus === "REJECTED") {
            statusColor = "#a61b1b";
            statusBg = "#fee4e2";
          }

          return (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{b.service_name || "Home Service"}</Text>
                  <Text style={styles.workerName}>Worker: {b.worker_name || "Assigned Pro"}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {rawStatus}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={14} color="#61726a" />
                  <Text style={styles.detailText}>
                    {new Date(b.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={14} color="#61726a" />
                  <Text style={styles.detailText}>
                    ₹{b.total_amount || b.estimated_price || b.minimum_charge || 250}
                  </Text>
                </View>
              </View>

              {b.service_description || b.description ? (
                <Text style={styles.descText} numberOfLines={2}>
                  "{b.service_description || b.description}"
                </Text>
              ) : null}

              {(rawStatus === "IN_PROGRESS" || rawStatus === "ARRIVING" || rawStatus === "STARTED") && (
                <View style={styles.liveBanner}>
                  <Ionicons name="radio" size={16} color="#076332" />
                  <Text style={styles.liveText}>
                    Job in progress • Worker on site or en route
                  </Text>
                </View>
              )}
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#effaf3",
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    color: "#08713d",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#102a1c",
  },
  subtitle: {
    fontSize: 13,
    color: "#61726a",
    marginTop: 2,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#effaf3",
  },
  guestCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 3,
  },
  guestIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e4f4e8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102a1c",
    marginBottom: 6,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 13,
    color: "#61726a",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  adminBanner: {
    backgroundColor: "#064a28",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  adminBannerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  adminBannerSubtitle: {
    color: "#d6e5d8",
    fontSize: 11,
    marginTop: 2,
  },
  btnPrimary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 24,
    backgroundColor: "#075c31",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
    width: "100%",
  },
  btnPrimaryHover: {
    backgroundColor: "#064a28",
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  centerLoading: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#61726a",
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginTop: 10,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102a1c",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#61726a",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    marginBottom: 12,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102a1c",
  },
  workerName: {
    fontSize: 13,
    color: "#61726a",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  detailsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#edf2ee",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#61726a",
    fontWeight: "600",
  },
  descText: {
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
    marginTop: 8,
  },
  liveBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ddf2e4",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  liveText: {
    fontSize: 12,
    color: "#076332",
    fontWeight: "700",
  },
});
