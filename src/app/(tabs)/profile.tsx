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
        {/* hero-card style */}
        <View style={styles.heroCard}>
          <View style={styles.serviceIconBox}>
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
          <Text style={styles.eyebrow}>WELCOME</Text>
          <Text style={styles.heading}>Welcome to ProxiFix</Text>
          <Text style={styles.muted}>
            Sign in or create an account to book verified local workers, track bookings, or manage your service provider profile.
          </Text>
          <View style={styles.heroActions}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, styles.heroBtn, pressed && styles.btnPrimaryHover]}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.btnPrimaryText}>Sign In</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnOutline, styles.heroBtn, pressed && { backgroundColor: "#e4f4e8" }]}
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
      {/* Profile Card — matches .worker-card with avatar */}
      <View style={styles.profileCard}>
        <View style={styles.workerAvatar}>
          <Text style={styles.workerAvatarText}>
            {user.name ? user.name[0].toUpperCase() : "U"}
          </Text>
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.workerName}>{user.name}</Text>
          <Text style={styles.workerMeta}>{user.email}</Text>
          {user.phone && <Text style={styles.workerMeta}>{user.phone}</Text>}
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{user.role}</Text>
          </View>
        </View>
      </View>

      {/* Role Portals */}
      {user.role === "WORKER" && (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>WORKER TOOLS</Text>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemHover]}
            onPress={() => router.push("/worker-portal")}
          >
            <View style={[styles.serviceIconBox, { backgroundColor: "#ddf2e4", width: 42, height: 42 }]}>
              <Ionicons name="briefcase" size={20} color="#075c31" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Worker Workspace</Text>
              <Text style={styles.menuSubtitle}>Manage incoming jobs, online toggle & live GPS</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
            <View style={[styles.serviceIconBox, { backgroundColor: "#ddf2e4", width: 42, height: 42 }]}>
              <Ionicons name="shield-checkmark" size={20} color="#075c31" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Security & Audit Center</Text>
              <Text style={styles.menuSubtitle}>Review IP audits, approve workers & manage blocks</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        </View>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.eyebrow}>PREFERENCES & ABOUT</Text>

        <View style={styles.menuItem}>
          <View style={[styles.serviceIconBox, { backgroundColor: "#f1f5f9", width: 42, height: 42 }]}>
            <Ionicons name="shield-outline" size={20} color="#475569" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Security & Encryption</Text>
            <Text style={styles.menuSubtitle}>TLS/SSL, STRIDE Non-Repudiation</Text>
          </View>
        </View>

        <View style={styles.menuItem}>
          <View style={[styles.serviceIconBox, { backgroundColor: "#f1f5f9", width: 42, height: 42 }]}>
            <Ionicons name="information-circle-outline" size={20} color="#475569" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>App Version</Text>
            <Text style={styles.menuSubtitle}>v1.0.0 (ProxiFix Mobile Native)</Text>
          </View>
        </View>
      </View>

      {/* Sign Out — .btn-danger style */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnHover]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={18} color="#a61b1b" />
        <Text style={styles.logoutBtnText}>Sign Out</Text>
      </Pressable>

      {/* Site footer matching .site-footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 ProxiFix. Trusted home services made simple.</Text>
        <Text style={styles.footerCredit}>Crafted by Ravi Ranjan Kumar</Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#effaf3",
    padding: 16,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
    padding: 20,
    backgroundColor: "#effaf3",
  },
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
  },
  serviceIconBox: {
    width: 54,
    height: 54,
    backgroundColor: "#e4f4e8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
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
    marginBottom: 8,
  },
  muted: {
    color: "#61726a",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  heroActions: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  heroBtn: { flex: 1 },
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
  // Profile card — .worker-card style
  profileCard: {
    flexDirection: "row",
    gap: 16,
    padding: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 3,
  },
  workerAvatar: {
    flexShrink: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ddf2e4",
    alignItems: "center",
    justifyContent: "center",
  },
  workerAvatarText: {
    color: "#075c31",
    fontSize: 24,
    fontWeight: "800",
  },
  infoCol: { flex: 1 },
  workerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#102a1c",
    marginBottom: 4,
  },
  workerMeta: {
    fontSize: 13,
    color: "#61726a",
    marginBottom: 2,
  },
  // .status-approved
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#ddf2e4",
    borderRadius: 999,
  },
  statusBadgeText: {
    color: "#076332",
    fontSize: 11,
    fontWeight: "800",
  },
  section: { marginBottom: 20 },
  // menu items — .dashboard-hover-card equivalent
  menuItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(151,190,160,0.5)",
    marginBottom: 8,
    shadowColor: "#11423620",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 2,
  },
  menuItemHover: {
    borderColor: "#78ad87",
    shadowColor: "#114236",
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.15,
    shadowRadius: 38,
    elevation: 5,
  },
  menuContent: { marginLeft: 12, flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: "700", color: "#102a1c" },
  menuSubtitle: { fontSize: 12, color: "#61726a", marginTop: 2 },
  // .btn-danger
  logoutBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dba2a2",
    borderRadius: 9,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  logoutBtnHover: {
    backgroundColor: "#b42318",
    borderColor: "#b42318",
  },
  logoutBtnText: {
    color: "#a61b1b",
    fontWeight: "700",
    fontSize: 14,
  },
  // .site-footer
  footer: {
    marginTop: 32,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#10291a",
    borderRadius: 12,
    alignItems: "center",
  },
  footerText: {
    color: "#d6e5d8",
    textAlign: "center",
    fontSize: 12,
  },
  footerCredit: {
    marginTop: 4,
    color: "#a9cbb0",
    fontSize: 11,
    textAlign: "center",
  },
});
