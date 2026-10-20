import {referenceVisual as v} from "../../constants/referenceVisual";
import { useRegistration } from "../../context/RegistrationContext";
import { requestRegistration } from "../../lib/features/auth/services/registrationBridge";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, usePathname } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useNotifications } from "../../context/NotificationsContext";
import { useAuth } from "../../context/AuthContext";
import { router } from "expo-router";

const PRIMARY = "#FE2C55";
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
      onPress={() => requestRegistration({ kind: label === "Perfil" ? "profile" : "register" })}
      style={styles.guestButton}
    >
      {create ? (
        <View style={styles.createBtn}><LinearGradient pointerEvents="none" colors={v.outline} start={{x:0,y:.5}} end={{x:1,y:.5}} style={StyleSheet.absoluteFill}/>
          <LinearGradient
            colors={v.createFill}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.createBtnInner}
          >
            <Feather name="plus" size={24} color="#fff" />
          </LinearGradient>
        </View>
      ) : (
        <Feather name={icon as React.ComponentProps<typeof Feather>["name"]} size={22} color={v.inactive} />
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
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, isWeb ? 12 : 0);
  const barBody = 56;
  const path = usePathname();
  const light = path === "/inbox";
  const barColor = light ? "#FFFFFF" : DARK;
  const { setTabBarHeight } = useRegistration();

  return (
    <Tabs
      safeAreaInsets={{ bottom: bottomInset }}
      screenOptions={{
        tabBarLabelPosition: "below-icon",
        tabBarAllowFontScaling:false,
        tabBarItemStyle: { minHeight: barBody, paddingVertical: 4 },
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: light ? v.label : v.inactive,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : barColor,
          borderTopWidth: 1,
          borderTopColor: light ? v.inboxLine : BORDER,
          elevation: 0,
          height: barBody + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 0,
        },
        tabBarLabelStyle: { fontFamily: "Inter_500Medium",
          fontSize: 10,
          fontWeight: "normal",
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={light ? "light" : "dark"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View onLayout={event => setTabBarHeight(event.nativeEvent.layout.height)} style={[StyleSheet.absoluteFill, { backgroundColor: barColor }]} />
          ) : <View style={StyleSheet.absoluteFill} onLayout={event => setTabBarHeight(event.nativeEvent.layout.height)} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarButton: guest ? () => <GuestTabButton label="Inicio" icon="home" /> : undefined,
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
          tabBarButton: guest ? () => <GuestTabButton label="Amigos" icon="users" /> : undefined,
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
            <View style={styles.createBtn}><LinearGradient pointerEvents="none" colors={v.outline} start={{x:0,y:.5}} end={{x:1,y:.5}} style={StyleSheet.absoluteFill}/>
              <LinearGradient
                colors={v.createFill}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.createBtnInner}
              >
                <Feather name="plus" size={24} color="#fff" />
              </LinearGradient>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Mensajes",
          tabBarButton: guest ? () => <GuestTabButton label="Mensajes" icon="message-circle" /> : undefined,
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
        name="discover"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarButton: guest ? () => <GuestTabButton label="Perfil" icon="user" /> : undefined,
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
    minHeight: 56,
    gap: 2,
  },
  guestLabel: { fontFamily: "Inter_500Medium", color: v.inactive, fontSize: 10, fontWeight: "normal" },
  createBtn: {
    width: 49,
    height: 30,
    borderRadius: 9,
    padding:1,
    overflow: "hidden",
    marginBottom: 4,
  },
  createBtnInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
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
  badgeText: { fontFamily: "Inter_500Medium", color: "#fff", fontSize: 9, fontWeight: "normal" },
});
