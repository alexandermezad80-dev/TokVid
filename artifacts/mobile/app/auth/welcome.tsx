import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const clips = [
  { source: require("../../../assets/images/thumb1.png"), label: "Música", rotate: "-6deg" },
  { source: require("../../../assets/images/thumb2.png"), label: "Humor", rotate: "5deg" },
  { source: require("../../../assets/images/thumb3.png"), label: "Latinoamérica", rotate: "-4deg" },
  { source: require("../../../assets/images/thumb4.png"), label: "Cocina", rotate: "7deg" },
  { source: require("../../../assets/images/thumb5.png"), label: "Deportes", rotate: "-5deg" },
  { source: require("../../../assets/images/thumb6.png"), label: "Arte", rotate: "4deg" },
];

function ClipCard({
  source,
  label,
  rotate,
  index,
}: (typeof clips)[number] & { index: number }) {
  const translateY = useRef(new Animated.Value(index % 2 ? 16 : -16)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: index % 2 ? -10 : 10,
          duration: 2400 + index * 180,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: index % 2 ? 16 : -16,
          duration: 2400 + index * 180,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [index, translateY]);

  return (
    <Animated.View
      style={[
        styles.clip,
        {
          transform: [{ translateY }, { rotate }],
          opacity: 0.9,
        },
      ]}
    >
      <Image source={source} style={styles.clipImage} resizeMode="cover" />
      <View style={styles.clipShade} />
      <View style={styles.clipFooter}>
        <View style={styles.clipDot} />
        <Text style={styles.clipLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 650,
        delay: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, logoScale]);

  return (
    <View style={styles.root}>
      <View style={styles.background}>
        <View style={styles.columns}>
          {[0, 1, 2].map((column) => (
            <View key={column} style={styles.column}>
              {clips
                .filter((_, index) => index % 3 === column)
                .map((clip, index) => (
                  <ClipCard key={clip.label} {...clip} index={index + column} />
                ))}
            </View>
          ))}
        </View>
        <View style={styles.veil} />
      </View>

      <View style={[styles.safe, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 18 }]}>
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoMark}>
            <Ionicons name="play" size={26} color="#0A0A0F" />
          </View>
          <Text style={styles.logoText}>TOKVID</Text>
        </Animated.View>

        <Animated.View style={[styles.hero, { opacity: contentOpacity }]}>
          <Text style={styles.kicker}>VIDEO CORTO • LATINOAMÉRICA</Text>
          <Text style={styles.title}>Historias que{"\n"}se sienten reales.</Text>
          <Text style={styles.subtitle}>
            Video corto para creadores de Latinoamérica.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.actions, { opacity: contentOpacity }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear cuenta"
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={() => router.push("/auth/register")}
          >
            <Text style={styles.primaryText}>Crear cuenta</Text>
            <Feather name="arrow-right" size={20} color="#0A0A0F" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="¿Tienes cuenta?"
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.secondaryText}>¿Tienes cuenta?</Text>
          </Pressable>

          <Text style={styles.legal}>
            Al continuar aceptás nuestros términos y política de privacidad.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0F" },
  background: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  columns: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 34,
    height: height * 0.68,
    opacity: 0.9,
  },
  column: { width: (width - 48) / 3, gap: 14, alignItems: "center" },
  clip: {
    width: "100%",
    height: Math.min(width * 0.46, 190),
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#14141C",
    overflow: "hidden",
    justifyContent: "space-between",
    padding: 12,
  },
  clipGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -48,
    right: -35,
    opacity: 0.16,
  },
  clipEmoji: { fontSize: 46, textAlign: "center", marginTop: 18 },
  clipFooter: { flexDirection: "row", alignItems: "center", gap: 7 },
  clipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#00F2EA" },
  clipLabel: { color: "#D4D4D8", fontSize: 10, fontWeight: "700" },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,15,0.66)",
  },
  safe: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#00F2EA",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00F2EA",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoText: {
    color: "#F5F5F7",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  hero: { marginTop: 28 },
  kicker: {
    color: "#00F2EA",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  title: {
    color: "#F5F5F7",
    fontSize: Math.min(width * 0.095, 40),
    lineHeight: Math.min(width * 0.105, 44),
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 330,
  },
  actions: { gap: 12 },
  primary: {
    minHeight: 56,
    borderRadius: 17,
    backgroundColor: "#00F2EA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryText: { color: "#0A0A0F", fontSize: 16, fontWeight: "900" },
  secondary: {
    minHeight: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#3A3A46",
    backgroundColor: "rgba(20,20,28,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#F5F5F7", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  legal: {
    color: "#6B7280",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 2,
  },
});
