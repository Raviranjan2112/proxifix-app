import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [role, setRole] = useState<"CUSTOMER" | "WORKER">("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [minimumCharge, setMinimumCharge] = useState("300");
  const [experienceYears, setExperienceYears] = useState("3");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const payload: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role,
    };
    if (role === "WORKER") {
      payload.minimumCharge = Number(minimumCharge) || 250;
      payload.experienceYears = Number(experienceYears) || 1;
      payload.description = description.trim() || "Experienced home services professional";
    }
    const res = await register(payload);
    setSubmitting(false);
    if (res.success) {
      Alert.alert(
        "Account Created",
        role === "WORKER"
          ? "Welcome to ProxiFix Worker Network! Your profile is submitted for review."
          : "Your customer account has been registered successfully!"
      );
      router.replace(role === "WORKER" ? "/worker-portal" : "/(tabs)");
    } else {
      Alert.alert("Registration Failed", res.message || "Could not register account.");
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focused === field && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#effaf3" }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.authCard}>
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>P</Text>
            </View>
            <Text style={styles.brandName}>ProxiFix</Text>
          </View>

          <Text style={styles.eyebrow}>JOIN THE NETWORK</Text>
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.muted}>
            Join ProxiFix to discover or offer verified on-demand local services.
          </Text>

          {/* Role Toggle — mirrors website's role selector */}
          <View style={styles.roleToggle}>
            <Pressable
              style={[styles.roleTab, role === "CUSTOMER" && styles.roleTabActive]}
              onPress={() => setRole("CUSTOMER")}
            >
              <Ionicons
                name="person"
                size={16}
                color={role === "CUSTOMER" ? "#ffffff" : "#475569"}
              />
              <Text style={[styles.roleTabText, role === "CUSTOMER" && styles.roleTabTextActive]}>
                I Need Services
              </Text>
            </Pressable>
            <Pressable
              style={[styles.roleTab, role === "WORKER" && styles.roleTabActive]}
              onPress={() => setRole("WORKER")}
            >
              <Ionicons
                name="hammer"
                size={16}
                color={role === "WORKER" ? "#ffffff" : "#475569"}
              />
              <Text style={[styles.roleTabText, role === "WORKER" && styles.roleTabTextActive]}>
                I Am a Worker
              </Text>
            </Pressable>
          </View>

          <View style={styles.authForm}>
            <View>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={inputStyle("name")}
                placeholder="Ravi Kumar"
                placeholderTextColor="#94b3a0"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused("")}
              />
            </View>
            <View>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={inputStyle("email")}
                placeholder="ravi@example.com"
                placeholderTextColor="#94b3a0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused("")}
              />
            </View>
            <View>
              <Text style={styles.label}>Mobile Phone *</Text>
              <TextInput
                style={inputStyle("phone")}
                placeholder="+91 98765 43210"
                placeholderTextColor="#94b3a0"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocused("phone")}
                onBlur={() => setFocused("")}
              />
            </View>
            <View>
              <Text style={styles.label}>Password (min 6 chars) *</Text>
              <TextInput
                style={inputStyle("password")}
                placeholder="Create password"
                placeholderTextColor="#94b3a0"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused("")}
              />
            </View>

            {role === "WORKER" && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionSubHeading}>Professional Profile</Text>
                <View>
                  <Text style={styles.label}>Starting Service Fee (₹) *</Text>
                  <TextInput
                    style={inputStyle("charge")}
                    placeholder="300"
                    placeholderTextColor="#94b3a0"
                    keyboardType="numeric"
                    value={minimumCharge}
                    onChangeText={setMinimumCharge}
                    onFocus={() => setFocused("charge")}
                    onBlur={() => setFocused("")}
                  />
                </View>
                <View>
                  <Text style={styles.label}>Years of Experience *</Text>
                  <TextInput
                    style={inputStyle("exp")}
                    placeholder="4"
                    placeholderTextColor="#94b3a0"
                    keyboardType="numeric"
                    value={experienceYears}
                    onChangeText={setExperienceYears}
                    onFocus={() => setFocused("exp")}
                    onBlur={() => setFocused("")}
                  />
                </View>
                <View>
                  <Text style={styles.label}>Service Experience Bio</Text>
                  <TextInput
                    style={[inputStyle("bio"), { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                    placeholder="Certified electrician specializing in residential repairs..."
                    placeholderTextColor="#94b3a0"
                    multiline
                    value={description}
                    onChangeText={setDescription}
                    onFocus={() => setFocused("bio")}
                    onBlur={() => setFocused("")}
                  />
                </View>
              </>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.btnPrimaryHover,
                submitting && styles.btnDisabled,
              ]}
              onPress={handleRegister}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {role === "WORKER" ? "Register as Professional" : "Create Customer Account"}
                </Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.muted}>
            Already registered?{" "}
            <Text style={styles.link} onPress={() => router.push("/login")}>
              Sign In
            </Text>
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#effaf3",
    padding: 20,
    paddingTop: 32,
  },
  authCard: {
    width: "100%",
    padding: 32,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    borderRadius: 18,
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 45,
    elevation: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#075c31",
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },
  brandName: {
    color: "#075c31",
    fontSize: 22,
    fontWeight: "800",
  },
  eyebrow: {
    color: "#08713d",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heading: {
    color: "#102a1c",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  muted: {
    color: "#61726a",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  roleToggle: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    padding: 4,
    marginTop: 18,
    marginBottom: 4,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  roleTabActive: {
    backgroundColor: "#075c31",
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  roleTabTextActive: {
    color: "#ffffff",
  },
  authForm: {
    gap: 14,
    marginTop: 18,
    marginBottom: 18,
  },
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
  divider: {
    height: 1,
    backgroundColor: "#e1e8e3",
    marginVertical: 4,
  },
  sectionSubHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102a1c",
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
    marginTop: 4,
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
    fontSize: 15,
  },
  link: {
    color: "#075c31",
    fontWeight: "700",
  },
});
