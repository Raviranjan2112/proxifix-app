import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { C, RADIUS, SHADOW } from "../../constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of ProxiFix?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.enterpriseHero}>
          <View style={styles.securityPill}>
            <Ionicons name="person-outline" size={12} color={C.brand} />
            <Text style={styles.securityPillText}>AUTHENTICATION</Text>
          </View>
          <Text style={styles.heroTitle}>ProxiFix Identity & Access</Text>
          <Text style={styles.heroSubtitle}>
            Sign in or create an account to book verified local workers, track bookings, or manage your service provider profile.
          </Text>
          <View style={styles.heroActions}>
            <Pressable
              style={styles.btnPrimary}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.btnPrimaryText}>Sign In</Text>
            </Pressable>
            <Pressable
              style={styles.btnOutline}
              onPress={() => router.push("/register")}
            >
              <Text style={styles.btnOutlineText}>Create New Account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Enterprise Identity Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarPill}>
          <Text style={styles.avatarText}>
            {user.name ? user.name[0].toUpperCase() : "U"}
          </Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.phone && <Text style={styles.userMeta}>📞 {user.phone}</Text>}
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>ROLE: {user.role}</Text>
          </View>
        </View>
      </View>

      {/* Role Tools */}
      {user.role === "WORKER" && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>WORKER TOOLS</Text>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemHover]}
            onPress={() => router.push("/worker-portal")}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="briefcase" size={18} color={C.brand} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Worker Dashboard</Text>
              <Text style={styles.menuSubtitle}>Manage incoming dispatches, online availability & live GPS</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.slate400} />
          </Pressable>
        </View>
      )}

      {user.role === "ADMIN" && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>ADMINISTRATIVE TOOLS</Text>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemHover]}
            onPress={() => router.push("/admin-portal")}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="shield-checkmark" size={18} color={C.brand} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Security & Audit Center</Text>
              <Text style={styles.menuSubtitle}>Real-time IP lookup, worker approval pipeline & audit trail</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.slate400} />
          </Pressable>
        </View>
      )}

      {/* Security Telemetry & System Info */}
      <View style={styles.section}>
        <Text style={styles.eyebrow}>SECURITY TELEMETRY & SYSTEM</Text>

        <View style={styles.menuItem}>
          <View style={[styles.menuIconBox, { backgroundColor: C.slate100 }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#0284c7" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Zero-Trust & STRIDE Non-Repudiation</Text>
            <Text style={styles.menuSubtitle}>Cryptographic request signatures & SQLite immutable logging</Text>
          </View>
          <View style={styles.statusLivePill}>
            <Text style={styles.statusLiveText}>VERIFIED</Text>
          </View>
        </View>

        <View style={styles.menuItem}>
          <View style={[styles.menuIconBox, { backgroundColor: C.slate100 }]}>
            <Ionicons name="hardware-chip-outline" size={18} color="#15803d" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Hardware Device GPS Pinpoint</Text>
            <Text style={styles.menuSubtitle}>WGS84 high-precision device coordinate streaming</Text>
          </View>
          <View style={styles.statusLivePill}>
            <Text style={styles.statusLiveText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.menuItem}>
          <View style={[styles.menuIconBox, { backgroundColor: C.slate100 }]}>
            <Ionicons name="information-circle-outline" size={18} color={C.slate600} />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>ProxiFix Client Version</Text>
            <Text style={styles.menuSubtitle}>v1.0.0-enterprise • Expo SDK 57 Native</Text>
          </View>
        </View>
      </View>

      {/* Sign Out Button */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnHover]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={16} color="#b91c1c" />
        <Text style={styles.logoutBtnText}>Sign Out of ProxiFix Session</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 ProxiFix. Trusted home services logistics.</Text>
        <Text style={styles.footerCredit}>Engineered with Zero-Trust STRIDE Architecture</Text>
      </View>

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
  guestContainer: {
    flex: 1,
    backgroundColor: C.bgPage,
    justifyContent: "center",
    padding: 16,
  },
  enterpriseHero: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
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
    fontSize: 18,
    fontWeight: "800",
    color: C.slate900,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: C.slate600,
    lineHeight: 18,
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    ...SHADOW.card,
  },
  avatarPill: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "900",
    color: C.brand,
  },
  infoCol: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: C.slate900,
  },
  userEmail: {
    fontSize: 12,
    color: C.slate600,
    marginTop: 1,
  },
  userMeta: {
    fontSize: 11,
    color: C.slate500,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.brandLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginTop: 5,
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: C.brand,
  },
  section: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: C.brand,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    ...SHADOW.card,
  },
  menuItemHover: {
    backgroundColor: C.slate50,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    marginLeft: 12,
    flex: 1,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.slate900,
  },
  menuSubtitle: {
    fontSize: 11,
    color: C.slate500,
    marginTop: 1,
  },
  statusLivePill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  statusLiveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803d",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    gap: 6,
    marginTop: 4,
  },
  logoutBtnHover: {
    backgroundColor: "#fee2e2",
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b91c1c",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 11,
    color: C.slate500,
  },
  footerCredit: {
    fontSize: 10,
    color: C.slate400,
    marginTop: 2,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: C.brand,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnOutline: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.brand,
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.brand,
  },
});
