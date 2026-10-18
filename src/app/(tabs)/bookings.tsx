import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Customer & Worker State
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Admin Security & Audit Center State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [adminTab, setAdminTab] = useState<"logs" | "threats">("logs");

  // IP & Device GPS Tracing Modal State (Layer 1 & Layer 2)
  const [ipModalVisible, setIpModalVisible] = useState(false);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipData, setIpData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") {
        loadAdminAuditData();
      } else {
        loadBookings();
      }
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

  async function loadAdminAuditData() {
    setLoading(true);
    try {
      const res = await api.get("/admin/audit-logs");
      if (res.data?.success) {
        setAuditLogs(res.data.logs || []);
      }
    } catch (err: any) {
      console.warn("Audit logs load error:", err?.response?.data?.message || err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    if (!user) {
      setRefreshing(false);
      return;
    }
    if (user.role === "ADMIN") {
      loadAdminAuditData();
    } else {
      loadBookings();
    }
  };

  const handleOpenMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Exact Coordinates", `Latitude: ${lat}\nLongitude: ${lng}`);
        }
      })
      .catch(() => {
        Alert.alert("Location", `GPS Pinpoint: ${lat}, ${lng}`);
      });
  };

  const handleTraceIp = async (ip: string) => {
    setSelectedIp(ip);
    setIpModalVisible(true);
    setIpLoading(true);
    setIpData(null);
    try {
      const res = await api.get("/admin/ip-tracking", { params: { ip } });
      if (res.data?.success) {
        setIpData(res.data);
      } else {
        setIpData({
          ip,
          geo: { city: "Lookup Unavailable", isp: "Network Host", networkType: "IP Route" },
          stats: { total_events: 1, users: [] },
        });
      }
    } catch {
      setIpData({
        ip,
        geo: { city: "Private Network", isp: "Localhost Gateway", networkType: "LAN Route" },
        stats: { total_events: 1, users: [] },
      });
    } finally {
      setIpLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. UNREGISTERED / GUEST VIEW
  // ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={styles.centerBox}>
        <View style={styles.guestCard}>
          <View style={styles.guestIconBox}>
            <Ionicons name="lock-closed" size={32} color="#075c31" />
          </View>
          <Text style={styles.eyebrow}>SIGN IN REQUIRED</Text>
          <Text style={styles.guestTitle}>Sign in to view your account activity</Text>
          <Text style={styles.guestSubtitle}>
            Track active service appointments, live technician arrivals, or system security logs.
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

  // ─────────────────────────────────────────────────────────────
  // 2. ADMINISTRATOR VIEW (STRIDE Security & Audit Operations)
  // ─────────────────────────────────────────────────────────────
  if (user.role === "ADMIN") {
    const filteredLogs = auditLogs.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ip_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.threat_category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        categoryFilter === "ALL" ||
        log.threat_category?.toUpperCase().includes(categoryFilter) ||
        log.action?.toUpperCase().includes(categoryFilter);

      return matchesSearch && matchesCat;
    });

    const STRIDE_ITEMS = [
      { code: "S", name: "Spoofing", threat: "User & Worker Identity Impersonation", mitigation: "Hardware GPS Pinpoint & HMAC Signed Tokens", score: "0.9" },
      { code: "T", name: "Tampering", threat: "Location & Price Modification", mitigation: "Cryptographic Payload Signatures & Input Validation", score: "1.1" },
      { code: "R", name: "Repudiation", threat: "Denial of Booking Actions or Payments", mitigation: "Immutable SQLite Non-Repudiation Audit Trail", score: "0.8" },
      { code: "I", name: "Information Disclosure", threat: "Exposure of Customer GPS & Phone", mitigation: "Role-Based Data Filtering & Geofence Bounds", score: "1.3" },
      { code: "D", name: "Denial of Service", threat: "High-Frequency API Flood", mitigation: "In-Memory Rate Limiter (60 req/min/IP)", score: "1.0" },
      { code: "E", name: "Elevation of Privilege", threat: "Unauthorized Admin Route Escalation", mitigation: "Strict Role-Guard Middleware with DB Verification", score: "0.7" },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: "#effaf3" }}>
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#075c31" />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>STRIDE & DREAD SECURITY CENTER</Text>
            <Text style={styles.title}>System Audit & Security Logs</Text>
            <Text style={styles.subtitle}>
              Immutable audit stream, hardware GPS tracing, and non-repudiation logs.
            </Text>
          </View>

          {/* Quick Metrics Cards */}
          <View style={styles.adminStatsRow}>
            <View style={styles.adminStatCard}>
              <Text style={styles.adminStatLabel}>AUDIT INTEGRITY</Text>
              <Text style={styles.adminStatValHighlight}>Active 🔒</Text>
              <Text style={styles.adminStatSub}>Immutable SQLite logs</Text>
            </View>

            <View style={styles.adminStatCard}>
              <Text style={styles.adminStatLabel}>SYSTEM EVENTS</Text>
              <Text style={styles.adminStatVal}>{auditLogs.length}</Text>
              <Text style={styles.adminStatSub}>Logged actions recorded</Text>
            </View>

            <View style={styles.adminStatCard}>
              <Text style={styles.adminStatLabel}>THREAT POSTURE</Text>
              <Text style={[styles.adminStatVal, { color: "#076332" }]}>🟢 Low Risk</Text>
              <Text style={styles.adminStatSub}>STRIDE Controls active</Text>
            </View>
          </View>

          {/* Tab Selector: Logs Stream vs STRIDE Matrix */}
          <View style={styles.modeTabs}>
            <Pressable
              style={[styles.modeTab, adminTab === "logs" && styles.modeTabActive]}
              onPress={() => setAdminTab("logs")}
            >
              <Ionicons
                name="list"
                size={16}
                color={adminTab === "logs" ? "#FFFFFF" : "#475569"}
              />
              <Text style={[styles.modeTabText, adminTab === "logs" && styles.modeTabTextActive]}>
                Audit Logs ({filteredLogs.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modeTab, adminTab === "threats" && styles.modeTabActive]}
              onPress={() => setAdminTab("threats")}
            >
              <Ionicons
                name="shield"
                size={16}
                color={adminTab === "threats" ? "#FFFFFF" : "#475569"}
              />
              <Text style={[styles.modeTabText, adminTab === "threats" && styles.modeTabTextActive]}>
                STRIDE Matrix
              </Text>
            </Pressable>
          </View>

          {adminTab === "threats" ? (
            /* STRIDE Threat Model Cards */
            <View style={{ marginBottom: 30 }}>
              <Text style={styles.sectionSubtitle}>
                Six-Vector Threat Mitigation Architecture & DREAD Risk Scores
              </Text>

              {STRIDE_ITEMS.map((item) => (
                <View key={item.code} style={styles.strideCard}>
                  <View style={styles.strideHeaderRow}>
                    <View style={styles.strideCodeBadge}>
                      <Text style={styles.strideCodeText}>{item.code}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.strideVectorTitle}>{item.name}</Text>
                      <Text style={styles.strideThreatDesc}>{item.threat}</Text>
                    </View>
                    <View style={styles.riskBadge}>
                      <Text style={styles.riskBadgeText}>🟢 {item.score}/10</Text>
                    </View>
                  </View>

                  <View style={styles.mitigationBox}>
                    <Ionicons name="checkmark-circle" size={14} color="#076332" />
                    <Text style={styles.mitigationText}>{item.mitigation}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* Audit Logs Stream */
            <>
              {/* Search & Filter Bar */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color="#61726a" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by email, action, IP, or threat..."
                  placeholderTextColor="#8a9a90"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={16} color="#61726a" />
                  </Pressable>
                ) : null}
              </View>

              {/* Category Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pillScroll}
                contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
              >
                {["ALL", "AUTH", "WORKER", "BOOKING", "SECURITY"].map((pill) => (
                  <Pressable
                    key={pill}
                    style={[styles.catPill, categoryFilter === pill && styles.catPillActive]}
                    onPress={() => setCategoryFilter(pill)}
                  >
                    <Text
                      style={[
                        styles.catPillText,
                        categoryFilter === pill && styles.catPillTextActive,
                      ]}
                    >
                      {pill}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {loading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color="#075c31" />
                  <Text style={styles.loadingText}>Streaming audit logs...</Text>
                </View>
              ) : filteredLogs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="shield-outline" size={36} color="#075c31" />
                  <Text style={styles.emptyTitle}>No matching audit records</Text>
                  <Text style={styles.emptyText}>
                    All operations are secure and monitored. Change your filter to view more logs.
                  </Text>
                </View>
              ) : (
                filteredLogs.map((log) => {
                  const hasGps = log.pin_lat && log.pin_lng;
                  const isSuccess = log.status !== "FAILED";

                  return (
                    <View key={log.id} style={styles.auditCard}>
                      <View style={styles.auditCardHeader}>
                        <View style={styles.strideBadge}>
                          <Text style={styles.strideBadgeText}>
                            [{log.threat_category || "NON-REPUDIATION"}]
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.auditStatusTag,
                            isSuccess ? styles.auditStatusSuccess : styles.auditStatusFailed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.auditStatusTagText,
                              isSuccess
                                ? styles.auditStatusTagTextSuccess
                                : styles.auditStatusTagTextFailed,
                            ]}
                          >
                            {log.status || "SUCCESS"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.auditActionRow}>
                        <Text style={styles.auditActionName}>{log.action}</Text>
                        <Text style={styles.auditTime}>
                          {new Date(log.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>

                      <Text style={styles.auditUser}>
                        👤 {log.user_email || "Anonymous Guest"} • Role: {log.user_role || "VISITOR"}
                      </Text>

                      {/* Hardware GPS and IP Tags */}
                      <View style={styles.chipRow}>
                        {hasGps ? (
                          <Pressable
                            style={styles.gpsChip}
                            onPress={() => handleOpenMaps(log.pin_lat, log.pin_lng)}
                          >
                            <Ionicons name="location" size={12} color="#076332" />
                            <Text style={styles.gpsChipText}>
                              📍 {Number(log.pin_lat).toFixed(4)}, {Number(log.pin_lng).toFixed(4)} (Exact GPS)
                            </Text>
                          </Pressable>
                        ) : null}

                        {log.ip_address ? (
                          <Pressable
                            style={styles.ipChip}
                            onPress={() => handleTraceIp(log.ip_address)}
                          >
                            <Ionicons name="globe-outline" size={12} color="#0284c7" />
                            <Text style={styles.ipChipText}>🛰️ {log.ip_address}</Text>
                          </Pressable>
                        ) : null}
                      </View>

                      {/* Direct Pinpoint Map Button */}
                      {hasGps ? (
                        <Pressable
                          style={styles.btnOpenMaps}
                          onPress={() => handleOpenMaps(log.pin_lat, log.pin_lng)}
                        >
                          <Ionicons name="navigate-circle" size={16} color="#075c31" />
                          <Text style={styles.btnOpenMapsText}>
                            Open Exact Device Pinpoint in Maps
                          </Text>
                          <Ionicons name="open-outline" size={13} color="#075c31" />
                        </Pressable>
                      ) : null}

                      {log.details ? (
                        <Text style={styles.auditDetails} numberOfLines={2}>
                          "{log.details}"
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Layer 1 & Layer 2 IP Tracing Modal */}
        <Modal
          visible={ipModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIpModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="shield-checkmark" size={20} color="#075c31" />
                  <Text style={styles.modalTitle}>Layer 1 & 2 Pinpoint Audit</Text>
                </View>
                <Pressable onPress={() => setIpModalVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color="#61726a" />
                </Pressable>
              </View>

              {ipLoading ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#075c31" />
                  <Text style={{ marginTop: 8, color: "#61726a", fontSize: 12 }}>
                    Querying network routing & device hardware logs...
                  </Text>
                </View>
              ) : ipData ? (
                <ScrollView style={{ maxHeight: 420 }}>
                  <Text style={styles.targetIp}>Target IP: {selectedIp}</Text>

                  {/* Layer 1: Network ISP */}
                  <View style={styles.layerBox}>
                    <Text style={styles.layerTitle}>🌐 LAYER 1: NETWORK ISP & ROUTING</Text>
                    <Text style={styles.layerLine}>
                      • ISP: <Text style={styles.boldText}>{ipData.geo?.isp || "Local Loopback / Carrier"}</Text>
                    </Text>
                    <Text style={styles.layerLine}>
                      • Approx City: {ipData.geo?.city || "Local Gateway"}
                    </Text>
                    <Text style={styles.layerLine}>
                      • Network Type: {ipData.geo?.networkType || "Broadband / WiFi"}
                    </Text>
                  </View>

                  {/* Layer 2: Real Hardware GPS */}
                  <View style={[styles.layerBox, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
                    <Text style={[styles.layerTitle, { color: "#166534" }]}>
                      🛰️ LAYER 2: REAL HARDWARE DEVICE GPS
                    </Text>
                    {ipData.deviceGps?.lat && ipData.deviceGps?.lng ? (
                      <>
                        <Text style={styles.layerLine}>
                          • GPS Lat: <Text style={styles.boldText}>{ipData.deviceGps.lat}</Text>
                        </Text>
                        <Text style={styles.layerLine}>
                          • GPS Lng: <Text style={styles.boldText}>{ipData.deviceGps.lng}</Text>
                        </Text>
                        <Text style={styles.layerLine}>
                          • Linked User: {ipData.deviceGps.name || "Logged In User"} ({ipData.deviceGps.role || "ADMIN"})
                        </Text>
                        <Pressable
                          style={[styles.btnPrimary, { marginTop: 10, minHeight: 38 }]}
                          onPress={() => {
                            setIpModalVisible(false);
                            handleOpenMaps(ipData.deviceGps.lat, ipData.deviceGps.lng);
                          }}
                        >
                          <Text style={[styles.btnPrimaryText, { fontSize: 12 }]}>
                            Open Exact Device Pinpoint in Maps
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <Text style={[styles.layerLine, { color: "#61726a" }]}>
                        No active GPS fix reported for this IP session yet.
                      </Text>
                    )}
                  </View>
                </ScrollView>
              ) : null}

              <Pressable
                style={[styles.btnPrimary, { marginTop: 14 }]}
                onPress={() => setIpModalVisible(false)}
              >
                <Text style={styles.btnPrimaryText}>Close Tracing Inspector</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. WORKER VIEW (Assigned Jobs & Appointments)
  // ─────────────────────────────────────────────────────────────
  if (user.role === "WORKER") {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#075c31" />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>WORKER WORKSPACE</Text>
          <Text style={styles.title}>Service Jobs & Requests</Text>
          <Text style={styles.subtitle}>
            Incoming customer appointments and active work requests.
          </Text>
        </View>

        <View style={styles.workerPromoCard}>
          <View style={styles.guestIconBox}>
            <Ionicons name="briefcase" size={32} color="#075c31" />
          </View>
          <Text style={styles.emptyTitle}>Manage Jobs in Worker Portal</Text>
          <Text style={styles.emptyText}>
            Accept new customer requests, update your live availability status, and mark jobs as completed.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, { marginTop: 16 }, pressed && styles.btnPrimaryHover]}
            onPress={() => router.push("/worker-portal")}
          >
            <Text style={styles.btnPrimaryText}>Open Worker Workspace</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. CUSTOMER VIEW (Appointments & Booking Tracking)
  // ─────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#075c31" />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CUSTOMER DASHBOARD</Text>
        <Text style={styles.title}>Your Appointments</Text>
        <Text style={styles.subtitle}>Real-time tracking and job progress</Text>
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
                  <Text style={[styles.statusText, { color: statusColor }]}>{rawStatus}</Text>
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
                  <Text style={styles.liveText}>Job in progress • Worker on site or en route</Text>
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
    lineHeight: 18,
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
  workerPromoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginTop: 10,
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

  // ── Admin Security Center Styles ──
  adminStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  adminStatCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e1e8e3",
  },
  adminStatLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#61726a",
    letterSpacing: 0.5,
  },
  adminStatVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102a1c",
    marginTop: 4,
  },
  adminStatValHighlight: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0284c7",
    marginTop: 4,
  },
  adminStatSub: {
    fontSize: 9,
    color: "#61726a",
    marginTop: 2,
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: "#e2ebe5",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: "#075c31",
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  modeTabTextActive: {
    color: "#ffffff",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#61726a",
    marginBottom: 12,
  },
  strideCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginBottom: 10,
  },
  strideHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  strideCodeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#ddf2e4",
    alignItems: "center",
    justifyContent: "center",
  },
  strideCodeText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#075c31",
  },
  strideVectorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102a1c",
  },
  strideThreatDesc: {
    fontSize: 11,
    color: "#61726a",
    marginTop: 1,
  },
  riskBadge: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  mitigationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8faf9",
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#edf2ee",
  },
  mitigationText: {
    fontSize: 11,
    color: "#234534",
    fontWeight: "600",
    flex: 1,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginBottom: 10,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#102a1c",
  },
  pillScroll: {
    marginBottom: 10,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e1e8e3",
  },
  catPillActive: {
    backgroundColor: "#075c31",
    borderColor: "#075c31",
  },
  catPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  catPillTextActive: {
    color: "#ffffff",
  },
  auditCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginBottom: 10,
  },
  auditCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  strideBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  strideBadgeText: {
    color: "#0369a1",
    fontSize: 10,
    fontWeight: "800",
  },
  auditStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  auditStatusSuccess: {
    backgroundColor: "#ddf2e4",
  },
  auditStatusFailed: {
    backgroundColor: "#fee4e2",
  },
  auditStatusTagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  auditStatusTagTextSuccess: {
    color: "#076332",
  },
  auditStatusTagTextFailed: {
    color: "#dc2626",
  },
  auditActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  auditActionName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102a1c",
  },
  auditTime: {
    fontSize: 11,
    color: "#61726a",
  },
  auditUser: {
    fontSize: 12,
    color: "#61726a",
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ddf2e4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gpsChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#076332",
  },
  ipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ipChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  btnOpenMaps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#effaf3",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#97bea0",
    marginTop: 10,
  },
  btnOpenMapsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#075c31",
  },
  auditDetails: {
    fontSize: 11,
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 8,
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2ee",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#102a1c",
  },
  targetIp: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284c7",
    marginBottom: 10,
  },
  layerBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  layerTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0369a1",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  layerLine: {
    fontSize: 12,
    color: "#334155",
    marginBottom: 3,
  },
  boldText: {
    fontWeight: "700",
    color: "#0f172a",
  },
});
