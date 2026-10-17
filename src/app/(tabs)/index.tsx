import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
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
  if (lower.includes("appliance")) return "construct";
  return "construct";
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
      console.warn("Could not load dynamic services, using defaults:", e);
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
        Alert.alert(
          "Location Permission",
          "Permission denied. Using default location (Bhopal)."
        );
        const fallback = { latitude: 23.2599, longitude: 77.4126 };
        setCoords(fallback);
        setLocationName("Bhopal, MP (Default)");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const current = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCoords(current);

      try {
        const reverse = await Location.reverseGeocodeAsync(current);
        if (reverse && reverse.length > 0) {
          const item = reverse[0];
          setLocationName(
            `${item.city || item.district || item.subregion || "Near you"}, ${item.region || item.country || ""}`
          );
        } else {
          setLocationName(`${current.latitude.toFixed(3)}°N, ${current.longitude.toFixed(3)}°E`);
        }
      } catch {
        setLocationName(`${current.latitude.toFixed(3)}°N, ${current.longitude.toFixed(3)}°E`);
      }
    } catch (err) {
      console.warn("Location error:", err);
      const fallback = { latitude: 23.2599, longitude: 77.4126 };
      setCoords(fallback);
      setLocationName("Bhopal, MP");
    }
  }

  async function loadNearbyWorkers() {
    if (!user) {
      setWorkers([]);
      setLoading(false);
      return;
    }
    if (!coords) return;
    setLoading(true);
    try {
      const activeService = selectedService || (services[0]?.name ?? "AC Repair");
      const params: any = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius: Math.min(radius, 20),
        service: activeService,
      };

      const res = await api.get("/workers/nearby", { params });
      if (res.data?.success) {
        setWorkers(res.data.workers || []);
      }
    } catch (err: any) {
      console.error("Failed to load nearby workers:", err?.response?.data?.message || err?.message || err);
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Role Banner for Workers or Admins */}
      {user?.role === "WORKER" && (
        <TouchableOpacity
          style={styles.roleBanner}
          onPress={() => router.push("/worker-portal")}
        >
          <Ionicons name="briefcase" size={20} color="#FFFFFF" />
          <Text style={styles.roleBannerText}>Switch to Worker Workspace (Incoming Jobs & GPS)</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {user?.role === "ADMIN" && (
        <TouchableOpacity
          style={[styles.roleBanner, { backgroundColor: "#4F46E5" }]}
          onPress={() => router.push("/admin-portal")}
        >
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.roleBannerText}>Open Admin Security & Audit Center</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* GPS Location Bar */}
      <View style={styles.locationCard}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={20} color="#2563EB" />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.locationLabel}>Your Hardware GPS Location</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {locationName}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.refreshLocButton}
          onPress={requestDeviceLocation}
        >
          <Ionicons name="locate" size={18} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <Text style={styles.sectionTitle}>Service Categories</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {services.map((cat) => {
          const isActive = selectedService.toLowerCase() === (cat.name || "").toLowerCase();
          return (
            <TouchableOpacity
              key={cat.id || cat.name}
              style={[styles.categoryPill, isActive && styles.categoryPillActive]}
              onPress={() => setSelectedService(cat.name)}
            >
              <Ionicons
                name={getCategoryIcon(cat.name)}
                size={16}
                color={isActive ? "#FFFFFF" : "#475569"}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  isActive && styles.categoryPillTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Radius Filters */}
      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>Search Radius:</Text>
        <View style={styles.radiusButtons}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
              onPress={() => setRadius(r)}
            >
              <Text
                style={[
                  styles.radiusBtnText,
                  radius === r && styles.radiusBtnTextActive,
                ]}
              >
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Worker List */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>
          Nearby Service Providers {user ? `(${workers.length})` : ""}
        </Text>
      </View>

      {!user ? (
        <View style={styles.authGateCard}>
          <View style={styles.authGateIconCircle}>
            <Ionicons name="lock-closed" size={30} color="#2563EB" />
          </View>
          <Text style={styles.authGateTitle}>Sign In to View Available Workers</Text>
          <Text style={styles.authGateSubtitle}>
            To protect worker security and verify dispatch locations, please sign in or register to browse technicians and book services.
          </Text>
          <View style={styles.authGateActions}>
            <TouchableOpacity
              style={styles.signInGateBtn}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.signInGateBtnText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerGateBtn}
              onPress={() => router.push("/register")}
            >
              <Text style={styles.registerGateBtnText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Finding nearest verified professionals...</Text>
        </View>
      ) : workers.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="search-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No workers found nearby</Text>
          <Text style={styles.emptySubtitle}>
            Try expanding your search radius to 20 km or choose another service category.
          </Text>
        </View>
      ) : (
        workers.map((worker) => (
          <View key={worker.id || worker.user_id} style={styles.workerCard}>
            <View style={styles.workerTopRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {worker.name ? worker.name[0].toUpperCase() : "W"}
                </Text>
              </View>
              <View style={styles.workerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                </View>
                <Text style={styles.workerMeta}>
                  {worker.city || "Available now"} • ⭐ {Number(worker.rating || 5.0).toFixed(1)}
                </Text>
              </View>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>
                  {worker.distanceKm ? `${Number(worker.distanceKm).toFixed(1)} km` : "Nearby"}
                </Text>
              </View>
            </View>

            {/* Services badges */}
            <View style={styles.servicesRow}>
              <View style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>{worker.service || selectedService}</Text>
              </View>
            </View>

            {/* Bottom Row */}
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.chargeLabel}>Starting Charge</Text>
                <Text style={styles.chargeValue}>
                  ₹{worker.minimumCharge || worker.minimum_charge || 250}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => {
                  if (!user) {
                    Alert.alert(
                      "Login Required",
                      "Please sign in or create an account to book this service provider.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Sign In", onPress: () => router.push("/login") },
                      ]
                    );
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
                <Text style={styles.bookButtonText}>Book Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  roleBanner: {
    backgroundColor: "#16A34A",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  roleBannerText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
    marginHorizontal: 8,
  },
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  locationValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
    marginTop: 2,
  },
  refreshLocButton: {
    backgroundColor: "#EFF6FF",
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
  },
  categoryScroll: {
    paddingBottom: 12,
    gap: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 6,
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  radiusButtons: {
    flexDirection: "row",
    gap: 6,
  },
  radiusBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  radiusBtnActive: {
    backgroundColor: "#2563EB",
  },
  radiusBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  radiusBtnTextActive: {
    color: "#FFFFFF",
  },
  listHeader: {
    marginTop: 8,
    marginBottom: 8,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 13,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  workerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  workerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  workerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  workerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  workerMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  distanceBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  distanceText: {
    color: "#065F46",
    fontSize: 12,
    fontWeight: "700",
  },
  servicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 10,
  },
  serviceChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  serviceChipText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    marginTop: 4,
  },
  chargeLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  chargeValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  bookButton: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  authGateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  authGateIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  authGateTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  authGateSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  authGateActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  signInGateBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  signInGateBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  registerGateBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  registerGateBtnText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "600",
  },
});
