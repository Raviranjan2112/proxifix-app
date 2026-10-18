import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { C, RADIUS, SHADOW } from "../../constants/theme";

const RADIUS_OPTIONS = [5, 10, 15, 20];

const POPULAR_SERVICES = [
  { icon: "🔧", title: "Plumbing", text: "Pipes, faucets & sanitary repair" },
  { icon: "⚡", title: "Electrical", text: "Wiring, circuit boards & fixtures" },
  { icon: "🧹", title: "Home Cleaning", text: "Deep cleaning & sanitation" },
  { icon: "🪚", title: "Carpentry", text: "Furniture & structural repair" },
  { icon: "❄️", title: "AC Repair", text: "Servicing, gas recharge & setup" },
];

function getCategoryEmoji(name: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("electric")) return "⚡";
  if (lower.includes("plumb")) return "🔧";
  if (lower.includes("ac") || lower.includes("air")) return "❄️";
  if (lower.includes("carpent")) return "🪚";
  if (lower.includes("paint")) return "🎨";
  if (lower.includes("clean")) return "🧹";
  if (lower.includes("appliance")) return "⚙️";
  if (lower.includes("mechanic")) return "🚗";
  return "🔨";
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Customer State
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>("AC Repair");
  const [radius, setRadius] = useState(15);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState("Detecting GPS coordinates...");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Accordion State: tracks which worker card is expanded
  const [expandedWorkers, setExpandedWorkers] = useState<{ [id: string]: boolean }>({});

  // Admin State
  const [adminSummary, setAdminSummary] = useState({
    total_workers: 0,
    pending_workers: 0,
    approved_workers: 0,
    rejected_workers: 0,
  });
  const [adminServiceCounts, setAdminServiceCounts] = useState<any[]>([]);
  const [adminWorkers, setAdminWorkers] = useState<any[]>([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminFilterService, setAdminFilterService] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    requestDeviceLocation();
    if (user?.role === "ADMIN") {
      loadAdminDashboardData();
    } else {
      loadServices();
    }
  }, [user]);

  async function loadServices() {
    try {
      const res = await api.get("/services");
      const list = res.data?.services || [];
      if (list.length > 0) {
        setServices(list);
        setSelectedService((prev) => prev || list[0].name);
      }
    } catch (e) {
      console.warn("Could not load services:", e);
    }
  }

  async function loadAdminDashboardData() {
    setLoading(true);
    try {
      const res = await api.get("/admin/workers", {
        params: {
          service: adminFilterService || undefined,
          search: adminSearch || undefined,
        },
      });
      if (res.data?.success) {
        if (res.data.summary) setAdminSummary(res.data.summary);
        if (res.data.serviceCounts) setAdminServiceCounts(res.data.serviceCounts);
        if (res.data.workers) setAdminWorkers(res.data.workers);
      }
    } catch (e) {
      console.warn("Could not load admin dashboard data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadAdminDashboardData();
    }
  }, [adminFilterService, adminSearch]);

  useEffect(() => {
    if (coords && selectedService && user && user.role === "CUSTOMER") {
      loadNearbyWorkers();
    } else if (!user) {
      setWorkers([]);
      setLoading(false);
    }
  }, [coords, selectedService, radius, user]);

  async function requestDeviceLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        const fallback = { latitude: 23.2599, longitude: 77.4126 };
        setCoords(fallback);
        setLocationName("Bhopal, MP • 23.2599°N, 77.4126°E");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCoords(current);
      try {
        const reverse = await Location.reverseGeocodeAsync(current);
        if (reverse?.length > 0) {
          const item = reverse[0];
          setLocationName(
            `${item.city || item.district || "Local Region"}, ${item.region || ""} • ${current.latitude.toFixed(4)}°N, ${current.longitude.toFixed(4)}°E`
          );
        } else {
          setLocationName(`${current.latitude.toFixed(4)}°N, ${current.longitude.toFixed(4)}°E`);
        }
      } catch {
        setLocationName(`${current.latitude.toFixed(4)}°N, ${current.longitude.toFixed(4)}°E`);
      }
    } catch {
      setCoords({ latitude: 23.2599, longitude: 77.4126 });
      setLocationName("Bhopal, MP • 23.2599°N, 77.4126°E");
    }
  }

  async function loadNearbyWorkers() {
    if (!user || !coords) return;
    setLoading(true);
    try {
      const res = await api.get("/workers/nearby", {
        params: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          radius: Math.min(radius, 20),
          service: selectedService || services[0]?.name || "AC Repair",
        },
      });
      if (res.data?.success) setWorkers(res.data.workers || []);
    } catch (err: any) {
      console.warn("Failed to load nearby workers:", err?.response?.data?.message || err?.message);
      setWorkers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleUpdateWorkerStatus = async (workerId: string, status: "APPROVED" | "REJECTED") => {
    setActionLoadingId(workerId);
    try {
      const res = await api.put(`/admin/workers/${workerId}/approval`, { status });
      Alert.alert("Status Updated", res.data?.message || `Worker ${status}.`);
      loadAdminDashboardData();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update worker.");
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

  const toggleAccordion = (id: string) => {
    setExpandedWorkers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    requestDeviceLocation();
    if (user?.role === "ADMIN") {
      loadAdminDashboardData();
    } else if (user?.role === "CUSTOMER") {
      loadNearbyWorkers();
    } else {
      setRefreshing(false);
    }
  };

  const pendingWorkers = adminWorkers.filter((w) => w.verification_status === "PENDING");

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
    >
      {/* ── Enterprise Header: Real Hardware GPS Pill ── */}
      <View style={styles.gpsBar}>
        <View style={styles.gpsDotPulse} />
        <Ionicons name="hardware-chip-outline" size={14} color={C.brand} />
        <Text style={styles.gpsBarText} numberOfLines={1}>
          {locationName}
        </Text>
        <Pressable onPress={requestDeviceLocation} hitSlop={8} style={{ padding: 2 }}>
          <Ionicons name="refresh" size={13} color={C.brand} />
        </Pressable>
      </View>

      {/* ─────────────────────────────────────────────────────────────
          1. GUEST / UNHEALTHY VIEW
          ───────────────────────────────────────────────────────────── */}
      {!user ? (
        <View style={styles.contentWrap}>
          {/* Hero Banner */}
          <View style={styles.enterpriseHero}>
            <View style={styles.securityPill}>
              <Ionicons name="shield-checkmark" size={12} color={C.brand} />
              <Text style={styles.securityPillText}>STRIDE SECURED & GPS VERIFIED</Text>
            </View>
            <Text style={styles.heroTitle}>Enterprise-Grade Home Service Logistics</Text>
            <Text style={styles.heroSubtitle}>
              On-demand verified professionals with immutable audit trails, cryptographic non-repudiation, and hardware GPS tracking.
            </Text>

            <View style={styles.heroBtnRow}>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
                onPress={() => router.push("/login")}
              >
                <Text style={styles.btnPrimaryText}>Sign In to Request Services</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnOutline, pressed && styles.btnPressed]}
                onPress={() => router.push("/register")}
              >
                <Text style={styles.btnOutlineText}>Register Account</Text>
              </Pressable>
            </View>
          </View>

          {/* Popular Services Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.eyebrow}>SERVICES DIRECTORY</Text>
            <Text style={styles.sectionTitle}>Available Service Categories</Text>
          </View>

          <View style={styles.denseCard}>
            {POPULAR_SERVICES.map((s, idx) => (
              <Pressable
                key={s.title}
                style={({ pressed }) => [
                  styles.serviceRow,
                  idx === POPULAR_SERVICES.length - 1 && { borderBottomWidth: 0 },
                  pressed && { backgroundColor: C.slate50 },
                ]}
                onPress={() => router.push("/login")}
              >
                <Text style={{ fontSize: 20, marginRight: 12 }}>{s.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceRowTitle}>{s.title}</Text>
                  <Text style={styles.serviceRowSub}>{s.text}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={C.slate400} />
              </Pressable>
            ))}
          </View>

          {/* Three Steps Operations */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={styles.eyebrow}>ZERO-TRUST VERIFICATION</Text>
            <Text style={styles.sectionTitle}>How ProxiFix Operates</Text>
          </View>

          <View style={styles.denseCard}>
            {[
              { step: "01", title: "Select Service & Geofence Radius", desc: "Hardware GPS detects your coordinates and searches authorized workers within bounds." },
              { step: "02", title: "Immutable Request Dispatch", desc: "Booking requests are hashed and written to non-repudiation audit logs." },
              { step: "03", title: "Live Arrival & Signed Completion", desc: "Real-time hardware GPS location streaming with post-job digital confirmation." },
            ].map((p, i) => (
              <View key={p.step} style={[styles.processItem, i === 2 && { borderBottomWidth: 0 }]}>
                <View style={styles.processStepBadge}>
                  <Text style={styles.processStepText}>{p.step}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.processTitle}>{p.title}</Text>
                  <Text style={styles.processDesc}>{p.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : user.role === "ADMIN" ? (
        /* ─────────────────────────────────────────────────────────────
            2. ADMINISTRATOR DASHBOARD (Minimalist Enterprise Option 3)
            ───────────────────────────────────────────────────────────── */
        <View style={styles.contentWrap}>
          {/* Header */}
          <View style={styles.adminHeader}>
            <View>
              <Text style={styles.eyebrow}>ADMINISTRATOR CONSOLE</Text>
              <Text style={styles.heroTitle}>Operations & Verification</Text>
              <Text style={styles.heroSubtitle}>
                Platform metrics, technician approvals, and service category telemetry.
              </Text>
            </View>
          </View>

          {/* High-Density 2x2 Metric Grid with top accent borders */}
          <View style={styles.metricGrid}>
            <View style={[styles.metricTile, { borderTopColor: C.brand }]}>
              <Text style={styles.metricLabel}>TOTAL WORKERS</Text>
              <Text style={styles.metricValue}>{adminSummary.total_workers}</Text>
              <Text style={styles.metricSub}>Registered technicians</Text>
            </View>

            <View style={[styles.metricTile, { borderTopColor: adminSummary.pending_workers > 0 ? "#d97706" : C.slate400 }]}>
              <Text style={styles.metricLabel}>PENDING APPROVAL</Text>
              <Text style={[styles.metricValue, { color: adminSummary.pending_workers > 0 ? "#d97706" : C.slate800 }]}>
                {adminSummary.pending_workers}
              </Text>
              <Text style={styles.metricSub}>Awaiting verification</Text>
            </View>

            <View style={[styles.metricTile, { borderTopColor: "#15803d" }]}>
              <Text style={styles.metricLabel}>APPROVED ACTIVE</Text>
              <Text style={[styles.metricValue, { color: "#15803d" }]}>{adminSummary.approved_workers}</Text>
              <Text style={styles.metricSub}>Verified & active</Text>
            </View>

            <View style={[styles.metricTile, { borderTopColor: "#b91c1c" }]}>
              <Text style={styles.metricLabel}>DECOMMISSIONED</Text>
              <Text style={[styles.metricValue, { color: "#b91c1c" }]}>{adminSummary.rejected_workers}</Text>
              <Text style={styles.metricSub}>Offline or rejected</Text>
            </View>
          </View>

          {/* STRIDE Security Banner */}
          <Pressable
            style={styles.strideSecurityCard}
            onPress={() => router.push("/admin-portal")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="shield-checkmark" size={18} color="#0369a1" />
                <Text style={styles.strideTitle}>STRIDE Non-Repudiation Security Terminal</Text>
              </View>
              <View style={styles.statusPillLive}>
                <Text style={styles.statusPillLiveText}>ACTIVE 🔒</Text>
              </View>
            </View>
            <Text style={styles.strideSubtitle}>
              Hardware GPS tracing, Layer 1/2 IP lookup & immutable SQLite audit logs.
            </Text>
            <View style={styles.strideActionRow}>
              <Text style={styles.strideActionLink}>Open Security & Audit Terminal</Text>
              <Ionicons name="arrow-forward" size={13} color="#0369a1" />
            </View>
          </Pressable>

          {/* Pending Applications Section */}
          {pendingWorkers.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.eyebrow}>ACTION REQUIRED</Text>
                <Text style={styles.sectionTitle}>
                  Pending Approvals ({pendingWorkers.length})
                </Text>
              </View>

              {pendingWorkers.map((w) => (
                <View key={w.id} style={styles.pendingCard}>
                  <View style={styles.pendingCardHeader}>
                    <View style={styles.avatarPill}>
                      <Text style={styles.avatarText}>{w.name?.[0]?.toUpperCase() || "W"}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.workerName}>{w.name}</Text>
                      <Text style={styles.workerMeta}>{w.email} • {w.phone || "No phone"}</Text>
                      <Text style={styles.workerServiceTag}>
                        Service: {Array.isArray(w.services) ? w.services.join(", ") : w.services || "Home Service"}
                      </Text>
                    </View>
                    <View style={styles.badgePending}>
                      <Text style={styles.badgePendingText}>PENDING</Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.btnAction, styles.btnReject]}
                      onPress={() => handleUpdateWorkerStatus(w.id, "REJECTED")}
                      disabled={actionLoadingId === w.id}
                    >
                      <Text style={styles.btnRejectText}>Reject</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.btnAction, styles.btnApprove]}
                      onPress={() => handleUpdateWorkerStatus(w.id, "APPROVED")}
                      disabled={actionLoadingId === w.id}
                    >
                      <Text style={styles.btnApproveText}>Approve Worker</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Service Distribution Overview */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={styles.eyebrow}>SERVICE TELEMETRY</Text>
            <Text style={styles.sectionTitle}>Registered Technicians by Service</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
            {adminServiceCounts.map((s) => (
              <View key={s.id || s.name} style={styles.serviceTelemetryTile}>
                <Text style={{ fontSize: 20 }}>{getCategoryEmoji(s.name)}</Text>
                <Text style={styles.telemetryName}>{s.name}</Text>
                <Text style={styles.telemetryCount}>{s.total_workers || 0} Registered</Text>
                <View style={styles.telemetryBreakdown}>
                  <Text style={styles.telemetryApproved}>
                    {s.approved_workers || 0} approved
                  </Text>
                  <Text style={styles.telemetryPending}>
                    {s.pending_workers || 0} pending
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Fast Filterable Worker Directory (High-Density Accordion Cards) */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={styles.eyebrow}>WORKER DIRECTORY</Text>
            <Text style={styles.sectionTitle}>Registered Personnel ({adminWorkers.length})</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.denseSearchInputWrap}>
            <Ionicons name="search" size={14} color={C.slate500} />
            <TextInput
              style={styles.denseSearchInput}
              placeholder="Search by worker name, email or phone..."
              placeholderTextColor={C.slate400}
              value={adminSearch}
              onChangeText={setAdminSearch}
            />
            {adminSearch ? (
              <Pressable onPress={() => setAdminSearch("")}>
                <Ionicons name="close-circle" size={14} color={C.slate500} />
              </Pressable>
            ) : null}
          </View>

          {adminWorkers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color={C.slate400} />
              <Text style={styles.emptyTitle}>No workers match your filter</Text>
            </View>
          ) : (
            adminWorkers.map((w) => {
              const isExpanded = !!expandedWorkers[w.id];
              const isApproved = w.verification_status === "APPROVED";
              const hasGps = w.latitude && w.longitude;

              return (
                <View key={w.id} style={styles.accordionCard}>
                  {/* Accordion Compact Header */}
                  <Pressable
                    style={styles.accordionHeader}
                    onPress={() => toggleAccordion(w.id)}
                  >
                    <View style={styles.avatarPill}>
                      <Text style={styles.avatarText}>{w.name?.[0]?.toUpperCase() || "W"}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.workerName}>{w.name}</Text>
                        <View style={isApproved ? styles.badgeApproved : styles.badgePending}>
                          <Text style={isApproved ? styles.badgeApprovedText : styles.badgePendingText}>
                            {w.verification_status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.workerMeta}>
                        {Array.isArray(w.services) ? w.services.join(", ") : w.services || "General Service"} • {w.city || "Bhopal"}
                      </Text>
                    </View>

                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={C.slate500}
                    />
                  </Pressable>

                  {/* Accordion Expanded Details */}
                  {isExpanded && (
                    <View style={styles.accordionBody}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email:</Text>
                        <Text style={styles.detailValue}>{w.email}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone:</Text>
                        <Text style={styles.detailValue}>{w.phone || "Not configured"}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Experience:</Text>
                        <Text style={styles.detailValue}>{w.experience_years || 1} years</Text>
                      </View>

                      {/* Integrated Hardware GPS Pinpoint Chip */}
                      {hasGps ? (
                        <Pressable
                          style={styles.gpsChipBox}
                          onPress={() => handleOpenMaps(w.latitude, w.longitude)}
                        >
                          <Ionicons name="location" size={13} color="#047857" />
                          <Text style={styles.gpsChipText}>
                            📍 {Number(w.latitude).toFixed(4)}°, {Number(w.longitude).toFixed(4)}° (GPS Pinpoint)
                          </Text>
                          <Ionicons name="open-outline" size={12} color="#047857" />
                        </Pressable>
                      ) : (
                        <Text style={styles.noGpsText}>No hardware GPS coordinates registered.</Text>
                      )}

                      {/* Actions */}
                      <View style={styles.accordionActionRow}>
                        {isApproved ? (
                          <Pressable
                            style={styles.btnSmallDanger}
                            onPress={() => handleUpdateWorkerStatus(w.id, "REJECTED")}
                            disabled={actionLoadingId === w.id}
                          >
                            <Ionicons name="ban-outline" size={12} color="#b91c1c" />
                            <Text style={styles.btnSmallDangerText}>Take Offline (Decommission)</Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            style={styles.btnSmallSuccess}
                            onPress={() => handleUpdateWorkerStatus(w.id, "APPROVED")}
                            disabled={actionLoadingId === w.id}
                          >
                            <Ionicons name="checkmark-circle-outline" size={12} color="#15803d" />
                            <Text style={styles.btnSmallSuccessText}>Authorize & Approve</Text>
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
      ) : user.role === "WORKER" ? (
        /* ─────────────────────────────────────────────────────────────
            3. WORKER DASHBOARD LAUNCHER
            ───────────────────────────────────────────────────────────── */
        <View style={styles.contentWrap}>
          <View style={styles.enterpriseHero}>
            <View style={styles.securityPill}>
              <Ionicons name="briefcase" size={12} color={C.brand} />
              <Text style={styles.securityPillText}>WORKER DASHBOARD</Text>
            </View>
            <Text style={styles.heroTitle}>Worker Operational Terminal</Text>
            <Text style={styles.heroSubtitle}>
              Broadcast live hardware GPS, manage availability state, and accept incoming service appointments.
            </Text>
            <Pressable
              style={[styles.btnPrimary, { marginTop: 14 }]}
              onPress={() => router.push("/worker-portal")}
            >
              <Text style={styles.btnPrimaryText}>Open Worker Dashboard</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            4. CUSTOMER VIEW (Minimalist Enterprise Option 3)
            ───────────────────────────────────────────────────────────── */
        <View style={styles.contentWrap}>
          {/* Header */}
          <View style={styles.customerHeader}>
            <Text style={styles.eyebrow}>CUSTOMER DASHBOARD</Text>
            <Text style={styles.heroTitle}>Request Verified Services</Text>
            <Text style={styles.heroSubtitle}>
              Select a trade and search within your hardware GPS geofence radius.
            </Text>
          </View>

          {/* High-Density Category Selector */}
          <View style={styles.denseCard}>
            <Text style={styles.inputLabel}>SELECT SERVICE TRADE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {services.map((cat) => {
                const isSelected = selectedService === cat.name;
                return (
                  <Pressable
                    key={cat.id || cat.name}
                    style={[styles.categoryTile, isSelected && styles.categoryTileActive]}
                    onPress={() => setSelectedService(cat.name)}
                  >
                    <Text style={{ fontSize: 18 }}>{getCategoryEmoji(cat.name)}</Text>
                    <Text style={[styles.categoryTileText, isSelected && styles.categoryTileTextActive]}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Radius Segmented Control */}
            <Text style={[styles.inputLabel, { marginTop: 8 }]}>SEARCH GEOFENCE RADIUS</Text>
            <View style={styles.segmentedRow}>
              {RADIUS_OPTIONS.map((r) => {
                const isSelected = radius === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                    onPress={() => setRadius(r)}
                  >
                    <Text style={[styles.segmentBtnText, isSelected && styles.segmentBtnTextActive]}>
                      {r} km
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.btnPrimary, { marginTop: 14 }]}
              onPress={loadNearbyWorkers}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  Find Available {selectedService} Workers
                </Text>
              )}
            </Pressable>
          </View>

          {/* Results Section */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={styles.eyebrow}>VERIFIED PROFESSIONALS</Text>
            <Text style={styles.sectionTitle}>
              {workers.length} technician(s) within {radius} km
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={C.brand} />
              <Text style={styles.loadingText}>Scanning geofence for verified technicians...</Text>
            </View>
          ) : workers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="search-outline" size={32} color={C.slate400} />
              <Text style={styles.emptyTitle}>No workers found within {radius} km</Text>
              <Text style={styles.emptySub}>
                Try expanding your geofence radius to 20 km or choose another category.
              </Text>
            </View>
          ) : (
            workers.map((worker) => {
              const isExpanded = !!expandedWorkers[worker.id];
              const hasGps = worker.latitude && worker.longitude;

              return (
                <View key={worker.id} style={styles.accordionCard}>
                  {/* Compact Header */}
                  <Pressable
                    style={styles.accordionHeader}
                    onPress={() => toggleAccordion(worker.id)}
                  >
                    <View style={styles.avatarPill}>
                      <Text style={styles.avatarText}>{worker.name?.[0]?.toUpperCase() || "W"}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.workerName}>{worker.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <Text style={styles.ratingBadge}>★ {worker.rating || "5.0"}</Text>
                        <Text style={styles.distanceBadge}>
                          📍 {worker.distance_km ? `${worker.distance_km} km away` : "Nearby"}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={C.slate500}
                    />
                  </Pressable>

                  {/* Expanded Accordion Body */}
                  {isExpanded && (
                    <View style={styles.accordionBody}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Specialty:</Text>
                        <Text style={styles.detailValue}>{worker.service || selectedService}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Starting Rate:</Text>
                        <Text style={styles.detailValue}>₹{worker.minimum_charge || 250} min. charge</Text>
                      </View>

                      {/* Integrated GPS Pinpoint Chip */}
                      {hasGps && (
                        <Pressable
                          style={styles.gpsChipBox}
                          onPress={() => handleOpenMaps(worker.latitude, worker.longitude)}
                        >
                          <Ionicons name="location" size={13} color="#047857" />
                          <Text style={styles.gpsChipText}>
                            📍 {Number(worker.latitude).toFixed(4)}°, {Number(worker.longitude).toFixed(4)}° (Exact Pinpoint)
                          </Text>
                          <Ionicons name="open-outline" size={12} color="#047857" />
                        </Pressable>
                      )}

                      <Pressable
                        style={[styles.btnPrimary, { marginTop: 12 }]}
                        onPress={() => router.push(`/book/${worker.id}`)}
                      >
                        <Text style={styles.btnPrimaryText}>Schedule Appointment</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

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

  // ── Enterprise GPS Hardware Bar ──
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
    backgroundColor: "#10b981",
  },
  gpsBarText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "monospace",
    color: C.slate700,
  },

  // ── Hero & Headers ──
  enterpriseHero: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    ...SHADOW.card,
  },
  securityPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: C.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    gap: 5,
    marginBottom: 8,
  },
  securityPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.brand,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.slate900,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: C.slate600,
    lineHeight: 18,
  },
  heroBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  customerHeader: {
    marginBottom: 14,
  },
  adminHeader: {
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: C.brand,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.slate900,
  },

  // ── High-Density 2x2 Metric Grid ──
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  metricTile: {
    width: "48.5%",
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderTopWidth: 3,
    ...SHADOW.card,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: C.slate500,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: C.slate900,
    marginTop: 3,
  },
  metricSub: {
    fontSize: 10,
    color: C.slate500,
    marginTop: 2,
  },

  // ── STRIDE Security Banner ──
  strideSecurityCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bae6fd",
    marginBottom: 14,
  },
  strideTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0369a1",
  },
  statusPillLive: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  statusPillLiveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803d",
  },
  strideSubtitle: {
    fontSize: 11,
    color: "#0c4a6e",
    marginTop: 4,
    lineHeight: 16,
  },
  strideActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  strideActionLink: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369a1",
  },

  // ── Telemetry Tiles ──
  hScroll: {
    marginBottom: 14,
  },
  serviceTelemetryTile: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 10,
    minWidth: 120,
    ...SHADOW.card,
  },
  telemetryName: {
    fontSize: 12,
    fontWeight: "700",
    color: C.slate800,
    marginTop: 6,
  },
  telemetryCount: {
    fontSize: 11,
    color: C.slate600,
    marginTop: 2,
  },
  telemetryBreakdown: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.slate100,
  },
  telemetryApproved: {
    fontSize: 9,
    fontWeight: "700",
    color: "#15803d",
  },
  telemetryPending: {
    fontSize: 9,
    color: "#b45309",
  },

  // ── High-Density Accordion Card ──
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
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.brand,
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
  workerServiceTag: {
    fontSize: 11,
    color: C.brand,
    fontWeight: "600",
    marginTop: 2,
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
  gpsChipBox: {
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
  noGpsText: {
    fontSize: 10,
    color: C.slate400,
    fontStyle: "italic",
    marginTop: 4,
  },
  accordionActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  btnSmallDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  btnSmallDangerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#b91c1c",
  },
  btnSmallSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  btnSmallSuccessText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803d",
  },

  // ── Pending Cards ──
  pendingCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 12,
    marginBottom: 8,
  },
  pendingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgePending: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  badgePendingText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#b45309",
  },
  badgeApproved: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  badgeApprovedText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803d",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  btnAction: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.xs,
    alignItems: "center",
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

  // ── Dense Card & Controls ──
  denseCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW.card,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.slate600,
    letterSpacing: 0.5,
  },
  categoryTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.slate50,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  categoryTileActive: {
    backgroundColor: C.brandLight,
    borderColor: C.brand,
  },
  categoryTileText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.slate700,
  },
  categoryTileTextActive: {
    color: C.brand,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    backgroundColor: C.slate100,
    borderRadius: RADIUS.xs,
  },
  segmentBtnActive: {
    backgroundColor: C.brand,
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.slate600,
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
  },
  denseSearchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.border,
    height: 38,
    gap: 8,
    marginBottom: 10,
  },
  denseSearchInput: {
    flex: 1,
    fontSize: 12,
    color: C.slate900,
  },

  // ── Rating & Distance Badges ──
  ratingBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  distanceBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },

  // ── Services & Process Rows (Guest) ──
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
  },
  serviceRowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.slate900,
  },
  serviceRowSub: {
    fontSize: 11,
    color: C.slate500,
    marginTop: 1,
  },
  processItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.slate100,
  },
  processStepBadge: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.xs,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  processStepText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.brand,
  },
  processTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.slate800,
  },
  processDesc: {
    fontSize: 11,
    color: C.slate500,
    marginTop: 2,
    lineHeight: 16,
  },

  // ── Buttons & State ──
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
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.brand,
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.brand,
  },
  btnPressed: {
    opacity: 0.85,
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
