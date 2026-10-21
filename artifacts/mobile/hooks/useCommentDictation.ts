import { useEffect, useRef, useState } from "react";
import { AppState, DeviceEventEmitter, NativeModules, PermissionsAndroid, Platform } from "react-native";
const native = NativeModules.TokVidChatTools;
let nextToken = 0;
export function useCommentDictation(active: boolean, context: string, onText: (text: string) => void, onError: (message: string) => void) {
  const [listening, setListening] = useState(false);
  const token = useRef<string | null>(null), generation = useRef(0), callbacks = useRef({ onText, onError });
  callbacks.current = { onText, onError };
  const cancel = () => { generation.current++; const id = token.current; token.current = null; setListening(false); if (id) native?.cancelCommentDictation?.(id); };
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("TokVidCommentDictation", event => {
      if (event.token !== token.current) return;
      if (event.text) callbacks.current.onText(event.text);
      if (event.error) callbacks.current.onError(event.error);
      if (event.final) { token.current = null; setListening(false); }
    });
    const app = AppState.addEventListener("change", state => { if (state !== "active") cancel(); });
    return () => { cancel(); subscription.remove(); app.remove(); };
  }, [context]);
  useEffect(() => { if (!active) cancel(); }, [active]);
  const toggle = async () => {
    if (token.current) { native?.stopCommentDictation?.(token.current); return; }
    if (!active) return;
    if (Platform.OS !== "android" || !native?.startCommentDictation) { callbacks.current.onError("El dictado no está disponible en este dispositivo."); return; }
    const request = ++generation.current;
    let granted: string;
    try { granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO); }
    catch { if (request === generation.current) callbacks.current.onError("No se pudo solicitar el micrófono. Inténtalo de nuevo."); return; }
    if (request !== generation.current) return;
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) { callbacks.current.onError("Permite el micrófono para dictar tu comentario."); return; }
    const id = String(++nextToken); token.current = id; setListening(true);
    try { await native.startCommentDictation(id); }
    catch (error) { if (token.current === id) { cancel(); callbacks.current.onError(error instanceof Error ? error.message : "No se pudo iniciar el dictado."); } }
  };
  return { listening, toggle, cancel };
}
