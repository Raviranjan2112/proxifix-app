import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

export default function TabLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isWorker = user?.role === "WORKER";

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#075c31",
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 18,
        },
        tabBarActiveTintColor: "#075c31",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E8F0",
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isAdmin ? "Admin Dashboard" : isWorker ? "Worker Portal" : "ProxiFix",
          tabBarLabel: isAdmin ? "Dashboard" : isWorker ? "Home" : "Find Workers",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isAdmin ? "grid-outline" : isWorker ? "home-outline" : "search-outline"}
              size={size}
              color={color as any}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: isAdmin ? "Security & Audit" : isWorker ? "My Jobs" : "My Bookings",
          tabBarLabel: isAdmin ? "Security" : isWorker ? "Jobs" : "Bookings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isAdmin ? "shield-checkmark-outline" : isWorker ? "briefcase-outline" : "calendar-outline"}
              size={size}
              color={color as any}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isAdmin ? "Admin Profile" : isWorker ? "Worker Profile" : "My Profile",
          tabBarLabel: "Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color as any} />
          ),
        }}
      />
    </Tabs>
  );
}
