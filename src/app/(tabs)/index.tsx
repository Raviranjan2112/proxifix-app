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
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const RADIUS_OPTIONS = [5, 10, 15, 20];

const POPULAR_SERVICES = [
  { icon: "🔧", title: "Plumbing", text: "Leaks, taps, pipes and fittings" },
  { icon: "⚡", title: "Electrical", text: "Wiring, switches and repairs" },
  { icon: "🧹", title: "Home Cleaning", text: "Reliable cleaning professionals" },
  { icon: "🪚", title: "Carpentry", text: "Furniture and home repairs" },
  { icon: "❄️", title: "AC Repair", text: "Servicing, installation and repairs" },
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

  // Customer state
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>("AC Repair");
  const [radius, setRadius] = useState(15);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState("Detecting location...");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Admin state (mirrors website AdminDashboard.jsx)
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
        setLocationName("Bhopal, MP (Default)");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCoords(current);
      try {
        const reverse = await Location.reverseGeocodeAsync(current);
        if (reverse?.length > 0) {
          const item = reverse[0];
          setLocationName(`${item.city || item.district || "Near you"}, ${item.region || ""}`);
        } else {
          setLocationName(`${current.latitude.toFixed(3)}°N, ${current.longitude.toFixed(3)}°E`);
        }
      } catch {
        setLocationName(`${current.latitude.toFixed(3)}°N, ${current.longitude.toFixed(3)}°E`);
      }
    } catch {
      setCoords({ latitude: 23.2599, longitude: 77.4126 });
      setLocationName("Bhopal, MP");
    }
  }

  async function loadNearbyWorkers() {
    if (!user || !coords) return;
    setLoading(true);
    setHasSearched(true);
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#075c31" />}
    >
      {/* GPS Location Bar */}
      <View style={styles.locationCard}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={18} color="#075c31" />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.locationLabel}>Your Hardware GPS Location</Text>
            <Text style={styles.locationValue} numberOfLines={1}>{locationName}</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.refreshLocBtn, pressed && { backgroundColor: "#cfeeda" }]}
          onPress={requestDeviceLocation}
        >
          <Ionicons name="locate" size={16} color="#075c31" />
        </Pressable>
      </View>

      {/* ─────────────────────────────────────────────────────────────
          1. UNHEALTHY / GUEST VIEW (Matches website HomePage.jsx)
          ───────────────────────────────────────────────────────────── */}
      {!user ? (
        <View style={styles.guestSection}>
          <Text style={styles.eyebrow}>RELIABLE HOME SERVICES</Text>
          <Text style={styles.heroHeading}>Find trusted help for every home repair.</Text>
          <Text style={styles.heroSubtitle}>
            ProxiFix connects you with verified local professionals for plumbing, electrical repairs, cleaning, carpentry, and more.
          </Text>

          {/* Action buttons matching website's .hero-actions */}
          <View style={styles.heroActionRow}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, styles.heroActionBtn, pressed && styles.btnPrimaryHover]}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.btnPrimaryText}>Find a Worker</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnOutline, styles.heroActionBtn, pressed && { backgroundColor: "#e4f4e8" }]}
              onPress={() => router.push("/register?role=WORKER")}
            >
              <Text style={styles.btnOutlineText}>Join as a Worker</Text>
            </Pressable>
          </View>

          {/* Popular Services Card matching website's .hero-card */}
          <View style={styles.popularCard}>
            <Text style={styles.cardSectionTitle}>Popular services</Text>
            {POPULAR_SERVICES.map((item, idx) => (
              <Pressable
                key={item.title}
                style={({ pressed }) => [
                  styles.quickServiceRow,
                  idx === POPULAR_SERVICES.length - 1 && { borderBottomWidth: 0 },
                  pressed && { backgroundColor: "#f2f9f4" },
                ]}
                onPress={() => router.push("/login")}
              >
                <View style={styles.quickIconBox}>
                  <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickServiceTitle}>{item.title}</Text>
                  <Text style={styles.quickServiceText}>{item.text}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#97bea0" />
              </Pressable>
            ))}
          </View>

          {/* How It Works matching website's .process-section */}
          <View style={styles.processSection}>
            <Text style={styles.eyebrow}>SIMPLE PROCESS</Text>
            <Text style={styles.cardSectionTitle}>Book a home service in three steps.</Text>

            <View style={styles.processCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.processStepTitle}>Choose a service</Text>
              <Text style={styles.processStepDesc}>Select a category and search for verified workers near your current location.</Text>
            </View>

            <View style={styles.processCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.processStepTitle}>Send a booking request</Text>
              <Text style={styles.processStepDesc}>Describe your issue and send a request to the worker you choose.</Text>
            </View>

            <View style={styles.processCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.processStepTitle}>Get the work done</Text>
              <Text style={styles.processStepDesc}>Track your booking, confirm completion, and rate the worker once.</Text>
            </View>
          </View>

          {/* Worker Callout Card matching website's .worker-callout-card */}
          <View style={styles.workerCalloutCard}>
            <Text style={styles.eyebrow}>FOR SERVICE PROFESSIONALS</Text>
            <Text style={styles.workerCalloutTitle}>Grow your work with ProxiFix.</Text>
            <Text style={styles.workerCalloutText}>
              Create a worker profile, wait for admin approval, go online, and receive nearby service requests.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryHover]}
              onPress={() => router.push("/register?role=WORKER")}
            >
              <Text style={styles.btnPrimaryText}>Register as a Worker</Text>
            </Pressable>
          </View>

          {/* Footer matching website's .site-footer */}
          <View style={styles.siteFooter}>
            <Text style={styles.footerText}>© 2026 ProxiFix. Trusted home services made simple.</Text>
            <Text style={styles.footerCredit}>Crafted by Ravi Ranjan Kumar</Text>
          </View>
        </View>
      ) : user.role === "ADMIN" ? (
        /* ─────────────────────────────────────────────────────────────
            2. ADMINISTRATOR DASHBOARD (Matches website AdminDashboard.jsx)
            ───────────────────────────────────────────────────────────── */
        <View>
          <Text style={styles.eyebrow}>ADMINISTRATOR</Text>
          <Text style={styles.heroHeading}>Welcome, {user.name || "Admin"}</Text>
          <Text style={styles.heroSubtitle}>
            Review service professionals, monitor registrations by service, and keep customers safe.
          </Text>

          {/* 4 Summary Cards matching website's .admin-summary-grid */}
          <View style={styles.adminSummaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardIcon}>👷</Text>
              <Text style={styles.summaryCardVal}>{adminSummary.total_workers}</Text>
              <Text style={styles.summaryCardTitle}>Total Workers</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardIcon}>⌛</Text>
              <Text style={[styles.summaryCardVal, { color: "#d97706" }]}>{adminSummary.pending_workers}</Text>
              <Text style={styles.summaryCardTitle}>Pending Approval</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardIcon}>✅</Text>
              <Text style={[styles.summaryCardVal, { color: "#059669" }]}>{adminSummary.approved_workers}</Text>
              <Text style={styles.summaryCardTitle}>Approved</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryCardIcon}>⛔</Text>
              <Text style={[styles.summaryCardVal, { color: "#dc2626" }]}>{adminSummary.rejected_workers}</Text>
              <Text style={styles.summaryCardTitle}>Rejected</Text>
            </View>
          </View>

          {/* Quick Access to STRIDE Security Center & Exact GPS Logs */}
          <Pressable
            style={({ pressed }) => [styles.securityBannerCard, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/admin-portal")}
          >
            <View style={styles.securityBannerLeft}>
              <View style={styles.shieldIconCircle}>
                <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.securityBannerTitle}>STRIDE & DREAD Security Center</Text>
                <Text style={styles.securityBannerSubtitle}>
                  Trace Layer 1 IPs & open Layer 2 Real Device GPS pinpoints in Google Maps
                </Text>
              </View>
            </View>
            <View style={styles.securityBannerArrow}>
              <Ionicons name="chevron-forward" size={18} color="#075c31" />
            </View>
          </Pressable>

          {/* Pending Worker Applications Section */}
          <View style={styles.sectionHeaderBlock}>
            <Text style={styles.eyebrow}>VERIFICATION MANAGEMENT</Text>
            <Text style={styles.sectionHeading}>Pending Worker Applications</Text>
            <Text style={styles.sectionSubtitleText}>
              Verify technician credentials and activate their accounts for dispatch.
            </Text>
          </View>

          {pendingWorkers.length === 0 ? (
            <View style={styles.emptyCardContainer}>
              <Ionicons name="checkmark-circle-outline" size={36} color="#059669" />
              <Text style={styles.emptyCardTitleText}>No Pending Applications</Text>
              <Text style={styles.emptyCardSubText}>All worker registrations are verified and up to date.</Text>
            </View>
          ) : (
            pendingWorkers.map((w) => (
              <View key={w.id} style={styles.workerManageCard}>
                <View style={styles.workerCardTop}>
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerAvatarText}>{w.name ? w.name[0].toUpperCase() : "W"}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.workerNameText}>{w.name}</Text>
                    <Text style={styles.workerMetaText}>{w.email} • {w.phone}</Text>
                    <Text style={styles.workerServiceText}>
                      Services: {w.services?.join(", ") || "General Home Service"}
                    </Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>PENDING</Text>
                  </View>
                </View>

                {w.description && (
                  <Text style={styles.workerBioText}>"{w.description}"</Text>
                )}

                <View style={styles.actionButtonsRow}>
                  <Pressable
                    style={({ pressed }) => [styles.btnReject, pressed && styles.btnRejectHover]}
                    onPress={() => handleUpdateWorkerStatus(w.id, "REJECTED")}
                    disabled={actionLoadingId === w.id}
                  >
                    <Text style={styles.btnRejectText}>Reject</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.btnApprove, pressed && styles.btnApproveHover]}
                    onPress={() => handleUpdateWorkerStatus(w.id, "APPROVED")}
                    disabled={actionLoadingId === w.id}
                  >
                    <Text style={styles.btnApproveText}>Approve Worker</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {/* Service Overview: Registered workers by service */}
          <View style={styles.sectionHeaderBlock}>
            <Text style={styles.eyebrow}>SERVICE OVERVIEW</Text>
            <Text style={styles.sectionHeading}>Registered Workers by Service</Text>
            <Text style={styles.sectionSubtitleText}>Distribution of technicians across categories.</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceCountsScroll}>
            {adminServiceCounts.map((s) => (
              <View key={s.id || s.name} style={styles.serviceCountCard}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>{getCategoryEmoji(s.name)}</Text>
                <Text style={styles.serviceCountName}>{s.name}</Text>
                <Text style={styles.serviceCountTotal}>{s.total_workers || 0} Registered</Text>
                <Text style={styles.serviceCountBreakdown}>
                  {s.approved_workers || 0} approved • {s.pending_workers || 0} pending
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* All Registered Workers Directory */}
          <View style={styles.sectionHeaderBlock}>
            <Text style={styles.eyebrow}>WORKER DIRECTORY</Text>
            <Text style={styles.sectionHeading}>All Registered Workers</Text>
            <Text style={styles.sectionSubtitleText}>
              Showing {adminWorkers.length} registered service providers.
            </Text>
          </View>

          {adminWorkers.map((w) => {
            const isApproved = w.verification_status === "APPROVED";
            return (
              <View key={w.id} style={styles.workerDirectoryCard}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.workerNameText}>{w.name}</Text>
                  <View style={[styles.statusTag, isApproved ? styles.statusTagApproved : styles.statusTagPending]}>
                    <Text style={[styles.statusTagText, isApproved ? styles.statusTagTextApproved : styles.statusTagTextPending]}>
                      {w.verification_status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.workerMetaText}>{w.email} • {w.phone}</Text>
                <Text style={styles.workerServiceText}>
                  {w.services?.join(", ") || "Home Service"} • {w.experience_years || 1} yrs exp
                </Text>

                {isApproved && (
                  <Pressable
                    style={({ pressed }) => [styles.btnTakeOffline, pressed && { backgroundColor: "#fee2e2" }]}
                    onPress={() => handleUpdateWorkerStatus(w.id, "REJECTED")}
                    disabled={actionLoadingId === w.id}
                  >
                    <Ionicons name="ban-outline" size={13} color="#dc2626" />
                    <Text style={styles.btnTakeOfflineText}>Take Offline (Reject)</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      ) : user.role === "WORKER" ? (
        /* ─────────────────────────────────────────────────────────────
            3. WORKER VIEW
            ───────────────────────────────────────────────────────────── */
        <View style={styles.workerRedirectCard}>
          <View style={styles.serviceIconBox}>
            <Text style={{ fontSize: 26 }}>👷</Text>
          </View>
          <Text style={styles.cardHeading}>Worker Workspace</Text>
          <Text style={styles.cardBody}>
            Manage incoming customer booking requests, toggle online availability, and broadcast your live GPS.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryHover]}
            onPress={() => router.push("/worker-portal")}
          >
            <Text style={styles.btnPrimaryText}>Open Worker Workspace</Text>
          </Pressable>
        </View>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            4. AUTHENTICATED CUSTOMER DASHBOARD (Matches CustomerDashboard.jsx)
            ───────────────────────────────────────────────────────────── */
        <View>
          <Text style={styles.eyebrow}>CUSTOMER DASHBOARD</Text>
          <Text style={styles.heroHeading}>Welcome, {user.name || "Customer"}</Text>
          <Text style={styles.heroSubtitle}>
            Find verified professionals near your current location.
          </Text>

          {/* Service Search Card */}
          <View style={styles.dashboardSearchCard}>
            <View style={styles.searchCardHeader}>
              <View style={styles.serviceIconBox}>
                <Text style={styles.serviceEmoji}>🔎</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.searchCardTitle}>Find a Worker</Text>
                <Text style={styles.searchCardSubtitle}>
                  Search verified workers who are online and available now.
                </Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Service Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {services.map((cat) => {
                const isActive = selectedService.toLowerCase() === (cat.name || "").toLowerCase();
                return (
                  <Pressable
                    key={cat.id || cat.name}
                    style={({ pressed }) => [
                      styles.serviceCard,
                      isActive && styles.serviceCardActive,
                      (pressed && !isActive) && styles.serviceCardHover,
                    ]}
                    onPress={() => setSelectedService(cat.name)}
                  >
                    <View style={[styles.serviceIconBoxSmall, isActive && styles.serviceIconBoxActive]}>
                      <Text style={styles.serviceEmojiSmall}>{getCategoryEmoji(cat.name)}</Text>
                    </View>
                    <Text style={[styles.serviceCardText, isActive && styles.serviceCardTextActive]}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Search Radius</Text>
            <View style={styles.radiusBtns}>
              {RADIUS_OPTIONS.map((r) => (
                <Pressable
                  key={r}
                  style={({ pressed }) => [
                    styles.radiusBtn,
                    radius === r && styles.radiusBtnActive,
                    (pressed && radius !== r) && { backgroundColor: "#e4f4e8" },
                  ]}
                  onPress={() => setRadius(r)}
                >
                  <Text style={[styles.radiusBtnText, radius === r && styles.radiusBtnTextActive]}>
                    {r} km
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.btnPrimary, { marginTop: 16 }, pressed && styles.btnPrimaryHover, loading && styles.btnDisabled]}
              onPress={loadNearbyWorkers}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? "Searching..." : "Find Nearby Workers"}
              </Text>
            </Pressable>
          </View>

          {/* Results section */}
          <View style={styles.workerResultsHeader}>
            <Text style={styles.sectionHeading}>
              {hasSearched ? "Available Nearby Workers" : "Available Workers"}
            </Text>
            {hasSearched && (
              <Text style={styles.heroSubtitle}>
                {workers.length > 0
                  ? `${workers.length} available ${selectedService} worker(s) found within ${radius} km.`
                  : `No available ${selectedService} workers found within ${radius} km.`}
              </Text>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#075c31" />
              <Text style={styles.mutedText}>Finding nearest verified professionals...</Text>
            </View>
          ) : hasSearched && workers.length === 0 ? (
            <View style={styles.emptyWorkerCard}>
              <Ionicons name="search-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyWorkerTitle}>No workers available yet</Text>
              <Text style={styles.emptyWorkerDesc}>Try expanding your search radius or choose another category.</Text>
            </View>
          ) : (
            workers.map((worker) => (
              <Pressable
                key={worker.id || worker.user_id}
                style={({ pressed }) => [styles.workerCard, pressed && styles.workerCardHover]}
              >
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerAvatarText}>
                    {worker.name ? worker.name[0].toUpperCase() : "W"}
                  </Text>
                </View>
                <View style={styles.workerCardBody}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerMeta}>{worker.service}</Text>
                  <Text style={styles.workerMeta}>
                    ⭐ {Number(worker.rating || 5.0).toFixed(1)} rating
                  </Text>
                  <Text style={styles.workerMeta}>
                    📍 {worker.distanceKm ? `${Number(worker.distanceKm).toFixed(1)} km away` : "Nearby"}
                  </Text>
                  <Text style={styles.workerMeta}>
                    ₹{worker.minimumCharge || worker.minimum_charge || 250} starting price
                  </Text>
                  <View style={styles.availableBadge}>
                    <Text style={styles.availableBadgeText}>Available now</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.btnPrimary, styles.bookingAction, pressed && styles.btnPrimaryHover]}
                    onPress={() => {
                      router.push({
                        pathname: `/book/${worker.id || worker.user_id}`,
                        params: {
                          serviceCategoryId: worker.serviceCategoryId || worker.service_category_id,
                          serviceName: worker.service || selectedService,
                          workerName: worker.name,
                          minCharge: worker.minimumCharge || worker.minimum_charge || 250,
                        },
                      });
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>Book {worker.name}</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </View>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#effaf3",
    padding: 16,
  },
  locationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginBottom: 20,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  locationInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  locationLabel: { fontSize: 11, color: "#61726a", fontWeight: "600" },
  locationValue: { fontSize: 14, color: "#102a1c", fontWeight: "700", marginTop: 2 },
  refreshLocBtn: {
    backgroundColor: "#e4f4e8",
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  guestSection: { marginTop: 4 },
  eyebrow: {
    color: "#08713d",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  heroHeading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#102a1c",
    lineHeight: 32,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#61726a",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  heroActionRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  heroActionBtn: { flex: 1 },
  popularCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 3,
    marginBottom: 24,
  },
  cardSectionTitle: { fontSize: 18, fontWeight: "800", color: "#102a1c", marginBottom: 16 },
  quickServiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2ee",
    gap: 12,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    backgroundColor: "#e4f4e8",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickServiceTitle: { fontSize: 14, fontWeight: "700", color: "#102a1c" },
  quickServiceText: { fontSize: 12, color: "#61726a", marginTop: 2 },
  processSection: { marginVertical: 12 },
  processCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginBottom: 12,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  stepNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e4f4e8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  stepNumberText: { fontSize: 16, fontWeight: "800", color: "#075c31" },
  processStepTitle: { fontSize: 15, fontWeight: "700", color: "#102a1c", marginBottom: 4 },
  processStepDesc: { fontSize: 13, color: "#61726a", lineHeight: 18 },
  workerCalloutCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 3,
    marginVertical: 12,
  },
  workerCalloutTitle: { fontSize: 20, fontWeight: "800", color: "#102a1c", marginVertical: 6 },
  workerCalloutText: { fontSize: 13, color: "#61726a", lineHeight: 19, marginBottom: 16 },
  siteFooter: {
    marginTop: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#10291a",
    borderRadius: 14,
    alignItems: "center",
  },
  footerText: { color: "#d6e5d8", fontSize: 12, textAlign: "center" },
  footerCredit: { color: "#a9cbb0", fontSize: 11, marginTop: 4, textAlign: "center" },

  // ── Admin Dashboard Styles ──
  adminSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryCardIcon: { fontSize: 22, marginBottom: 6 },
  summaryCardVal: { fontSize: 24, fontWeight: "800", color: "#102a1c" },
  summaryCardTitle: { fontSize: 11, color: "#61726a", fontWeight: "700", marginTop: 2 },
  securityBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#075c31",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    shadowColor: "#075c31",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 3,
  },
  securityBannerLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  shieldIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  securityBannerTitle: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  securityBannerSubtitle: { color: "#d6e5d8", fontSize: 11, marginTop: 2, lineHeight: 15 },
  securityBannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sectionHeaderBlock: { marginTop: 14, marginBottom: 8 },
  sectionHeading: { fontSize: 19, fontWeight: "800", color: "#102a1c", marginBottom: 2 },
  sectionSubtitleText: { fontSize: 12, color: "#61726a", marginBottom: 10 },
  emptyCardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginBottom: 16,
  },
  emptyCardTitleText: { fontSize: 14, fontWeight: "700", color: "#102a1c", marginTop: 6 },
  emptyCardSubText: { fontSize: 12, color: "#61726a", marginTop: 2, textAlign: "center" },
  workerManageCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    marginBottom: 12,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  workerCardTop: { flexDirection: "row", alignItems: "center" },
  workerNameText: { fontSize: 15, fontWeight: "700", color: "#102a1c" },
  workerMetaText: { fontSize: 12, color: "#61726a", marginTop: 2 },
  workerServiceText: { fontSize: 12, color: "#075c31", fontWeight: "600", marginTop: 2 },
  pendingBadge: {
    backgroundColor: "#fff3cf",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: { color: "#8b5c00", fontSize: 10, fontWeight: "800" },
  workerBioText: { fontSize: 12, color: "#475569", fontStyle: "italic", marginTop: 8 },
  actionButtonsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btnReject: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dba2a2",
    alignItems: "center",
  },
  btnRejectHover: { backgroundColor: "#fee2e2" },
  btnRejectText: { color: "#dc2626", fontWeight: "700", fontSize: 13 },
  btnApprove: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#075c31",
    alignItems: "center",
  },
  btnApproveHover: { backgroundColor: "#064a28" },
  btnApproveText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  serviceCountsScroll: { gap: 10, paddingBottom: 10 },
  serviceCountCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    minWidth: 130,
    borderWidth: 1,
    borderColor: "#e1e8e3",
  },
  serviceCountName: { fontSize: 13, fontWeight: "700", color: "#102a1c" },
  serviceCountTotal: { fontSize: 12, color: "#075c31", fontWeight: "700", marginTop: 4 },
  serviceCountBreakdown: { fontSize: 10, color: "#61726a", marginTop: 2 },
  workerDirectoryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginBottom: 8,
  },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusTagApproved: { backgroundColor: "#ddf2e4" },
  statusTagPending: { backgroundColor: "#fff3cf" },
  statusTagText: { fontSize: 10, fontWeight: "800" },
  statusTagTextApproved: { color: "#076332" },
  statusTagTextPending: { color: "#8b5c00" },
  btnTakeOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  btnTakeOfflineText: { fontSize: 11, color: "#dc2626", fontWeight: "600" },

  // ── Worker view ──
  workerRedirectCard: {
    padding: 24,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginTop: 8,
  },
  cardHeading: { fontSize: 18, fontWeight: "800", color: "#102a1c", marginTop: 10, marginBottom: 6 },
  cardBody: { fontSize: 13, color: "#61726a", lineHeight: 19, marginBottom: 16 },

  // ── Customer View Styles ──
  dashboardSearchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 3,
    marginBottom: 20,
  },
  searchCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  searchCardTitle: { fontSize: 18, fontWeight: "800", color: "#102a1c" },
  searchCardSubtitle: { fontSize: 12, color: "#61726a", marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#234534", marginBottom: 8, marginTop: 10 },
  categoryScroll: { paddingBottom: 8, gap: 8 },
  serviceCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    minWidth: 92,
    marginRight: 8,
  },
  serviceCardActive: { borderColor: "#075c31", backgroundColor: "#f7fcf8", borderWidth: 1.5 },
  serviceCardHover: { borderColor: "#78ad87" },
  serviceIconBox: {
    width: 48,
    height: 48,
    backgroundColor: "#e4f4e8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceIconBoxSmall: {
    width: 40,
    height: 40,
    backgroundColor: "#e4f4e8",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  serviceIconBoxActive: { backgroundColor: "#cfeeda" },
  serviceEmoji: { fontSize: 22 },
  serviceEmojiSmall: { fontSize: 20 },
  serviceCardText: { fontSize: 12, fontWeight: "700", color: "#234534", textAlign: "center" },
  serviceCardTextActive: { color: "#075c31" },
  radiusBtns: { flexDirection: "row", gap: 8 },
  radiusBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    alignItems: "center",
  },
  radiusBtnActive: { backgroundColor: "#075c31", borderColor: "#075c31" },
  radiusBtnText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  radiusBtnTextActive: { color: "#ffffff" },
  btnPrimary: {
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
  btnDisabled: { opacity: 0.65 },
  btnPrimaryText: { color: "#ffffff", fontWeight: "800", fontSize: 14 },
  btnOutline: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#075c31",
  },
  btnOutlineText: { color: "#075c31", fontWeight: "800", fontSize: 14 },
  workerResultsHeader: { marginTop: 10, marginBottom: 8 },
  loadingBox: { padding: 36, alignItems: "center" },
  mutedText: { color: "#61726a", fontSize: 13, marginTop: 10 },
  emptyWorkerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginTop: 8,
  },
  emptyWorkerTitle: { fontSize: 16, fontWeight: "700", color: "#102a1c", marginTop: 8 },
  emptyWorkerDesc: { fontSize: 13, color: "#61726a", textAlign: "center", marginTop: 4 },
  workerCard: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  workerCardHover: { borderColor: "#78ad87", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12 },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ddf2e4",
    alignItems: "center",
    justifyContent: "center",
  },
  workerAvatarText: { color: "#075c31", fontSize: 20, fontWeight: "800" },
  workerCardBody: { flex: 1 },
  workerName: { fontSize: 16, fontWeight: "700", color: "#102a1c", marginBottom: 4 },
  workerMeta: { fontSize: 13, color: "#61726a", marginBottom: 3 },
  availableBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ddf2e4",
    borderRadius: 999,
  },
  availableBadgeText: { color: "#076332", fontSize: 11, fontWeight: "800" },
  bookingAction: { marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 16, minHeight: 38 },
});
