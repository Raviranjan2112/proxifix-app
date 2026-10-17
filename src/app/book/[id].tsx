import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function BookScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const serviceCategoryId = params.serviceCategoryId as string;
  const serviceName = (params.serviceName as string) || "Home Service";
  const workerName = (params.workerName as string) || "Professional";
  const minCharge = (params.minCharge as string) || "250";

  const router = useRouter();
  const { user } = useAuth();

  const [description, setDescription] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("Acquiring current GPS location...");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState("");

  useEffect(() => {
    async function getLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCoords(c);
          try {
            const rev = await Location.reverseGeocodeAsync(c);
            if (rev?.length > 0) {
              const r = rev[0];
              setAddress(`${r.name || r.street || "Current Address"}, ${r.city || r.district || ""}`);
            } else {
              setAddress(`${c.latitude.toFixed(4)}°N, ${c.longitude.toFixed(4)}°E`);
            }
          } catch {
            setAddress(`${c.latitude.toFixed(4)}°N, ${c.longitude.toFixed(4)}°E`);
          }
        } else {
          setCoords({ latitude: 23.2599, longitude: 77.4126 });
          setAddress("Bhopal, Madhya Pradesh");
        }
      } catch {
        setCoords({ latitude: 23.2599, longitude: 77.4126 });
        setAddress("Bhopal, Madhya Pradesh");
      }
    }
    getLocation();
  }, []);

  const handleCreateBooking = async () => {
    if (description.trim().length < 10) {
      Alert.alert("Job Details", "Please provide at least 10 characters explaining the service issue.");
      return;
    }
    if (!coords) {
      Alert.alert("Location Error", "Could not capture your location coordinates.");
      return;
    }
    setSubmitting(true);
    try {
      let categoryId = serviceCategoryId;
      if (!categoryId) {
        const sRes = await api.get("/services");
        const found = (sRes.data?.services || []).find((s: any) =>
          s.name.toLowerCase() === serviceName.toLowerCase()
        );
        categoryId = found ? found.id : sRes.data?.services?.[0]?.id;
      }
      const payload: any = {
        workerId: id,
        serviceCategoryId: categoryId,
        serviceDescription: description.trim(),
        customerAddress: address.length >= 5 ? address : "Bhopal, Madhya Pradesh",
        customerLatitude: coords.latitude,
        customerLongitude: coords.longitude,
      };
      if (scheduledTime.trim()) payload.scheduledTime = new Date().toISOString();

      const res = await api.post("/bookings", payload);
      if (res.data?.success) {
        Alert.alert(
          "Booking Confirmed! 🚀",
          "Your service request has been sent. You can track progress in the Bookings tab.",
          [{ text: "View Bookings", onPress: () => router.replace("/(tabs)/bookings") }]
        );
      } else {
        Alert.alert("Booking Failed", res.data?.message || "Could not complete booking.");
      }
    } catch (err: any) {
      Alert.alert("Booking Error", err.response?.data?.message || "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focused === field && styles.inputFocused,
  ];

  return (
    <ScrollView style={styles.container}>
      {/* booking-form-card */}
      <View style={styles.bookingFormCard}>
        <Text style={styles.eyebrow}>SCHEDULE APPOINTMENT</Text>
        <Text style={styles.heading}>Book {workerName}</Text>
        <Text style={styles.muted}>
          {serviceName} · ₹{minCharge} starting price
        </Text>

        {/* Location confirmation — .tracking-panel style */}
        <View style={styles.locBox}>
          <Ionicons name="location-sharp" size={16} color="#076332" />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.locLabel}>Service Delivery Location</Text>
            <Text style={styles.locText} numberOfLines={2}>{address}</Text>
          </View>
        </View>

        {/* Form fields matching auth-form */}
        <View style={styles.authForm}>
          <View>
            <Text style={styles.label}>Requested Time</Text>
            <TextInput
              style={inputStyle("time")}
              value={scheduledTime}
              onChangeText={setScheduledTime}
              placeholder="e.g. Today at 4:00 PM"
              placeholderTextColor="#94b3a0"
              onFocus={() => setFocused("time")}
              onBlur={() => setFocused("")}
            />
          </View>

          <View>
            <Text style={styles.label}>Describe the issue or task *</Text>
            <TextInput
              style={[inputStyle("desc"), { height: 100, textAlignVertical: "top", paddingTop: 12 }]}
              placeholder="e.g. Kitchen tap is leaking near the joint..."
              placeholderTextColor="#94b3a0"
              multiline
              value={description}
              onChangeText={setDescription}
              onFocus={() => setFocused("desc")}
              onBlur={() => setFocused("")}
            />
          </View>

          {/* Shield info — .form-success style */}
          <View style={styles.formSuccess}>
            <Ionicons name="shield-checkmark" size={14} color="#076332" />
            <Text style={styles.formSuccessText}>
              Direct on-demand dispatch with STRIDE non-repudiation audit logging.
            </Text>
          </View>

          {/* admin-actions buttons row */}
          <View style={styles.adminActions}>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                styles.actionBtn,
                pressed && styles.btnPrimaryHover,
                submitting && styles.btnDisabled,
              ]}
              onPress={handleCreateBooking}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Send Booking Request</Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnOutline,
                styles.actionBtn,
                pressed && { backgroundColor: "#e4f4e8" },
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
  // .booking-form-card
  bookingFormCard: {
    padding: 28,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    borderRadius: 16,
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 3,
  },
  eyebrow: {
    color: "#08713d",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#102a1c",
    marginBottom: 4,
  },
  muted: {
    color: "#61726a",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  // .tracking-panel style for location
  locBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7fcf8",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d4e8d8",
    marginBottom: 16,
  },
  locLabel: { fontSize: 11, color: "#047857", fontWeight: "700" },
  locText: { fontSize: 13, color: "#065F46", fontWeight: "700", marginTop: 2 },
  authForm: { gap: 16 },
  label: {
    color: "#234534",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },
  input: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 14,
    color: "#102a1c",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bdccc3",
    borderRadius: 9,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: "#08713d",
    shadowColor: "#08713d",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  // .form-success
  formSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#ddf2e4",
    borderRadius: 8,
  },
  formSuccessText: {
    fontSize: 12,
    color: "#076332",
    flex: 1,
    lineHeight: 17,
  },
  // .admin-actions
  adminActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  actionBtn: { flex: 1, minWidth: 120 },
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
});
