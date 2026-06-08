import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DURATIONS = ["15s", "60s", "3min", "10min"];
const EFFECTS = [
  { name: "Beauty", icon: "star" },
  { name: "Speed", icon: "zap" },
  { name: "Filter", icon: "sliders" },
  { name: "Sticker", icon: "smile" },
  { name: "Green Screen", icon: "monitor" },
  { name: "Text", icon: "type" },
];

export default function CreateScreen() {
  const [selected, setSelected] = useState("15s");
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad + 80 }]}>
      <View style={styles.cameraPlaceholder}>
        <View style={styles.cameraFake}>
          <Feather name="camera" size={60} color="#333" />
          <Text style={styles.cameraText}>Camera Preview</Text>
          <Text style={styles.cameraSubText}>Grant camera access to start recording</Text>
          <TouchableOpacity style={styles.grantBtn}>
            <Text style={styles.grantBtnText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightTools}>
          {[
            { icon: "refresh-cw", label: "Flip" },
            { icon: "zap", label: "Flash" },
            { icon: "music", label: "Sound" },
            { icon: "clock", label: "Timer" },
          ].map((t) => (
            <TouchableOpacity key={t.label} style={styles.tool}>
              <Feather name={t.icon as any} size={24} color="#fff" />
              <Text style={styles.toolLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.effects}
        >
          {EFFECTS.map((e) => (
            <TouchableOpacity key={e.name} style={styles.effectBtn}>
              <View style={styles.effectIcon}>
                <Feather name={e.icon as any} size={20} color="#fff" />
              </View>
              <Text style={styles.effectLabel}>{e.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.durations}>
          {DURATIONS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setSelected(d)}
              style={[styles.durBtn, selected === d && styles.durBtnActive]}
            >
              <Text style={[styles.durText, selected === d && styles.durTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.galleryBtn}>
            <Feather name="image" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.recordBtn}>
            <View style={styles.recordInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.effectsBtn}>
            <Feather name="sliders" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cameraPlaceholder: {
    flex: 1,
    position: "relative",
  },
  cameraFake: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  cameraText: { color: "#555", fontSize: 18, fontWeight: "600" },
  cameraSubText: { color: "#444", fontSize: 13, textAlign: "center", paddingHorizontal: 40 },
  grantBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  grantBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  rightTools: {
    position: "absolute",
    right: 16,
    top: 20,
    gap: 20,
  },
  tool: { alignItems: "center", gap: 4 },
  toolLabel: { color: "#fff", fontSize: 11 },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  effects: { gap: 14, paddingVertical: 4 },
  effectBtn: { alignItems: "center", gap: 6 },
  effectIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  effectLabel: { color: "#fff", fontSize: 11 },
  durations: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  durBtn: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  durBtnActive: { borderColor: "#FE2C55", backgroundColor: "rgba(254,44,85,0.1)" },
  durText: { color: "#888", fontSize: 13 },
  durTextActive: { color: "#FE2C55", fontWeight: "700" },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  galleryBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  recordBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
  },
  recordInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FE2C55",
  },
  effectsBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
});
