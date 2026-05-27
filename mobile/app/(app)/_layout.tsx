import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Colors } from "@/constants/colors";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.rose500,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          borderTopColor: Colors.gray100,
          backgroundColor: "#fff",
          paddingBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: "Discover", tabBarIcon: ({ color }) => <TabIcon emoji="🔥" color={color} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: "Matches", tabBarIcon: ({ color }) => <TabIcon emoji="💞" color={color} /> }}
      />
      <Tabs.Screen
        name="activities"
        options={{ title: "Activities", tabBarIcon: ({ color }) => <TabIcon emoji="🎉" color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: "Messages", tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} /> }}
      />
      {/* Hidden routes — not shown in tab bar */}
      <Tabs.Screen name="preferences" options={{ href: null }} />
      <Tabs.Screen name="activities/[id]" options={{ href: null }} />
      <Tabs.Screen name="messages/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile/[userId]" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, opacity: color === Colors.rose500 ? 1 : 0.5 }}>{emoji}</Text>;
}
