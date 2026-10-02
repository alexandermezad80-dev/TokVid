import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNotifications } from "../../context/NotificationsContext";
import { useAuth } from "../../context/AuthContext";
import { router } from "expo-router";

const PRIMARY = "#FE0979";
const CYAN = "#00F2FE";
const DARK = "#000000";
const BORDER = "#2C2C2E";

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badgeWrap}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Inicio</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="friends">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Amigos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>Crear</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Mensajes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function GuestTabButton({
  label,
  icon,
  create = false,
}: {
  label: string;
  icon: string;
  create?: boolean;
}) {
  const isIOS = Platform.OS === "ios";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push("/auth/register")}
      style={styles.guestButton}
    >
      {create ? (
        <View style={styles.createBtn}>
          <View style={styles.createBtnInner}>
            <Feather name="plus" size={24} color="#fff" />
          </View>
        </View>
      ) : isIOS ? (
        <SymbolView name={icon} tintColor="#8A8B97" size={24} />
      ) : (
        <Feather name={icon} size={22} color="#8A8B97" />
      )}
      {!create ? <Text style={styles.guestLabel}>{label}</Text> : null}
    </Pressable>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const guest = !user;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: "#8A8B97",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : DARK,
          borderTopWidth: 1,
          borderTopColor: BORDER,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: DARK }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarButton: guest ? () => <GuestTabButton label="Inicio" icon="house" /> : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Amigos",
          tabBarButton: guest ? () => <GuestTabButton label="Amigos" icon="person.2" /> : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={24} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarButton: guest ? () => <GuestTabButton label="Crear" icon="plus" create /> : undefined,
          tabBarIcon: () => (
            <View style={styles.createBtn}>
              <View style={styles.createBtnInner}>
                <Feather name="plus" size={24} color="#fff" />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Mensajes",
          tabBarButton: guest ? () => <GuestTabButton label="Mensajes" icon="message" /> : undefined,
          tabBarIcon: ({ color }) => (
            <View>
              {isIOS ? (
                <SymbolView name="message" tintColor={color} size={24} />
              ) : (
                <Feather name="message-circle" size={22} color={color} />
              )}
              <UnreadBadge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarButton: guest ? () => <GuestTabButton label="Perfil" icon="person" /> : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  // Guests use the classic bar so every bottom action can intentionally
  // intercept the tap and open registration. Authenticated users keep the
  // native iOS tab bar when available.
  if (!user) return <ClassicTabLayout />;
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  guestButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    gap: 2,
  },
  guestLabel: { color: "#8A8B97", fontSize: 10, fontWeight: "600" },
  createBtn: {
    width: 52,
    height: 32,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 4,
  },
  createBtnInner: {
    flex: 1,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  badgeWrap: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: DARK,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
});
