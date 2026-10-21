import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { commentPhotoUrl } from "../lib/features/comments/composerTools";
export default function CommentPhoto({ path }: { path: string }) {
  const [uri, setUri] = useState<string | null>(null), [error, setError] = useState(false), [expanded, setExpanded] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setUri(null); setError(false);
    void commentPhotoUrl(path).then(url => { if (active) setUri(url); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [path, retry]);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={error ? "Reintentar imagen del comentario" : "Ver imagen del comentario"} onPress={() => error ? setRetry(n => n + 1) : uri && setExpanded(true)} style={{ width: 112, height: 112, borderRadius: 10, overflow: "hidden", backgroundColor: "#F0EFEC", justifyContent: "center" }}>
      {uri && !error ? <Image source={{ uri }} resizeMode="contain" onError={() => setError(true)} style={{ width: "100%", height: "100%" }} /> : <Text style={{ textAlign: "center", fontSize: 12 }}>{error ? "Reintentar imagen" : "Cargando imagen…"}</Text>}
    </Pressable>
    <Modal visible={expanded} transparent onRequestClose={() => setExpanded(false)}>
      <Pressable accessibilityLabel="Cerrar imagen" onPress={() => setExpanded(false)} style={{ flex: 1, backgroundColor: "#000000EE", justifyContent: "center" }}>
        {uri && <Image source={{ uri }} resizeMode="contain" style={{ width: "100%", height: "85%" }} />}
        <View style={{ alignItems: "center", padding: 16 }}><Text style={{ color: "white" }}>Cerrar</Text></View>
      </Pressable>
    </Modal>
  </>;
}
