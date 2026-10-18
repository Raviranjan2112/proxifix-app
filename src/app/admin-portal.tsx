import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Linking,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";

export default function AdminPortalScreen() {
  const [activeTab, setActiveTab] = useState<"audit" | "workers">("audit");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [pendingWorkers, setPendingWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // IP / GPS Tracing Modal State (mirrors website's Layer 1 & Layer 2 modal)
  const [ipModalVisible, setIpModalVisible] = useState(false);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipData, setIpData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === "audit") {
        const res = await api.get("/admin/audit-logs");
        if (res.data?.success) {
          setAuditLogs(res.data.logs || []);
        }
      } else {
        const res = await api.get("/admin/workers/pending");
        if (res.data?.success) {
          setPendingWorkers(res.data.workers || []);
        }
      }
    } catch (err: any) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleOpenMaps = (lat: number, lng: number, label?: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Exact Coordinates", `Latitude: ${lat}\nLongitude: ${lng}\nGoogle Maps: ${url}`);
      }
    }).catch(() => {
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
    } catch (err) {
      console.warn("IP trace lookup error:", err);
      setIpData({
        ip,
        geo: { city: "Private Network", isp: "Localhost Gateway", networkType: "LAN Route" },
        stats: { total_events: 1, users: [] },
      });
    } finally {
      setIpLoading(false);
    }
  };

  const handleBlockUser = async (userId: string, email: string) => {
    Alert.alert(
      "Confirm Block",
      `Permanently block ${email} due to suspicious or unauthorized activity?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block User",
          style: "destructive",
          onPress: async () => {
            setActionLoadingId(userId);
            try {
              const res = await api.post(`/admin/users/${userId}/block`, {
                reason: "Unusual activity flagged by security administrator",
              });
              Alert.alert("Blocked", res.data?.message || "User blocked successfully.");
              loadData();
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.message || "Block failed.");
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleWorkerApproval = async (workerId: string, status: "APPROVED" | "REJECTED") => {
    setActionLoadingId(workerId);
    try {
      const res = await api.put(`/admin/workers/${workerId}/approval`, { status });
      Alert.alert("Status Updated", res.data?.message || `Worker ${status}.`);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Action failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Sub-nav Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "audit" && styles.tabBtnActive]}
          onPress={() => setActiveTab("audit")}
        >
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={activeTab === "audit" ? "#FFFFFF" : "#64748B"}
          />
          <Text
            style={[styles.tabBtnText, activeTab === "audit" && styles.tabBtnTextActive]}
          >
            Audit Logs & IPs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "workers" && styles.tabBtnActive]}
          onPress={() => setActiveTab("workers")}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "workers" ? "#FFFFFF" : "#64748B"}
          />
          <Text
            style={[styles.tabBtnText, activeTab === "workers" && styles.tabBtnTextActive]}
          >
            Worker Approvals
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#075c31"
          />
        }
      >
        {activeTab === "audit" ? (
          <>
            <View style={styles.headerBlock}>
              <Text style={styles.eyebrow}>STRIDE NON-REPUDIATION TRAIL</Text>
              <Text style={styles.headerTitle}>Real-Time Security Audit Logs</Text>
              <Text style={styles.headerSubtitle}>
                Layer 1 (IP) & Layer 2 (Real Hardware Device GPS) Pinpoint
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color="#075c31" style={{ marginVertical: 20 }} />
            ) : auditLogs.length === 0 ? (
              <Text style={styles.emptyText}>No audit records found.</Text>
            ) : (
              auditLogs.map((log) => {
                const hasGps = log.pin_lat && log.pin_lng;
                return (
                  <View key={log.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.strideBadge}>
                        <Text style={styles.strideText}>[{log.threat_category}]</Text>
                      </View>
                      <Text style={styles.actionText}>{log.action}</Text>
                      <Text style={styles.timeText}>
                        {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>

                    <Text style={styles.userEmail}>{log.user_email || "Anonymous Guest"}</Text>

                    {/* Chips Row: IP and Real Device GPS */}
                    <View style={styles.ipBadgeRow}>
                      {/* IP Chip — clickable to trace Layer 1 & 2 */}
                      <TouchableOpacity
                        style={styles.ipChip}
                        onPress={() => handleTraceIp(log.ip_address || "127.0.0.1")}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="globe-outline" size={13} color="#0F172A" />
                        <Text style={styles.ipChipText}>{log.ip_address || "127.0.0.1"}</Text>
                        <Text style={styles.traceTag}>Trace ↗</Text>
                      </TouchableOpacity>

                      {/* Real GPS Chip — clickable to open Google Maps directly */}
                      {hasGps ? (
                        <TouchableOpacity
                          style={styles.gpsChip}
                          onPress={() => handleOpenMaps(log.pin_lat, log.pin_lng, log.user_email)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="location" size={13} color="#047857" />
                          <Text style={styles.gpsChipText}>
                            {Number(log.pin_lat).toFixed(4)}°, {Number(log.pin_lng).toFixed(4)}°
                          </Text>
                          <Text style={styles.mapsTag}>Maps ↗</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Exact Device Pinpoint Quick-Action Button */}
                    {hasGps && (
                      <TouchableOpacity
                        style={styles.pinpointBtn}
                        onPress={() => handleOpenMaps(log.pin_lat, log.pin_lng, log.user_email)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="navigate" size={14} color="#047857" />
                        <Text style={styles.pinpointBtnText}>
                          Open Exact Device Pinpoint in Maps
                        </Text>
                        <Ionicons name="open-outline" size={12} color="#047857" />
                      </TouchableOpacity>
                    )}

                    {/* Block Button if user is active and has target_user_id */}
                    {log.target_user_id && log.user_role !== "ADMIN" && log.user_is_active !== false && (
                      <TouchableOpacity
                        style={styles.blockBtn}
                        onPress={() => handleBlockUser(log.target_user_id, log.user_email)}
                        disabled={actionLoadingId === log.target_user_id}
                      >
                        <Ionicons name="ban" size={14} color="#DC2626" />
                        <Text style={styles.blockBtnText}>
                          {actionLoadingId === log.target_user_id ? "Blocking..." : "Block User"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            <View style={styles.headerBlock}>
              <Text style={styles.eyebrow}>WORKER DIRECTORY</Text>
              <Text style={styles.headerTitle}>Pending Worker Approvals</Text>
              <Text style={styles.headerSubtitle}>
                Verify credentials and approve workers to make them discoverable
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color="#075c31" style={{ marginVertical: 20 }} />
            ) : pendingWorkers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#10B981" />
                <Text style={styles.emptyCardTitle}>All Caught Up!</Text>
                <Text style={styles.emptyText}>No workers currently pending verification.</Text>
              </View>
            ) : (
              pendingWorkers.map((w) => (
                <View key={w.user_id} style={styles.card}>
                  <Text style={styles.workerName}>{w.name}</Text>
                  <Text style={styles.workerMeta}>{w.email} • {w.phone}</Text>
                  <Text style={styles.workerDesc}>
                    {w.experience_years} years experience • ₹{w.minimum_charge} min fee
                  </Text>

                  <View style={styles.approvalRow}>
                    <TouchableOpacity
                      style={[styles.apprBtn, styles.apprReject]}
                      onPress={() => handleWorkerApproval(w.user_id, "REJECTED")}
                      disabled={actionLoadingId === w.user_id}
                    >
                      <Text style={styles.apprRejectText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.apprBtn, styles.apprAccept]}
                      onPress={() => handleWorkerApproval(w.user_id, "APPROVED")}
                      disabled={actionLoadingId === w.user_id}
                    >
                      <Text style={styles.apprAcceptText}>Approve Worker</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── IP & EXACT GPS TRACING MODAL (Exact match to website popover) ── */}
      <Modal
        visible={ipModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 20 }}>{ipData?.geo?.flag || "🛰️"}</Text>
                <Text style={styles.modalIpTitle}>{selectedIp}</Text>
              </View>
              <Pressable onPress={() => setIpModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            {ipLoading ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.modalLoadingText}>Tracing Layer 1 Network & Layer 2 GPS Trail...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {/* LAYER 1: NETWORK IP GEOLOCATION */}
                <View style={styles.layerBox}>
                  <View style={styles.layerHeader}>
                    <Text style={styles.layer1Title}>🌐 Layer 1: Network IP Geolocation</Text>
                    <View style={styles.approxBadge}>
                      <Text style={styles.approxBadgeText}>Approx (~2-10 km)</Text>
                    </View>
                  </View>
                  <Text style={styles.layerDetailText}>
                    📍 <Text style={{ fontWeight: "700" }}>Location:</Text>{" "}
                    {[ipData?.geo?.city, ipData?.geo?.region, ipData?.geo?.country].filter(Boolean).join(", ") || "Localhost Host"}
                  </Text>
                  <Text style={styles.layerDetailText}>
                    🏢 <Text style={{ fontWeight: "700" }}>ISP Provider:</Text>{" "}
                    {ipData?.geo?.isp || "Internal Loopback Network"}
                  </Text>
                  {ipData?.geo?.mapsUrl && (
                    <TouchableOpacity
                      style={styles.openLayer1Btn}
                      onPress={() => Linking.openURL(ipData.geo.mapsUrl)}
                    >
                      <Text style={styles.openLayer1Text}>🗺️ Open Network ISP Location (Maps) ↗</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* LAYER 2: REAL HARDWARE DEVICE GPS */}
                <View style={styles.layer2Box}>
                  <View style={styles.layerHeader}>
                    <Text style={styles.layer2Title}>📍 Layer 2: Real Hardware Device GPS</Text>
                    <View style={styles.exactBadge}>
                      <Text style={styles.exactBadgeText}>Exact Pinpoint</Text>
                    </View>
                  </View>
                  {ipData?.deviceGps ? (
                    <View>
                      <Text style={styles.layer2DetailText}>
                        🎯 <Text style={{ fontWeight: "700" }}>GPS Coordinates:</Text>{" "}
                        <Text style={{ fontFamily: "monospace", color: "#a7f3d0" }}>
                          {ipData.deviceGps.lat}° N, {ipData.deviceGps.lng}° E
                        </Text>
                      </Text>
                      <Text style={styles.layer2DetailText}>
                        👤 <Text style={{ fontWeight: "700" }}>Linked Device:</Text>{" "}
                        {ipData.deviceGps.name} ({ipData.deviceGps.role})
                      </Text>
                      <Text style={styles.layer2DetailText}>
                        📧 <Text style={{ fontWeight: "700" }}>Account:</Text>{" "}
                        {ipData.deviceGps.email}
                      </Text>
                      <TouchableOpacity
                        style={styles.openExactPinBtn}
                        onPress={() => handleOpenMaps(Number(ipData.deviceGps.lat), Number(ipData.deviceGps.lng))}
                      >
                        <Text style={styles.openExactPinText}>
                          🎯 Open Exact Device Pinpoint (Google Maps) ↗
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.noGpsNote}>
                      ℹ️ Hardware GPS is captured when worker/customer grants location permission or executes a search.
                    </Text>
                  )}
                </View>

                {/* PLATFORM AUDIT TRAIL */}
                <View style={styles.auditTrailBox}>
                  <Text style={styles.auditTrailHeading}>📊 PLATFORM AUDIT TRAIL:</Text>
                  <Text style={styles.auditTrailText}>
                    • Total Events: {ipData?.stats?.total_events || 1}
                  </Text>
                  {ipData?.stats?.users?.length > 0 && (
                    <Text style={styles.auditTrailText}>
                      • Associated Users: {ipData.stats.users.join(", ")}
                    </Text>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#effaf3",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    backgroundColor: "#F1F5F9",
  },
  tabBtnActive: {
    backgroundColor: "#075c31",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  headerBlock: {
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#08713d",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    marginBottom: 12,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  strideBadge: {
    backgroundColor: "#EFFAF3",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  strideText: {
    color: "#075c31",
    fontSize: 10,
    fontWeight: "700",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  userEmail: {
    fontSize: 13,
    color: "#334155",
    marginTop: 6,
  },
  ipBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  ipChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  ipChipText: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "600",
    color: "#0F172A",
  },
  traceTag: {
    fontSize: 10,
    color: "#0369A1",
    fontWeight: "700",
    marginLeft: 2,
  },
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  gpsChipText: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#047857",
  },
  mapsTag: {
    fontSize: 10,
    color: "#047857",
    fontWeight: "800",
    marginLeft: 2,
  },
  pinpointBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    gap: 6,
  },
  pinpointBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  blockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingVertical: 7,
    marginTop: 10,
    gap: 6,
  },
  blockBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 30,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  workerMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  workerDesc: {
    fontSize: 12,
    color: "#475569",
    marginTop: 6,
  },
  approvalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  apprBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: "center",
  },
  apprReject: {
    backgroundColor: "#FEE2E2",
  },
  apprRejectText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  apprAccept: {
    backgroundColor: "#16A34A",
  },
  apprAcceptText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  // ── Modal Styles (matching website popover) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalIpTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#38bdf8",
    fontFamily: "monospace",
  },
  closeBtn: {
    padding: 4,
  },
  modalLoadingText: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 12,
  },
  layerBox: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 10,
  },
  layerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  layer1Title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38bdf8",
    textTransform: "uppercase",
  },
  approxBadge: {
    backgroundColor: "#0369a1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  approxBadgeText: {
    fontSize: 10,
    color: "#e0f2fe",
    fontWeight: "700",
  },
  layerDetailText: {
    color: "#f1f5f9",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  openLayer1Btn: {
    marginTop: 8,
  },
  openLayer1Text: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "600",
  },
  layer2Box: {
    backgroundColor: "#064e3b",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#059669",
    marginBottom: 10,
  },
  layer2Title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34d399",
    textTransform: "uppercase",
  },
  exactBadge: {
    backgroundColor: "#047857",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exactBadgeText: {
    fontSize: 10,
    color: "#a7f3d0",
    fontWeight: "700",
  },
  layer2DetailText: {
    color: "#ecfdf5",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  openExactPinBtn: {
    backgroundColor: "#10b981",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    marginTop: 10,
  },
  openExactPinText: {
    color: "#064e3b",
    fontSize: 12,
    fontWeight: "800",
  },
  noGpsNote: {
    color: "#a7f3d0",
    fontSize: 11,
    marginTop: 4,
  },
  auditTrailBox: {
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 10,
    marginTop: 4,
  },
  auditTrailHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 4,
  },
  auditTrailText: {
    color: "#e2e8f0",
    fontSize: 12,
    lineHeight: 18,
  },
});
