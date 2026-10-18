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
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { C, RADIUS, SHADOW } from "../constants/theme";

export default function WorkerPortalScreen() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<{ [id: string]: boolean }>({});
  const [gpsFix, setGpsFix] = useState<string>("Acquiring GPS fix...");

  useEffect(() => {
    loadWorkerData();
  }, []);

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

        if (w.latitude && w.longitude) {
          setGpsFix(`${Number(w.latitude).toFixed(4)}°N, ${Number(w.longitude).toFixed(4)}°E`);
        }
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
          setGpsFix(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
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
        Alert.alert("Status Transition", `Booking moved to ${status}.`);
        loadWorkerData();
      }
    } catch (err: any) {
      Alert.alert("Transition Failed", err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Coordinates", `Latitude: ${lat}\nLongitude: ${lng}`);
    });
  };

  const toggleJob = (id: string) => {
    setExpandedJobs((prev) => ({ ...prev, [id]: !prev[id] }));
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
          tintColor={C.brand}
        />
      }
    >
      {/* ── Enterprise Header: GPS Broadcast Status ── */}
      <View style={styles.gpsBar}>
        <View style={[styles.gpsDotPulse, { backgroundColor: isOnline ? "#10b981" : C.slate400 }]} />
        <Ionicons name="hardware-chip-outline" size={14} color={C.brand} />
        <Text style={styles.gpsBarText} numberOfLines={1}>
          GPS Broadcast: {isOnline ? `Active • ${gpsFix}` : "Suspended (Offline)"}
        </Text>
      </View>

      <View style={styles.contentWrap}>
        {/* Screen Title */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>WORKER DASHBOARD</Text>
          <Text style={styles.heroTitle}>Operational Dispatch Terminal</Text>
          <Text style={styles.heroSubtitle}>
            Broadcast live hardware GPS, manage availability state, and accept incoming service appointments.
          </Text>
        </View>

        {/* High-Density Availability Status Card */}
        <View style={[styles.statusCard, isOnline && styles.statusCardOnline]}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? "#10b981" : C.slate400 }]} />
            <View>
              <Text style={styles.statusTitle}>
                {isOnline ? "ONLINE & AVAILABLE" : "CURRENTLY OFFLINE"}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isOnline ? "Broadcasting live GPS to customers in geofence" : "Not receiving on-demand customer dispatches"}
              </Text>
            </View>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: C.slate200, true: "#a7f3d0" }}
            thumbColor={isOnline ? C.brand : "#f8fafc"}
          />
        </View>

        {/* High-Density KPI Metrics Row */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: "#b45309" }]}>
            <Text style={styles.kpiLabel}>NEW DISPATCHES</Text>
            <Text style={[styles.kpiValue, { color: pending > 0 ? "#b45309" : C.slate900 }]}>{pending}</Text>
            <Text style={styles.kpiSub}>Awaiting acceptance</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: C.brand }]}>
            <Text style={styles.kpiLabel}>ACTIVE JOBS</Text>
            <Text style={[styles.kpiValue, { color: C.brand }]}>{active}</Text>
            <Text style={styles.kpiSub}>In progress / travelling</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#15803d" }]}>
            <Text style={styles.kpiLabel}>COMPLETED</Text>
            <Text style={[styles.kpiValue, { color: "#15803d" }]}>{completed}</Text>
            <Text style={styles.kpiSub}>Finished jobs</Text>
          </View>
        </View>

        {/* Incoming Bookings Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.eyebrow}>DISPATCH QUEUE</Text>
          <Text style={styles.sectionTitle}>Customer Job Requests ({bookings.length})</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={C.brand} />
            <Text style={styles.loadingText}>Loading assigned jobs...</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-outline" size={32} color={C.slate400} />
            <Text style={styles.emptyTitle}>No service requests in queue</Text>
            <Text style={styles.emptySub}>
              Ensure your availability toggle is switched to ONLINE and keep your device GPS enabled to receive nearby job dispatches.
            </Text>
          </View>
        ) : (
          bookings.map((b) => {
            const isExpanded = !!expandedJobs[b.id];
            const rawStatus = b.booking_status || b.status || "PENDING";
            const hasCustomerGps = b.customer_latitude && b.customer_longitude;

            let statusColor = "#15803d";
            let statusBg = "#dcfce7";
            if (rawStatus === "PENDING") {
              statusColor = "#b45309";
              statusBg = "#fef3c7";
            } else if (rawStatus === "CANCELLED" || rawStatus === "REJECTED") {
              statusColor = "#b91c1c";
              statusBg = "#fee2e2";
            }

            return (
              <View key={b.id} style={styles.jobCard}>
                {/* Compact Header */}
                <Pressable
                  style={styles.jobHeader}
                  onPress={() => toggleJob(b.id)}
                >
                  <View style={styles.avatarPill}>
                    <Ionicons name="person" size={14} color={C.brand} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.customerName}>{b.customer_name || "Customer Request"}</Text>
                    <Text style={styles.customerMeta}>
                      {b.service_name || "Home Service"} • {new Date(b.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusPillText, { color: statusColor }]}>{rawStatus}</Text>
                  </View>

                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={15}
                    color={C.slate500}
                    style={{ marginLeft: 6 }}
                  />
                </Pressable>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.jobBody}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contact Phone:</Text>
                      <Text style={styles.detailValue}>{b.customer_phone || "Via ProxiFix App"}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Scheduled Date:</Text>
                      <Text style={styles.detailValue}>{new Date(b.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Estimated Charge:</Text>
                      <Text style={styles.detailValue}>₹{b.total_amount || b.estimated_price || b.minimum_charge || 250}</Text>
                    </View>

                    {b.service_description || b.description ? (
                      <View style={styles.descBox}>
                        <Text style={styles.descLabel}>CUSTOMER NOTE:</Text>
                        <Text style={styles.descText}>
                          "{String(b.service_description || b.description)}"
                        </Text>
                      </View>
                    ) : null}

                    {/* Customer GPS Pinpoint Chip */}
                    {hasCustomerGps && (
                      <Pressable
                        style={styles.gpsChip}
                        onPress={() => handleOpenMaps(b.customer_latitude, b.customer_longitude)}
                      >
                        <Ionicons name="location" size={13} color="#047857" />
                        <Text style={styles.gpsChipText}>
                          📍 Customer Location: {Number(b.customer_latitude).toFixed(4)}°, {Number(b.customer_longitude).toFixed(4)}°
                        </Text>
                        <Ionicons name="open-outline" size={12} color="#047857" />
                      </Pressable>
                    )}

                    {/* Operational Action Pipeline */}
                    <View style={styles.pipelineRow}>
                      {rawStatus === "PENDING" && (
                        <>
                          <Pressable
                            style={[styles.btnAction, styles.btnReject]}
                            onPress={() => handleStatusUpdate(b.id, "REJECTED")}
                            disabled={actionLoadingId === b.id}
                          >
                            <Text style={styles.btnRejectText}>Decline</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.btnAction, styles.btnApprove]}
                            onPress={() => handleStatusUpdate(b.id, "ACCEPTED")}
                            disabled={actionLoadingId === b.id}
                          >
                            <Text style={styles.btnApproveText}>Accept Booking</Text>
                          </Pressable>
                        </>
                      )}

                      {rawStatus === "ACCEPTED" && (
                        <Pressable
                          style={[styles.btnAction, styles.btnPrimaryAction]}
                          onPress={() => handleStatusUpdate(b.id, "ARRIVING")}
                          disabled={actionLoadingId === b.id}
                        >
                          <Ionicons name="navigate-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.btnActionText}>Start Travelling (Arriving)</Text>
                        </Pressable>
                      )}

                      {rawStatus === "ARRIVING" && (
                        <Pressable
                          style={[styles.btnAction, styles.btnPrimaryAction]}
                          onPress={() => handleStatusUpdate(b.id, "STARTED")}
                          disabled={actionLoadingId === b.id}
                        >
                          <Ionicons name="play-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.btnActionText}>Start Service Work</Text>
                        </Pressable>
                      )}

                      {rawStatus === "STARTED" && (
                        <Pressable
                          style={[styles.btnAction, styles.btnComplete]}
                          onPress={() => handleStatusUpdate(b.id, "COMPLETED")}
                          disabled={actionLoadingId === b.id}
                        >
                          <Ionicons name="checkmark-done" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.btnActionText}>Mark Service Completed</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bgPage,
  },
  contentWrap: {
    padding: 16,
  },
  gpsBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  gpsDotPulse: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  gpsBarText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "monospace",
    color: C.slate700,
  },
  header: {
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: C.brand,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.slate900,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: C.slate600,
    lineHeight: 18,
  },

  // ── Status Card ──
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    ...SHADOW.card,
  },
  statusCardOnline: {
    borderColor: "#a7f3d0",
    backgroundColor: "#f0fdf4",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.slate900,
  },
  statusSubtitle: {
    fontSize: 11,
    color: C.slate500,
    marginTop: 2,
  },

  // ── KPI Row ──
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    ...SHADOW.card,
  },
  kpiLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: C.slate500,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "900",
    color: C.slate900,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 9,
    color: C.slate500,
    marginTop: 1,
  },

  // ── Section ──
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.slate900,
  },

  // ── Job Accordion Card ──
  jobCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    overflow: "hidden",
    ...SHADOW.card,
  },
  jobHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.xs,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: {
    fontSize: 13,
    fontWeight: "700",
    color: C.slate900,
  },
  customerMeta: {
    fontSize: 11,
    color: C.slate500,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  jobBody: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: C.slate100,
    backgroundColor: C.slate50,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 11,
    color: C.slate500,
  },
  detailValue: {
    fontSize: 11,
    fontWeight: "600",
    color: C.slate800,
  },
  descBox: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.xs,
    padding: 8,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 6,
  },
  descLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: C.slate500,
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 10.5,
    color: C.slate700,
    marginTop: 2,
    fontStyle: "italic",
  },
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginTop: 6,
  },
  gpsChipText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#047857",
    fontWeight: "700",
    flex: 1,
  },

  // ── Actions ──
  pipelineRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  btnAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: RADIUS.xs,
  },
  btnReject: {
    backgroundColor: "#fee2e2",
  },
  btnRejectText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#b91c1c",
  },
  btnApprove: {
    backgroundColor: C.brand,
  },
  btnApproveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnPrimaryAction: {
    backgroundColor: "#0284c7",
  },
  btnComplete: {
    backgroundColor: "#15803d",
  },
  btnActionText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // ── Empty & Loading ──
  loadingBox: {
    padding: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 11,
    color: C.slate500,
  },
  emptyCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.slate800,
    marginTop: 6,
  },
  emptySub: {
    fontSize: 11,
    color: C.slate500,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 16,
  },
});
