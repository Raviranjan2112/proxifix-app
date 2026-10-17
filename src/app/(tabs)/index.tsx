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

function getCategoryIcon(name: string): any {
  const lower = (name || "").toLowerCase();
  if (lower.includes("electric")) return "flash";
  if (lower.includes("plumb")) return "water";
  if (lower.includes("ac") || lower.includes("air")) return "snow";
  if (lower.includes("carpent")) return "hammer";
  if (lower.includes("paint")) return "color-palette";
  if (lower.includes("clean")) return "sparkles";
  return "construct";
}

function getCategoryEmoji(name: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("electric")) return "⚡";
  if (lower.includes("plumb")) return "🔧";
  if (lower.includes("ac") || lower.includes("air")) return "❄️";
  if (lower.includes("carpent")) return "🪚";
  if (lower.includes("paint")) return "🎨";
  if (lower.includes("clean")) return "🧹";
  return "🔨";
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>("AC Repair");
  const [radius, setRadius] = useState(15);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#075c31" />}
    >
      {/* Role Banner */}
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

      {/* GPS Location Bar — matches website's topbar style */}
      <View style={styles.locationCard}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={18} color="#075c31" />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.locationLabel}>Your Location</Text>
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

      {/* Eyebrow */}
      <Text style={styles.eyebrow}>OUR SERVICES</Text>
      <Text style={styles.sectionHeading}>Find a Worker</Text>
      <Text style={styles.sectionSubtitle}>
        Search verified workers who are online and available now.
      </Text>

      {/* Service Category Pills — matches website's .service-card hover */}
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
              <View style={[styles.serviceIconBox, isActive && styles.serviceIconBoxActive]}>
                <Text style={styles.serviceEmoji}>{getCategoryEmoji(cat.name)}</Text>
              </View>
              <Text style={[styles.serviceCardText, isActive && styles.serviceCardTextActive]}>
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Radius selector — mirrors website's select */}
      <View style={styles.radiusRow}>
        <Text style={styles.label}>Search radius</Text>
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
      </View>

      {/* Search button — btn-primary */}
      <Pressable
        style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryHover, loading && styles.btnDisabled]}
        onPress={loadNearbyWorkers}
        disabled={loading || !user}
      >
        <Text style={styles.btnPrimaryText}>
          {loading ? "Searching..." : "Find Nearby Workers"}
        </Text>
      </Pressable>

      {/* Results section */}
      <View style={styles.workerResultsHeader}>
        <Text style={styles.sectionHeading}>
          {hasSearched ? "Available nearby workers" : "Workers"}
        </Text>
        {hasSearched && workers.length > 0 && (
          <Text style={styles.sectionSubtitle}>
            {workers.length} available {selectedService} worker(s) found within {radius} km.
          </Text>
        )}
      </View>

      {!user ? (
        /* Auth gate — mirrors website's .hero-card */
        <View style={styles.heroCard}>
          <View style={styles.serviceIconBox}>
            <Text style={styles.serviceEmoji}>🔎</Text>
          </View>
          <Text style={styles.cardHeading}>Sign In to View Available Workers</Text>
          <Text style={styles.cardBody}>
            To protect worker security and verify dispatch locations, please sign in or register to browse technicians.
          </Text>
          <View style={styles.heroActions}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, styles.heroBtn, pressed && styles.btnPrimaryHover]}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.btnPrimaryText}>Find a Worker</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnOutline, styles.heroBtn, pressed && { backgroundColor: "#e4f4e8" }]}
              onPress={() => router.push("/register")}
            >
              <Text style={styles.btnOutlineText}>Join as a Worker</Text>
            </Pressable>
          </View>
        </View>
      ) : loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#075c31" />
          <Text style={styles.mutedText}>Finding nearest verified professionals...</Text>
        </View>
      ) : hasSearched && workers.length === 0 ? (
        <View style={styles.workerCard}>
          <View>
            <Text style={styles.workerName}>No workers available yet</Text>
            <Text style={styles.workerMeta}>Try a larger radius or choose a different service category.</Text>
          </View>
        </View>
      ) : (
        /* Worker Cards — exactly matches .worker-card + .worker-avatar */
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
                  if (!user) {
                    Alert.alert("Login Required", "Please sign in to book.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Sign In", onPress: () => router.push("/login") },
                    ]);
                  } else {
                    router.push({
                      pathname: `/book/${worker.id || worker.user_id}`,
                      params: {
                        serviceCategoryId: worker.serviceCategoryId || worker.service_category_id,
                        serviceName: worker.service || selectedService,
                        workerName: worker.name,
                        minCharge: worker.minimumCharge || worker.minimum_charge || 250,
                      },
                    });
                  }
                }}
              >
                <Text style={styles.btnPrimaryText}>Book {worker.name}</Text>
              </Pressable>
            </View>
          </Pressable>
        ))
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // mirrors customer-dashboard-shell background
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
  // Location card — like .topbar style
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
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
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
  // Eyebrow text matching .eyebrow
  eyebrow: {
    color: "#08713d",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  // h2 matching
  sectionHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102a1c",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "#61726a",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  label: {
    color: "#234534",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  // Service cards — match .service-card
  categoryScroll: {
    paddingBottom: 16,
    gap: 10,
  },
  serviceCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    minWidth: 100,
    marginRight: 10,
    // transition: transform .22s ease, border-color .22s ease
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 2,
  },
  serviceCardActive: {
    borderColor: "#75ad85",
    // translateY(-8px) equivalent — subtle on mobile
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 38,
    elevation: 5,
  },
  serviceCardHover: {
    borderColor: "#75ad85",
    shadowOffset: { width: 0, height: 18 },
  },
  serviceIconBox: {
    width: 54,
    height: 54,
    backgroundColor: "#e4f4e8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  serviceIconBoxActive: {
    backgroundColor: "#cfeeda",
  },
  serviceEmoji: {
    fontSize: 24,
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
  // Radius
  radiusRow: { marginBottom: 14 },
  radiusBtns: { flexDirection: "row", gap: 8 },
  radiusBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e8e3",
  },
  radiusBtnActive: {
    backgroundColor: "#075c31",
    borderColor: "#075c31",
  },
  radiusBtnText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  radiusBtnTextActive: { color: "#ffffff" },
  // btn-primary — exact match
  btnPrimary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 20,
    backgroundColor: "#075c31",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 4,
  },
  btnPrimaryHover: { backgroundColor: "#064a28" },
  btnDisabled: { opacity: 0.65 },
  btnPrimaryText: { color: "#ffffff", fontWeight: "800", fontSize: 14 },
  // btn-outline
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
  // Worker results header
  workerResultsHeader: { marginTop: 24, marginBottom: 8 },
  loadingBox: { padding: 40, alignItems: "center" },
  mutedText: { color: "#61726a", fontSize: 13, marginTop: 10 },
  // Hero card — matches .hero-card
  heroCard: {
    padding: 28,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e1e8e3",
    shadowColor: "#14532d",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 44,
    elevation: 4,
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102a1c",
    marginBottom: 8,
    marginTop: 12,
  },
  cardBody: {
    color: "#61726a",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  heroActions: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  heroBtn: { flex: 1, marginBottom: 0 },
  // Worker card — matches .worker-card exactly
  workerCard: {
    flexDirection: "row",
    gap: 16,
    padding: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 2,
    // warm mint gradient — matches nth-child odd
    // (React Native doesn't support CSS gradients but we mimic with border)
  },
  workerCardHover: {
    borderColor: "#78ad87",
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.15,
    shadowRadius: 38,
    elevation: 6,
  },
  // .worker-avatar
  workerAvatar: {
    flexShrink: 0,
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
  workerCardBody: { flex: 1 },
  workerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102a1c",
    marginBottom: 6,
  },
  workerMeta: {
    fontSize: 13,
    color: "#61726a",
    marginBottom: 4,
  },
  // .available badge
  availableBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#ddf2e4",
    borderRadius: 999,
  },
  availableBadgeText: {
    color: "#076332",
    fontSize: 11,
    fontWeight: "800",
  },
  // .booking-action
  bookingAction: {
    marginTop: 8,
    marginBottom: 0,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    minHeight: 38,
  },
});
