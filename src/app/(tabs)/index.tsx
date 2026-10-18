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
  return "🔨";
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>("AC Repair");
  const [radius, setRadius] = useState(15);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState("Detecting location...");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    requestDeviceLocation();
    loadServices();
  }, []);

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

  useEffect(() => {
    if (coords && selectedService && user) {
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

  const onRefresh = () => {
    setRefreshing(true);
    requestDeviceLocation();
    if (user) {
      loadNearbyWorkers();
    } else {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#075c31" />}
    >
      {/* Role Banner if Worker or Admin */}
      {user?.role === "WORKER" && (
        <Pressable
          style={({ pressed }) => [styles.roleBanner, pressed && { opacity: 0.85 }]}
          onPress={() => router.push("/worker-portal")}
        >
          <Ionicons name="briefcase" size={18} color="#ffffff" />
          <Text style={styles.roleBannerText}>Switch to Worker Workspace</Text>
          <Ionicons name="chevron-forward" size={16} color="#ffffff" />
        </Pressable>
      )}
      {user?.role === "ADMIN" && (
        <Pressable
          style={({ pressed }) => [styles.roleBanner, { backgroundColor: "#064a28" }, pressed && { opacity: 0.85 }]}
          onPress={() => router.push("/admin-portal")}
        >
          <Ionicons name="shield-checkmark" size={18} color="#ffffff" />
          <Text style={styles.roleBannerText}>Open Admin Security & Audit Center</Text>
          <Ionicons name="chevron-forward" size={16} color="#ffffff" />
        </Pressable>
      )}

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

      {/* ── UNHEALTHY / GUEST VIEW (Matches website HomePage.jsx) ── */}
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
      ) : (
        /* ── AUTHENTICATED CUSTOMER DASHBOARD (Matches CustomerDashboard.jsx) ── */
        <View>
          <Text style={styles.eyebrow}>CUSTOMER DASHBOARD</Text>
          <Text style={styles.heroHeading}>Welcome, {user?.name || "Customer"}</Text>
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
  roleBanner: {
    backgroundColor: "#075c31",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  roleBannerText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
    flex: 1,
    marginHorizontal: 8,
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
  guestSection: {
    marginTop: 4,
  },
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
  heroActionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  heroActionBtn: {
    flex: 1,
  },
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
  cardSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102a1c",
    marginBottom: 16,
  },
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
  quickServiceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102a1c",
  },
  quickServiceText: {
    fontSize: 12,
    color: "#61726a",
    marginTop: 2,
  },
  processSection: {
    marginVertical: 12,
  },
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
  stepNumberText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#075c31",
  },
  processStepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#102a1c",
    marginBottom: 4,
  },
  processStepDesc: {
    fontSize: 13,
    color: "#61726a",
    lineHeight: 18,
  },
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
  workerCalloutTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102a1c",
    marginVertical: 6,
  },
  workerCalloutText: {
    fontSize: 13,
    color: "#61726a",
    lineHeight: 19,
    marginBottom: 16,
  },
  siteFooter: {
    marginTop: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#10291a",
    borderRadius: 14,
    alignItems: "center",
  },
  footerText: {
    color: "#d6e5d8",
    fontSize: 12,
    textAlign: "center",
  },
  footerCredit: {
    color: "#a9cbb0",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
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
  searchCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102a1c",
  },
  searchCardSubtitle: {
    fontSize: 12,
    color: "#61726a",
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#234534",
    marginBottom: 8,
    marginTop: 10,
  },
  categoryScroll: {
    paddingBottom: 8,
    gap: 8,
  },
  serviceCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    minWidth: 92,
    marginRight: 8,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  serviceCardActive: {
    borderColor: "#075c31",
    backgroundColor: "#f7fcf8",
    borderWidth: 1.5,
  },
  serviceCardHover: {
    borderColor: "#78ad87",
  },
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
  serviceIconBoxActive: {
    backgroundColor: "#cfeeda",
  },
  serviceEmoji: {
    fontSize: 22,
  },
  serviceEmojiSmall: {
    fontSize: 20,
  },
  serviceCardText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#234534",
    textAlign: "center",
  },
  serviceCardTextActive: {
    color: "#075c31",
  },
  radiusBtns: {
    flexDirection: "row",
    gap: 8,
  },
  radiusBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    alignItems: "center",
  },
  radiusBtnActive: {
    backgroundColor: "#075c31",
    borderColor: "#075c31",
  },
  radiusBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  radiusBtnTextActive: {
    color: "#ffffff",
  },
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
  btnPrimaryHover: {
    backgroundColor: "#064a28",
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnPrimaryText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
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
  btnOutlineText: {
    color: "#075c31",
    fontWeight: "800",
    fontSize: 14,
  },
  workerResultsHeader: {
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102a1c",
    marginBottom: 4,
  },
  loadingBox: {
    padding: 36,
    alignItems: "center",
  },
  mutedText: {
    color: "#61726a",
    fontSize: 13,
    marginTop: 10,
  },
  emptyWorkerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    marginTop: 8,
  },
  emptyWorkerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102a1c",
    marginTop: 8,
  },
  emptyWorkerDesc: {
    fontSize: 13,
    color: "#61726a",
    textAlign: "center",
    marginTop: 4,
  },
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
  workerCardHover: {
    borderColor: "#78ad87",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ddf2e4",
    alignItems: "center",
    justifyContent: "center",
  },
  workerAvatarText: {
    color: "#075c31",
    fontSize: 20,
    fontWeight: "800",
  },
  workerCardBody: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102a1c",
    marginBottom: 4,
  },
  workerMeta: {
    fontSize: 13,
    color: "#61726a",
    marginBottom: 3,
  },
  availableBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ddf2e4",
    borderRadius: 999,
  },
  availableBadgeText: {
    color: "#076332",
    fontSize: 11,
    fontWeight: "800",
  },
  bookingAction: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    minHeight: 38,
  },
});
