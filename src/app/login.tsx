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
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [btnPressed, setBtnPressed] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Required Fields", "Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (res.success && res.user) {
      if (res.user.role === "ADMIN") router.replace("/admin-portal");
      else if (res.user.role === "WORKER") router.replace("/worker-portal");
      else router.replace("/(tabs)");
    } else {
      Alert.alert("Login Failed", res.message || "Invalid email or password.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#effaf3" }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* auth-card */}
        <View style={styles.authCard}>
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>P</Text>
            </View>
            <Text style={styles.brandName}>ProxiFix</Text>
          </View>

          {/* Eyebrow */}
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.heading}>Login to ProxiFix</Text>
          <Text style={styles.muted}>Access your customer or worker account.</Text>

          {/* Form */}
          <View style={styles.authForm}>
            <View>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                placeholder="you@example.com"
                placeholderTextColor="#94b3a0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, passFocused && styles.inputFocused]}
                placeholder="Enter your password"
                placeholderTextColor="#94b3a0"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                (pressed || btnPressed || submitting) && styles.btnPrimaryHover,
                submitting && styles.btnDisabled,
              ]}
              onPress={handleLogin}
              disabled={submitting}
              onPressIn={() => setBtnPressed(true)}
              onPressOut={() => setBtnPressed(false)}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Login</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.muted}>
            Do not have an account?{" "}
            <Text
              style={styles.link}
              onPress={() => router.push("/register")}
            >
              Create account
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#effaf3",
    padding: 20,
    justifyContent: "center",
    // mirrors auth-page background
    backgroundImage: undefined,
  },
  authCard: {
    width: "100%",
    alignSelf: "center",
    padding: 32,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e1e8e3",
    borderRadius: 18,
    // box-shadow: 0 16px 45px rgba(17,66,38,0.1)
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
    marginBottom: 32,
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
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  muted: {
    color: "#61726a",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  authForm: {
    gap: 16,
    marginTop: 20,
    marginBottom: 20,
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
    // box-shadow: 0 0 0 3px rgba(8,113,61,0.12)
    shadowColor: "#08713d",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
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
    fontSize: 15,
  },
  link: {
    color: "#075c31",
    fontWeight: "700",
  },
});
