import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  onPress: () => void;
  loading?: boolean;
  label?: string;
}

export default function GoogleButton({ onPress, loading, label = "Continuar con Google" }: Props) {
  return (
    <TouchableOpacity
      style={[styles.btn, loading && styles.btnDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#444" size="small" />
      ) : (
        <>
          <View style={styles.iconWrap}>
            {/* Google G logo using colored squares */}
            <Text style={styles.gLogo}>G</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  btnDisabled: { opacity: 0.6 },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  gLogo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4285F4",
    fontFamily: "serif",
  },
  label: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
  },
});
