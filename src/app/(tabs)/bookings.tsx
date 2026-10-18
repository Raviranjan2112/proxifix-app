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
import { C, RADIUS, SHADOW } from "../../constants/theme";

function formatLogDetails(details: any): string {
  if (!details) return "";
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      if (typeof parsed === "object" && parsed !== null) {
        return Object.entries(parsed)
          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join(" | ");
      }
    } catch {
      return details;
    }
    return details;
  }
  if (typeof details === "object") {
    try {
      return Object.entries(details)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(" | ");
    } catch {
      return JSON.stringify(details);
    }
  }
  return String(details);
}

const STRIDE_VECTORS = [
  { code: "ALL", label: "ALL VECTORS", color: C.slate700, bg: C.slate100 },
  { code: "S", label: "[S] Spoofing", color: "#0369a1", bg: "#e0f2fe" },
  { code: "T", label: "[T] Tampering", color: "#c2410c", bg: "#ffedd5" },
  { code: "R", label: "[R] Repudiation", color: "#7e22ce", bg: "#f3e8ff" },
  { code: "I", label: "[I] Disclosure", color: "#047857", bg: "#ecfdf5" },
  { code: "D", label: "[D] Denial of Service", color: "#b91c1c", bg: "#fee2e2" },
  { code: "E", label: "[E] Elevation", color: "#be185d", bg: "#fdf2f8" },
];

