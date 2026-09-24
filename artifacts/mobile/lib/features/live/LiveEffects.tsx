import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export type LiveEffectCategory = "filters" | "visual" | "background" | "voice" | "sound";

export type LiveEffect = {
  id: string;
  label: string;
  icon: string;
  category: LiveEffectCategory;
};

const EFFECTS: LiveEffect[] = [
  { id: "filter-natural", label: "Natural", icon: "✨", category: "filters" },
  { id: "filter-warm", label: "Warm", icon: "☀️", category: "filters" },
  { id: "filter-cool", label: "Cool", icon: "❄️", category: "filters" },
  { id: "visual-sparkle", label: "Sparkle", icon: "💫", category: "visual" },
  { id: "visual-neon", label: "Neon", icon: "🌈", category: "visual" },
  { id: "visual-confetti", label: "Confetti", icon: "🎉", category: "visual" },
  { id: "background-blur", label: "Desenfoque", icon: "◌", category: "background" },
  { id: "background-studio", label: "Studio", icon: "🎬", category: "background" },
  { id: "background-sunset", label: "Atardecer", icon: "🌅", category: "background" },
  { id: "voice-normal", label: "Normal", icon: "🎙️", category: "voice" },
  { id: "voice-deep", label: "Grave", icon: "🔊", category: "voice" },
  { id: "voice-bright", label: "Brillante", icon: "🗣️", category: "voice" },
  { id: "sound-applause", label: "Aplausos", icon: "👏", category: "sound" },
  { id: "sound-laugh", label: "Risas", icon: "😂", category: "sound" },
  { id: "sound-celebrate", label: "Celebración", icon: "🥳", category: "sound" },
];

const TABS: { id: LiveEffectCategory; label: string }[] = [
  { id: "filters", label: "Filtros" },
  { id: "visual", label: "Visual" },
  { id: "background", label: "Fondos" },
  { id: "voice", label: "Voz" },
  { id: "sound", label: "Sonido" },
];

export type LiveEffectsProps = {
  onSelect?: (effect: LiveEffect | null) => void;
};

export default function LiveEffects({ onSelect }: LiveEffectsProps) {
  const [category, setCategory] = useState<LiveEffectCategory>("filters");
  const [selectedByCategory, setSelectedByCategory] = useState<
    Partial<Record<LiveEffectCategory, string>>
  >({});

  const visible = useMemo(
    () => EFFECTS.filter((effect) => effect.category === category),
    [category],
  );

  const selectedId = selectedByCategory[category];

  const selectEffect = (effect: LiveEffect) => {
    const nextSelected = selectedId === effect.id ? null : effect;
    setSelectedByCategory((current) => ({
      ...current,
      [category]: nextSelected?.id,
    }));
    onSelect?.(nextSelected);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Efectos</Text>
        <Text style={styles.subtitle}>Solo afectan tu propia participación</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setCategory(tab.id)}
            style={[styles.tab, category === tab.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, category === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.effects}
      >
        {visible.map((effect) => {
          const selected = selectedId === effect.id;
          return (
            <Pressable
              key={effect.id}
              onPress={() => selectEffect(effect)}
              style={[styles.effect, selected && styles.effectSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${effect.label}, ${selected ? "seleccionado" : "no seleccionado"}`}
            >
              <View style={[styles.icon, selected && styles.iconSelected]}>
                <Text style={styles.iconText}>{effect.icon}</Text>
              </View>
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {effect.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#090909",
    borderRadius: 20,
    paddingVertical: 14,
  },
  header: {
    paddingHorizontal: 16,
    gap: 3,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "#8b8b8b",
    fontSize: 12,
  },
  tabs: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tab: {
    borderRadius: 18,
    backgroundColor: "#181818",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#111",
  },
  effects: {
    gap: 14,
    paddingHorizontal: 16,
  },
  effect: {
    width: 76,
    alignItems: "center",
    gap: 7,
  },
  effectSelected: {
    transform: [{ scale: 1.03 }],
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#252525",
  },
  iconSelected: {
    borderColor: "#fff",
    backgroundColor: "#242424",
  },
  iconText: {
    fontSize: 25,
  },
  label: {
    color: "#8d8d8d",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  labelSelected: {
    color: "#fff",
  },
});
