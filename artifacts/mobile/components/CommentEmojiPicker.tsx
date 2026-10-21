import React, { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { COMMENT_EMOJI_CATALOG } from "../lib/commentEmojiCatalog";
import { COMMENT_EMOJI_NAMES } from "../lib/commentEmojiNames";
import { refreshSystemNavigation } from "../hooks/useSystemNavigation";
const groups = [["Recientes", ""], ["Caras", "😀"], ["Personas", "👋"], ["Naturaleza", "🐵"], ["Comida", "🍇"], ["Viajes", "🌍"], ["Actividades", "🎃"], ["Objetos", "👓"], ["Símbolos", "🏧"], ["Banderas", "🏁"]] as const;
const normalized = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export default function CommentEmojiPicker({ recent, height, safeBottom, onSelect, onClose }: {
  recent: string[]; height: number; safeBottom: number; onSelect: (emoji: string) => void; onClose: () => void;
}) {
  const [category, setCategory] = useState(0), [search, setSearch] = useState("");
  const items = useMemo(() => {
    if (search.trim()) { const term = normalized(search.trim()); return COMMENT_EMOJI_CATALOG.filter(emoji => {
      const base = emoji.replace(/[\uFE0F\u{1F3FB}-\u{1F3FF}]/gu, "");
      return emoji.includes(search.trim()) || normalized(COMMENT_EMOJI_NAMES[emoji] ?? COMMENT_EMOJI_NAMES[base] ?? "").includes(term);
    }); }
    if (!category) return recent;
    const start = COMMENT_EMOJI_CATALOG.indexOf(groups[category][1]);
    const end = category === groups.length - 1 ? COMMENT_EMOJI_CATALOG.length : COMMENT_EMOJI_CATALOG.indexOf(groups[category + 1][1]);
    return COMMENT_EMOJI_CATALOG.slice(Math.max(0, start), end < 0 ? undefined : end);
  }, [recent, category, search]);
  return <Modal transparent statusBarTranslucent navigationBarTranslucent onShow={refreshSystemNavigation} animationType="none" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end" }}>
      <Pressable accessibilityLabel="Cerrar selector de emojis" onPress={onClose} style={{ flex: 1 }} />
      <View style={{ height: Math.max(220, height), paddingBottom: safeBottom, backgroundColor: "#F0EFEC", borderTopWidth: 1, borderTopColor: "#DCDCDC" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
          <Pressable accessibilityLabel="Volver al teclado" onPress={onClose} style={{ minHeight: 42, justifyContent: "center", paddingHorizontal: 8 }}><Text>ABC</Text></Pressable>
          <TextInput placeholder="Buscar emoji" accessibilityLabel="Buscar emoji" value={search} onChangeText={setSearch} style={{ flex: 1, height: 40, fontSize: 14, paddingHorizontal: 8 }} />
        </View>
        <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          {groups.map(([label], index) => <Pressable key={label} accessibilityState={{ selected: category === index }} onPress={() => { setCategory(index); setSearch(""); }} style={{ paddingHorizontal: 12, minHeight: 36, justifyContent: "center" }}><Text style={{ fontSize: 12, color: category === index ? "#15868B" : "#555" }}>{label}</Text></Pressable>)}
        </ScrollView>
        <FlatList key={`${category}:${search}`} data={items} numColumns={7} keyboardShouldPersistTaps="always" initialNumToRender={35} maxToRenderPerBatch={35} windowSize={3} keyExtractor={item => item}
          ListEmptyComponent={<Text style={{ padding: 20, textAlign: "center", color: "#666" }}>No hay emojis que coincidan.</Text>}
          renderItem={({ item }) => <Pressable accessibilityLabel={`Añadir emoji ${item}`} onPress={() => onSelect(item)} style={{ width: "14.2857%", height: 44, alignItems: "center", justifyContent: "center" }}><Text allowFontScaling={false} style={{ fontSize: 26 }}>{item}</Text></Pressable>} />
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