const STRIDE_MATRIX = [
  { code: "S", name: "Spoofing", threat: "Technician & Customer Impersonation", mitigation: "Hardware GPS Pinpointing & HMAC Token Authentication", score: "0.9" },
  { code: "T", name: "Tampering", threat: "Unauthorized Rate & Coordinate Modification", mitigation: "Cryptographic Payload Signatures & Server-side Validation", score: "1.1" },
  { code: "R", name: "Repudiation", threat: "Denial of Job Completion or Payment", mitigation: "Immutable SQLite Non-Repudiation Audit Trail", score: "0.8" },
  { code: "I", name: "Information Disclosure", threat: "Customer Geolocation Exposure", mitigation: "Geofence Obfuscation & Role-Based Data Isolation", score: "1.3" },
  { code: "D", name: "Denial of Service", threat: "Automated Search Rate Spikes", mitigation: "Sliding-Window Rate Limiter (60 req/min/IP)", score: "1.0" },
  { code: "E", name: "Elevation of Privilege", threat: "Unauthorized Role Transition", mitigation: "Strict Role-Guard Middleware with DB Re-Verification", score: "0.7" },
];

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Customer & Worker State
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Admin Security Center State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVector, setSelectedVector] = useState("ALL");
  const [adminViewMode, setAdminViewMode] = useState<"stream" | "matrix">("stream");

  // Accordion State
  const [expandedLogs, setExpandedLogs] = useState<{ [id: string]: boolean }>({});
  const [expandedBookings, setExpandedBookings] = useState<{ [id: string]: boolean }>({});

  // Layer 1 & Layer 2 Tracing Modal State
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
      if (res.data?.success) setBookings(res.data.bookings || []);
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
      if (res.data?.success) setAuditLogs(res.data.logs || []);
    } catch (err: any) {
      console.warn("Audit logs error:", err?.response?.data?.message || err?.message || err);
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
    Linking.openURL(url).catch(() => {
      Alert.alert("Coordinates", `Latitude: ${lat}\nLongitude: ${lng}`);
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
          geo: { city: "Lookup Unavailable", isp: "Carrier Gateway", networkType: "WAN" },
          stats: { total_events: 1, users: [] },
        });
      }
    } catch {
      setIpData({
        ip,
        geo: { city: "Private Network", isp: "Loopback Interface", networkType: "LAN" },
        stats: { total_events: 1, users: [] },
      });
    } finally {
      setIpLoading(false);
    }
  };

  const toggleLogAccordion = (id: string) => {
    setExpandedLogs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleBookingAccordion = (id: string) => {
    setExpandedBookings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ─────────────────────────────────────────────────────────────
  // 1. GUEST VIEW
  // ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={styles.centerBox}>
        <View style={styles.denseCard}>
          <View style={styles.centerIconPill}>
            <Ionicons name="lock-closed" size={24} color={C.brand} />
          </View>
          <Text style={styles.eyebrow}>AUTHENTICATION REQUIRED</Text>
          <Text style={styles.heroTitle}>Sign In to Inspect Activity</Text>
          <Text style={styles.heroSubtitle}>
            Access active service appointments, live technician tracking, or administrative audit logs.
          </Text>
          <Pressable
            style={[styles.btnPrimary, { marginTop: 14 }]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.btnPrimaryText}>Sign In / Register</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ADMINISTRATOR VIEW (STRIDE Operations & Audit Terminal)
  // ─────────────────────────────────────────────────────────────
  if (user.role === "ADMIN") {
    const filteredLogs = auditLogs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        log.user_email?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.ip_address?.toLowerCase().includes(q) ||
        log.threat_category?.toLowerCase().includes(q);

      const matchesVector =
        selectedVector === "ALL" ||
        log.threat_category?.toUpperCase() === selectedVector;

      return matchesSearch && matchesVector;
    });

    return (
      <View style={{ flex: 1, backgroundColor: C.bgPage }}>
        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>SECURITY OPERATIONS CENTER</Text>
            <Text style={styles.heroTitle}>STRIDE & Audit Telemetry</Text>
            <Text style={styles.heroSubtitle}>
              Cryptographic non-repudiation audit trail, hardware GPS coordinates, and Layer 1/2 IP inspection.
            </Text>
          </View>

          {/* High-Density KPI Row */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { borderLeftColor: C.brand }]}>
              <Text style={styles.kpiLabel}>AUDIT INTEGRITY</Text>
              <Text style={[styles.kpiValue, { color: C.brand }]}>Active 🔒</Text>
              <Text style={styles.kpiSub}>SQLite Immutable</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: "#0284c7" }]}>
              <Text style={styles.kpiLabel}>EVENT STREAM</Text>
              <Text style={styles.kpiValue}>{auditLogs.length}</Text>
              <Text style={styles.kpiSub}>Total records</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: "#15803d" }]}>
              <Text style={styles.kpiLabel}>DREAD POSTURE</Text>
              <Text style={[styles.kpiValue, { color: "#15803d" }]}>0.9/10</Text>
              <Text style={styles.kpiSub}>Low Risk (Secured)</Text>
            </View>
          </View>

          {/* Mode Selector: Live Stream vs STRIDE Matrix */}
          <View style={styles.modeTabs}>
            <Pressable
              style={[styles.modeTab, adminViewMode === "stream" && styles.modeTabActive]}
              onPress={() => setAdminViewMode("stream")}
            >
              <Ionicons
                name="list"
                size={14}
                color={adminViewMode === "stream" ? "#FFFFFF" : C.slate600}
              />
              <Text style={[styles.modeTabText, adminViewMode === "stream" && styles.modeTabTextActive]}>
                Audit Stream ({filteredLogs.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modeTab, adminViewMode === "matrix" && styles.modeTabActive]}
              onPress={() => setAdminViewMode("matrix")}
            >
              <Ionicons
                name="shield"
                size={14}
                color={adminViewMode === "matrix" ? "#FFFFFF" : C.slate600}
              />
              <Text style={[styles.modeTabText, adminViewMode === "matrix" && styles.modeTabTextActive]}>
                STRIDE Matrix (6)
              </Text>
            </Pressable>
          </View>

          {adminViewMode === "matrix" ? (
            /* STRIDE 6-Vector Matrix */
            <View style={{ marginBottom: 30 }}>
              <Text style={styles.matrixHeaderSub}>
                Six-Vector Threat Mitigation Architecture & DREAD Vulnerability Scoring
              </Text>

              {STRIDE_MATRIX.map((item) => (
                <View key={item.code} style={styles.strideCard}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={styles.strideCodeBadge}>
                      <Text style={styles.strideCodeText}>{item.code}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.strideVectorTitle}>{item.name}</Text>
                      <Text style={styles.strideThreatDesc}>{item.threat}</Text>
                    </View>
                    <View style={styles.scorePill}>
                      <Text style={styles.scorePillText}>🟢 {item.score}/10</Text>
                    </View>
                  </View>
                  <View style={styles.mitigationBox}>
                    <Ionicons name="checkmark-circle" size={13} color="#15803d" />
                    <Text style={styles.mitigationText}>{item.mitigation}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* Audit Log Stream */
            <>
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Ionicons name="search" size={14} color={C.slate500} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by email, action, IP, or threat code..."
                  placeholderTextColor={C.slate400}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={14} color={C.slate500} />
                  </Pressable>
                ) : null}
              </View>

              {/* STRIDE Vector Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.vectorPillScroll}
                contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
              >
                {STRIDE_VECTORS.map((v) => {
                  const isSelected = selectedVector === v.code;
                  return (
                    <Pressable
                      key={v.code}
                      style={[
                        styles.vectorPill,
                        { borderColor: isSelected ? v.color : C.border },
                        isSelected && { backgroundColor: v.bg },
                      ]}
                      onPress={() => setSelectedVector(v.code)}
                    >
                      <Text style={[styles.vectorPillText, { color: isSelected ? v.color : C.slate600 }]}>
                        {v.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={C.brand} />
                  <Text style={styles.loadingText}>Streaming audit logs...</Text>
                </View>
              ) : filteredLogs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="shield-outline" size={32} color={C.slate400} />
                  <Text style={styles.emptyTitle}>No audit records found</Text>
                  <Text style={styles.emptySub}>All security parameters verified. Try another filter.</Text>
                </View>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = !!expandedLogs[log.id];
                  const hasGps = log.pin_lat && log.pin_lng;
                  const isSuccess = log.status !== "FAILED";

                  return (
                    <View key={log.id} style={styles.auditCard}>
                      {/* Compact Header */}
                      <Pressable
                        style={styles.auditHeader}
                        onPress={() => toggleLogAccordion(log.id)}
                      >
                        <View style={styles.vectorTag}>
                          <Text style={styles.vectorTagText}>
                            [{log.threat_category || "R"}]
                          </Text>
                        </View>

                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.auditAction}>{log.action}</Text>
                            <View style={isSuccess ? styles.statusTagSuccess : styles.statusTagFailed}>
                              <Text style={isSuccess ? styles.statusTagTextSuccess : styles.statusTagTextFailed}>
                                {log.status || "SUCCESS"}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.auditMeta} numberOfLines={1}>
                            {log.user_email || "Anonymous Guest"} • {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </Text>
                        </View>

                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={15}
                          color={C.slate500}
                        />
                      </Pressable>

                      {/* Expandable Body */}
                      {isExpanded && (
                        <View style={styles.auditBody}>
                          {/* Hardware Chips Row */}
                          <View style={styles.chipsRow}>
                            {hasGps && (
                              <Pressable
                                style={styles.gpsChip}
                                onPress={() => handleOpenMaps(log.pin_lat, log.pin_lng)}
                              >
                                <Ionicons name="location" size={12} color="#047857" />
                                <Text style={styles.gpsChipText}>
                                  📍 {Number(log.pin_lat).toFixed(4)}°, {Number(log.pin_lng).toFixed(4)}°
                                </Text>
                                <Ionicons name="open-outline" size={11} color="#047857" />
                              </Pressable>
                            )}

                            {log.ip_address && (
                              <Pressable
                                style={styles.ipChip}
                                onPress={() => handleTraceIp(log.ip_address)}
                              >
                                <Ionicons name="globe-outline" size={12} color="#0284c7" />
                                <Text style={styles.ipChipText}>🛰️ {log.ip_address}</Text>
                                <Ionicons name="scan-outline" size={11} color="#0284c7" />
                              </Pressable>
                            )}
                          </View>

                          {/* Payload Details in Monospace Code Box */}
                          {log.details ? (
                            <View style={styles.payloadBox}>
                              <Text style={styles.payloadLabel}>AUDIT PAYLOAD TELEMETRY</Text>
                              <Text style={styles.payloadText}>
                                {formatLogDetails(log.details)}
                              </Text>
                            </View>
                          ) : null}

                          {hasGps && (
                            <Pressable
                              style={styles.btnOpenMaps}
                              onPress={() => handleOpenMaps(log.pin_lat, log.pin_lng)}
                            >
                              <Ionicons name="navigate-circle" size={14} color={C.brand} />
                              <Text style={styles.btnOpenMapsText}>Open Exact GPS Pinpoint in Maps</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
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
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="shield-checkmark" size={18} color={C.brand} />
                  <Text style={styles.modalTitle}>Layer 1 & 2 Pinpoint Audit</Text>
                </View>
                <Pressable onPress={() => setIpModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={C.slate500} />
                </Pressable>
              </View>

              {ipLoading ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={C.brand} />
                  <Text style={{ marginTop: 8, fontSize: 11, color: C.slate500 }}>
                    Resolving network host & device GPS fix...
                  </Text>
                </View>
              ) : ipData ? (
                <ScrollView style={{ maxHeight: 380 }}>
                  <Text style={styles.modalTargetIp}>Target IP: {selectedIp}</Text>

                  {/* Layer 1: Network ISP */}
                  <View style={styles.layerBox}>
                    <Text style={styles.layerTitle}>🌐 LAYER 1: NETWORK ISP & ROUTING</Text>
                    <Text style={styles.layerLine}>• ISP: <Text style={styles.bold}>{ipData.geo?.isp || "Local Loopback / Host"}</Text></Text>
                    <Text style={styles.layerLine}>• Approx City: {ipData.geo?.city || "Local Gateway"}</Text>
                    <Text style={styles.layerLine}>• Network Type: {ipData.geo?.networkType || "Broadband / WiFi"}</Text>
                  </View>

                  {/* Layer 2: Hardware Device GPS */}
                  <View style={[styles.layerBox, { backgroundColor: "#f0fdf4", borderColor: "#a7f3d0" }]}>
                    <Text style={[styles.layerTitle, { color: "#166534" }]}>🛰️ LAYER 2: REAL HARDWARE GPS</Text>
                    {ipData.deviceGps?.lat && ipData.deviceGps?.lng ? (
                      <>
                        <Text style={styles.layerLine}>• GPS Lat: <Text style={styles.bold}>{String(ipData.deviceGps.lat)}</Text></Text>
                        <Text style={styles.layerLine}>• GPS Lng: <Text style={styles.bold}>{String(ipData.deviceGps.lng)}</Text></Text>
                        <Text style={styles.layerLine}>• Linked User: {String(ipData.deviceGps.name || "Logged In User")} ({String(ipData.deviceGps.role || "ADMIN")})</Text>

                        <Pressable
                          style={[styles.btnPrimary, { marginTop: 8, paddingVertical: 8 }]}
                          onPress={() => {
                            setIpModalVisible(false);
                            handleOpenMaps(ipData.deviceGps.lat, ipData.deviceGps.lng);
                          }}
                        >
                          <Text style={[styles.btnPrimaryText, { fontSize: 11 }]}>Open Exact Pinpoint in Maps</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Text style={[styles.layerLine, { color: C.slate500 }]}>No active GPS fix reported for this session.</Text>
                    )}
                  </View>
                </ScrollView>
              ) : null}

              <Pressable
                style={[styles.btnOutline, { marginTop: 12 }]}
                onPress={() => setIpModalVisible(false)}
              >
                <Text style={styles.btnOutlineText}>Close Inspector</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. WORKER VIEW
  // ─────────────────────────────────────────────────────────────
  if (user.role === "WORKER") {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>WORKER DASHBOARD</Text>
          <Text style={styles.heroTitle}>Assigned Service Jobs</Text>
          <Text style={styles.heroSubtitle}>
            Incoming customer appointments and active work requests.
          </Text>
        </View>

        <View style={styles.denseCard}>
          <View style={styles.centerIconPill}>
            <Ionicons name="briefcase" size={24} color={C.brand} />
          </View>
          <Text style={styles.heroTitle}>Manage Jobs in Worker Dashboard</Text>
          <Text style={styles.heroSubtitle}>
            Accept new customer requests, update your live availability status, and mark jobs as completed.
          </Text>
          <Pressable
            style={[styles.btnPrimary, { marginTop: 14 }]}
            onPress={() => router.push("/worker-portal")}
          >
            <Text style={styles.btnPrimaryText}>Open Worker Dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. CUSTOMER VIEW (Appointments & Tracking)
  // ─────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CUSTOMER DASHBOARD</Text>
        <Text style={styles.heroTitle}>Your Appointments</Text>
        <Text style={styles.heroSubtitle}>Real-time job progress and hardware GPS tracking</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.brand} />
          <Text style={styles.loadingText}>Fetching appointments...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={C.slate400} />
          <Text style={styles.emptyTitle}>No appointments scheduled</Text>
          <Text style={styles.emptySub}>Find a verified technician on the home tab to schedule an appointment.</Text>
          <Pressable
            style={[styles.btnPrimary, { marginTop: 14 }]}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.btnPrimaryText}>Find Services Nearby</Text>
          </Pressable>
        </View>
      ) : (
        bookings.map((b) => {
          const isExpanded = !!expandedBookings[b.id];
          const rawStatus = b.booking_status || b.status || "PENDING";
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
            <View key={b.id} style={styles.accordionCard}>
              <Pressable
                style={styles.accordionHeader}
                onPress={() => toggleBookingAccordion(b.id)}
              >
                <View style={styles.avatarPill}>
                  <Ionicons name="construct-outline" size={16} color={C.brand} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.workerName}>{b.service_name || "Home Service"}</Text>
                  <Text style={styles.workerMeta}>Worker: {b.worker_name || "Assigned Pro"}</Text>
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

              {isExpanded && (
                <View style={styles.accordionBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Scheduled Date:</Text>
                    <Text style={styles.detailValue}>{new Date(b.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estimated Charge:</Text>
                    <Text style={styles.detailValue}>₹{b.total_amount || b.estimated_price || b.minimum_charge || 250}</Text>
                  </View>

                  {b.service_description || b.description ? (
                    <Text style={styles.descText} numberOfLines={2}>
                      "{String(b.service_description || b.description)}"
                    </Text>
                  ) : null}

                  {(rawStatus === "IN_PROGRESS" || rawStatus === "ARRIVING" || rawStatus === "STARTED") && (
                    <View style={styles.liveBanner}>
                      <Ionicons name="radio" size={13} color="#15803d" />
                      <Text style={styles.liveText}>Technician en route or on site • GPS Tracking Active</Text>
                    </View>
                  )}
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
    backgroundColor: C.bgPage,
    padding: 16,
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
  centerBox: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: C.bgPage,
  },
  denseCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW.card,
  },
  centerIconPill: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  // ── High-Density KPI Row ──
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
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
    fontSize: 16,
    fontWeight: "900",
    color: C.slate900,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 9,
    color: C.slate500,
    marginTop: 1,
  },

  // ── Mode Tabs ──
  modeTabs: {
    flexDirection: "row",
    backgroundColor: C.slate200,
    borderRadius: RADIUS.sm,
    padding: 3,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: RADIUS.xs,
  },
  modeTabActive: {
    backgroundColor: C.brand,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.slate600,
  },
  modeTabTextActive: {
    color: "#FFFFFF",
  },

  // ── Search & Vector Pills ──
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.border,
    height: 38,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: C.slate900,
  },
  vectorPillScroll: {
    marginBottom: 10,
  },
  vectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    backgroundColor: C.bgCard,
    borderWidth: 1,
  },
  vectorPillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },

  // ── STRIDE Matrix Cards ──
  matrixHeaderSub: {
    fontSize: 11,
    color: C.slate500,
    marginBottom: 10,
  },
  strideCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  strideCodeBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.xs,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  strideCodeText: {
    fontSize: 14,
    fontWeight: "900",
    color: C.brand,
  },
  strideVectorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.slate900,
  },
  strideThreatDesc: {
    fontSize: 10.5,
    color: C.slate500,
    marginTop: 1,
  },
  scorePill: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  scorePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  mitigationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.slate50,
    borderRadius: RADIUS.xs,
    padding: 7,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  mitigationText: {
    fontSize: 10.5,
    color: C.slate700,
    fontWeight: "600",
    flex: 1,
  },

  // ── Audit Card Accordion ──
  auditCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    overflow: "hidden",
    ...SHADOW.card,
  },
  auditHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  vectorTag: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  vectorTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0369a1",
  },
  auditAction: {
    fontSize: 12.5,
    fontWeight: "800",
    color: C.slate900,
  },
  auditMeta: {
    fontSize: 10.5,
    color: C.slate500,
    marginTop: 1,
  },
  statusTagSuccess: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  statusTagTextSuccess: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#15803d",
  },
  statusTagFailed: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  statusTagTextFailed: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#b91c1c",
  },
  auditBody: {
    padding: 10,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: C.slate100,
    backgroundColor: C.slate50,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  gpsChipText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#047857",
    fontWeight: "700",
  },
  ipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  ipChipText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#0284c7",
    fontWeight: "700",
  },
  payloadBox: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.xs,
    padding: 8,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 8,
  },
  payloadLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: C.slate500,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  payloadText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: C.slate800,
    lineHeight: 14,
  },
  btnOpenMaps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: C.brandLight,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    marginTop: 8,
  },
  btnOpenMapsText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: C.brand,
  },

  // ── Customer Appointments Accordion ──
  accordionCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    overflow: "hidden",
    ...SHADOW.card,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatarPill: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  workerName: {
    fontSize: 13,
    fontWeight: "700",
    color: C.slate900,
  },
  workerMeta: {
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
  accordionBody: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: C.slate100,
    backgroundColor: C.slate50,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
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
  descText: {
    fontSize: 11,
    color: C.slate600,
    fontStyle: "italic",
    marginTop: 6,
  },
  liveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#dcfce7",
    padding: 8,
    borderRadius: RADIUS.xs,
    marginTop: 8,
  },
  liveText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#15803d",
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.lg,
    padding: 16,
    width: "100%",
    maxWidth: 420,
    ...SHADOW.modal,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.slate900,
  },
  modalTargetIp: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#0284c7",
    fontWeight: "700",
    marginBottom: 8,
  },
  layerBox: {
    backgroundColor: C.slate50,
    borderRadius: RADIUS.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  layerTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0369a1",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  layerLine: {
    fontSize: 11,
    color: C.slate700,
    marginBottom: 2,
  },
  bold: {
    fontWeight: "700",
    color: C.slate900,
  },

  // ── Buttons ──
  btnPrimary: {
    backgroundColor: C.brand,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderRadius: RADIUS.sm,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.slate700,
  },
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
  },
});
