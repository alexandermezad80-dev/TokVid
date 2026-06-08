import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  likes: number;
  time: string;
}

const MOCK_COMMENTS: Comment[] = [
  { id: "1", user: "@marialopes", avatar: "https://i.pravatar.cc/80?img=5", text: "This is absolutely incredible!! 🔥🔥", likes: 1240, time: "2h" },
  { id: "2", user: "@techbro99", avatar: "https://i.pravatar.cc/80?img=12", text: "How do you do this every single day omg", likes: 892, time: "3h" },
  { id: "3", user: "@sunflower_zoe", avatar: "https://i.pravatar.cc/80?img=21", text: "I've watched this 47 times already no joke 😭", likes: 2300, time: "4h" },
  { id: "4", user: "@jaystream", avatar: "https://i.pravatar.cc/80?img=33", text: "The way you move is just different 👏", likes: 445, time: "5h" },
  { id: "5", user: "@pizzalover", avatar: "https://i.pravatar.cc/80?img=44", text: "Teaching yourself or you have a coach?", likes: 221, time: "6h" },
  { id: "6", user: "@nightowl_beats", avatar: "https://i.pravatar.cc/80?img=55", text: "This gave me chills first watch fr", likes: 1870, time: "8h" },
  { id: "7", user: "@cactus_vibes", avatar: "https://i.pravatar.cc/80?img=62", text: "Drop the playlist please!! 🎵", likes: 3100, time: "1d" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  commentCount: string;
}

export default function CommentsSheet({ visible, onClose, commentCount }: Props) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const insets = useSafeAreaInsets();

  const send = () => {
    if (!text.trim()) return;
    setComments((prev) => [
      {
        id: Date.now().toString(),
        user: "@you",
        avatar: "https://i.pravatar.cc/80?img=70",
        text: text.trim(),
        likes: 0,
        time: "now",
      },
      ...prev,
    ]);
    setText("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{commentCount} Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={styles.commentBody}>
                <Text style={styles.commentUser}>{item.user}</Text>
                <Text style={styles.commentText}>{item.text}</Text>
                <View style={styles.commentMeta}>
                  <Text style={styles.metaText}>{item.time}</Text>
                  <Text style={styles.metaText}>{item.likes > 0 ? `${item.likes} likes` : ""}</Text>
                </View>
              </View>
            </View>
          )}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment..."
            placeholderTextColor="#555"
            style={styles.input}
            multiline
            maxLength={200}
          />
          <TouchableOpacity onPress={send} style={styles.sendBtn}>
            <Feather name="send" size={20} color={text.trim() ? "#FE2C55" : "#555"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#161823",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#444",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  list: {
    flex: 1,
  },
  comment: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentUser: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
  commentText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: "row",
    gap: 12,
  },
  metaText: {
    color: "#555",
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#2C2C2E",
    paddingTop: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    padding: 8,
  },
});
