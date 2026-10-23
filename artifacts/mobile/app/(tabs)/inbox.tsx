import {referenceVisual as v} from "../../constants/referenceVisual";
import ReferenceHeader from "../../components/reference/ReferenceHeader";
import RefreshableInboxEmpty from "../../components/RefreshableInboxEmpty";
import ClearInboxDialog from "../../lib/features/messages/components/ClearInboxDialog";
import {activityCounter,activityHasGallery} from "../../lib/features/messages/activity";
import {useGroupInbox} from "../../hooks/useGroupInbox";
import ConversationMenu from "../../lib/features/messages/components/ConversationMenu";
import {hideConversation} from "../../lib/features/messages/services/chat-tools";
import {openActivity} from "../../components/ActivityBanner";
import {usePrivateInbox} from "../../hooks/usePrivateInbox";
import { requestRegistration } from "../../lib/features/auth/services/registrationBridge";
import { Feather } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
  Platform,
  RefreshControl,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { type AppNotification, useNotifications } from "../../context/NotificationsContext";
import { supabase } from "../../lib/supabase";
import { nextInboxTab, isInboxHorizontalGesture, type InboxSection } from "../../lib/features/messages/inboxSwipe";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationRow {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_at: string;
  other_id: string;
  other_username: string;
  other_avatar: string | null;
  unread_count?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iconForType(type: string) {
  switch (type) {
    case "like": case "comment_like": return "heart";
    case "favorite":return "bookmark";
    case "share":return "share-2";
    case "follow": return "user-plus";
    case "comment": return "message-circle";
    case "mention": return "at-sign";
    case "message": return "message-circle";
    default: return "bell";
  }
}

function colorForType(type: string) {
  switch (type) {
    case "like": case "comment_like": case "favorite": return "#FE2C55";
    case "follow": return "#25F4EE";
    case "comment": return "#FFAE3B";
    case "mention": return "#A78BFA";
    default: return "#888";
  }
}

function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: true, locale: es });
  } catch {
    return "";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotifItem({ notif, onPress }: { notif: AppNotification; onPress: () => void }) {
  const avatar = notif.actor_avatar;
  const seed = notif.actor_name ?? notif.actor_id ?? "U";
  const avatarUri = avatar
    ? avatar
    : `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(seed)}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=80`;

  return (
    <TouchableOpacity
      style={[styles.notif, !notif.read && styles.notifUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Pressable style={styles.avatarWrap} accessibilityLabel={activityHasGallery(notif)?`Ver publicaciones de la actividad de ${notif.actor_name??"este usuario"}`:"Abrir actividad"} onPress={e=>{e.stopPropagation();if(activityHasGallery(notif))router.push({pathname:"/activity-publications",params:{actorId:notif.actor_id!,type:notif.type}});else onPress();}}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <View style={[styles.iconBadge, { backgroundColor: colorForType(notif.type) }]}>
          <Feather name={iconForType(notif.type) as any} size={10} color="#fff" />
        </View>
      </Pressable>
      <View style={styles.notifBody}>
        {notif.actor_name && <Text style={styles.notifUser}>{notif.actor_name}</Text>}
        <Text style={styles.notifText} numberOfLines={1}>{notif.message}</Text>
        <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
      </View>
      {activityCounter(notif)>0&&<View style={styles.badge}><Text style={styles.badgeText}>{activityCounter(notif)}</Text></View>}
    </TouchableOpacity>
  );
}

function ConvoItem({ convo, onOptions }: { convo: ConversationRow; onOptions:(convo:ConversationRow,anchor:{x:number;y:number;width:number;height:number})=>void }) {
  const ref=useRef<View>(null);
  const options=()=>ref.current?.measureInWindow((x,y,width,height)=>onOptions(convo,{x,y,width,height}));
  const avatarUri = convo.other_avatar
    ?? `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(convo.other_username)}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=80`;

  const goToChat = () =>
    router.push(
      `/chat?conversationId=${convo.id}&otherUserId=${convo.other_id}&otherUsername=${encodeURIComponent(convo.other_username)}&otherAvatar=${encodeURIComponent(convo.other_avatar ?? "")}`
    );

  return (
    <View ref={ref} collapsable={false}><TouchableOpacity style={styles.notif} onPress={goToChat} onLongPress={options} activeOpacity={0.7}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
      <View style={styles.notifBody}>
        <Text style={styles.notifUser}>@{convo.other_username}</Text>
        <Text style={styles.notifText} numberOfLines={1}>
          {convo.last_message ?? "Conversación nueva"}
        </Text>
        <Text style={styles.notifTime}>{timeAgo(convo.last_message_at)}</Text>
      </View>
      {!!convo.unread_count && <View style={styles.badge}><Text style={styles.badgeText}>{convo.unread_count}</Text></View>}
      <Pressable accessibilityLabel={`Opciones de ${convo.other_username}`} onPress={options} style={{minWidth:44,minHeight:44,alignItems:"center",justifyContent:"center"}}><Feather name="more-horizontal" size={22} color="#737373" /></Pressable>
    </TouchableOpacity></View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const params=useLocalSearchParams<{tab?:string}>();
  const [menu,setMenu]=useState<{convo:ConversationRow;anchor:{x:number;y:number;width:number;height:number}}|null>(null);
  const [removing,setRemoving]=useState(false);
  const [tab, setTab] = useState<"activity" | "messages">("activity");
  // Capture horizontal gestures only in the body, never on the approved tab buttons.
  const currentTabRef=useRef<InboxSection>(tab);
  currentTabRef.current=tab;
  const inboxSwipeResponder=useRef(PanResponder.create({
    onMoveShouldSetPanResponder:(_event,gesture)=>
      (gesture.numberActiveTouches??1)===1 && isInboxHorizontalGesture(gesture.dx,gesture.dy),
    // Capture only single-finger horizontal drags; vertical scroll/refresh stay native.
    onMoveShouldSetPanResponderCapture:(_event,gesture)=>
      (gesture.numberActiveTouches??1)===1 && isInboxHorizontalGesture(gesture.dx,gesture.dy),
    onPanResponderRelease:(_event,gesture)=>{
      const next=nextInboxTab(currentTabRef.current,gesture.dx,gesture.dy);
      if(next!==currentTabRef.current)setTab(next);
    },
    onPanResponderTerminationRequest:()=>true,
  })).current;
  useEffect(()=>{if(params.tab==="messages"||params.tab==="activity")setTab(params.tab);},[params.tab]);
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { notifications, unreadCount, loading: notifLoading, markRead, markAllRead, refresh } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const refreshGuard=useRef(false);
  const { user } = useAuth();
  const [groupRevision,setGroupRevision]=useState(0),[clearBefore,setClearBefore]=useState<string|null>(null);
  const groups=useGroupInbox(user?.id,groupRevision);
  useFocusEffect(useCallback(()=>{void refresh();},[refresh]));

  useEffect(() => {
    if (!user) requestRegistration();
  }, [user]);

  const {conversations:convos,loading:convosLoading,error:convosError,refresh:loadConvos}=usePrivateInbox(user?.id);

  const handleRefresh = async () => {
    if(refreshGuard.current)return;
    refreshGuard.current=true;
    setRefreshing(true);
    try{
      await Promise.all([refresh(), tab === "messages" ? loadConvos() : Promise.resolve()]);
    }catch{
      Alert.alert("No se pudo actualizar Inbox","Revisa tu conexión e inténtalo de nuevo.");
    }finally{
      refreshGuard.current=false;
      setRefreshing(false);
    }
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <ReferenceHeader variant="inbox" compact style={{paddingHorizontal:7}}>
        <Text style={styles.pageTitle}>Inbox</Text>
        {tab === "activity" && unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Marcar todo leído</Text>
          </TouchableOpacity>
        )}
      </ReferenceHeader>

      <View style={styles.tabs}>
        {(["activity", "messages"] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "activity" ? "Actividad" : "Mensajes"}
              </Text>
              {t === "activity" && unreadCount > 0 && (
                <View style={[styles.badge,{minWidth:17,minHeight:17,paddingHorizontal:4}]}>
                  <Text style={[styles.badgeText,{ fontFamily: "Inter_400Regular",fontSize:11}]}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </View>
            {tab === t && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.swipeContent} {...inboxSwipeResponder.panHandlers}>
      {tab === "activity" ? (
        notifLoading && notifications.length === 0 ? (
          <RefreshableInboxEmpty refreshing={refreshing} onRefresh={handleRefresh}><View style={styles.center}><ActivityIndicator color="#FE2C55" /></View></RefreshableInboxEmpty>
        ) : notifications.length === 0 ? (
          <RefreshableInboxEmpty refreshing={refreshing} onRefresh={handleRefresh}><View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Feather name="bell" size={36} color="#333" /></View>
            <Text style={styles.emptyTitle}>Sin notificaciones</Text>
            <Text style={styles.emptyText}>Cuando alguien interactúe con tu contenido, lo verás acá</Text>
          </View></RefreshableInboxEmpty>
        ) : (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FE2C55" colors={["#FE2C55"]} />
            }
          >
            {notifications.map((n) => (
              <NotifItem
                key={n.id}
                notif={n}
                onPress={() => {
                  void markRead(n.id);
                  openActivity(n);
                }}
              />
            ))}
            <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 80 }} />
          </ScrollView>
        )
      ) : (
        convosLoading && convos.length === 0 ? (
          <RefreshableInboxEmpty refreshing={refreshing} onRefresh={handleRefresh}><View style={styles.center}><ActivityIndicator color="#FE2C55" /></View></RefreshableInboxEmpty>
        ) : convosError ? (
          <RefreshableInboxEmpty refreshing={refreshing} onRefresh={handleRefresh}><View style={styles.emptyState}><Text style={styles.emptyText}>{convosError}</Text><TouchableOpacity onPress={()=>void loadConvos()} style={{padding:16}}><Text style={{color:"#A6D4DA"}}>Reintentar</Text></TouchableOpacity></View></RefreshableInboxEmpty>
        ) : convos.length === 0 && groups.length === 0 ? (
          <RefreshableInboxEmpty refreshing={refreshing} onRefresh={handleRefresh}><View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Feather name="message-square" size={36} color="#333" /></View>
            <Text style={styles.emptyTitle}>Sin mensajes</Text>
            <Text style={styles.emptyText}>Mandá un mensaje desde el perfil de cualquier usuario</Text>
          </View></RefreshableInboxEmpty>
        ) : (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FE2C55" colors={["#FE2C55"]} />
            }
          >
            {groups.map(g=><TouchableOpacity key={g.id} style={styles.notif} onPress={()=>router.push({pathname:"/chat-group",params:{groupId:g.id}})}><View style={[styles.avatar,{backgroundColor:"#2C3D49",alignItems:"center",justifyContent:"center"}]}><Feather name="users" color="#D7E5EB" size={24}/></View><View style={styles.notifBody}><Text style={styles.notifUser}>{g.name}</Text><Text style={styles.notifText} numberOfLines={1}>{g.last_message}</Text></View>{g.unread_count>0&&<View style={styles.badge}><Text style={styles.badgeText}>{g.unread_count}</Text></View>}</TouchableOpacity>)}
            {convos.map((c) => <ConvoItem key={c.id} convo={c} onOptions={(convo,anchor)=>setMenu({convo,anchor})} />)}
            <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 80 }} />
          </ScrollView>
        )
      )}
      </View>
      {menu&&<ConversationMenu anchor={menu.anchor} name={menu.convo.other_username} busy={removing} onClose={()=>setMenu(null)} onDelete={()=>{setRemoving(true);void hideConversation(menu.convo.id).then(async()=>{setMenu(null);await loadConvos();}).catch(e=>Alert.alert('No se pudo eliminar',e.message)).finally(()=>setRemoving(false));}} onDeleteAll={()=>{setRemoving(true);void supabase.rpc('inbox_clear_boundary').then(({data,error})=>{if(error||!data)Alert.alert('No se pudo preparar la selección','Inténtalo de nuevo.');else{setMenu(null);setClearBefore(data);}setRemoving(false);});}}/>}
      <ClearInboxDialog visible={clearBefore!==null} busy={removing} onCancel={()=>setClearBefore(null)} onConfirm={()=>{if(!clearBefore||removing)return;setRemoving(true);void supabase.rpc('clear_own_inbox',{p_before:clearBefore}).then(async({error})=>{if(error)Alert.alert('No se pudo eliminar','No se confirmó el borrado. Inténtalo de nuevo.');else{setClearBefore(null);setGroupRevision(n=>n+1);await Promise.all([loadConvos(),refresh()]);}setRemoving(false);});}}/>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 16,
  },
  pageTitle: { fontFamily: "Inter_500Medium", flex:1,color: v.ink, fontSize: 22, fontWeight: "normal" },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  markAllText: { fontFamily: "Inter_500Medium", color: v.ink, fontSize: 14, fontWeight: "normal" },
  tabs: {
    backgroundColor:v.white,marginTop:0,paddingTop:10,minHeight:44,
    flexDirection: "row",
    borderBottomWidth: 1, borderBottomColor: v.inboxLine,
    marginBottom: 0,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingBottom: 8 },
  tabLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { fontFamily: "Inter_500Medium", color: v.secondary, fontSize: 16, fontWeight: "normal" },
  tabTextActive: { color: v.ink },
  tabIndicator: {
    position: "absolute", bottom: 0,
    height: 2, width: 97, backgroundColor: "#25F4EE",
  },
  badge: {
    backgroundColor: "#FE2C55", borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
    minWidth: 20,minHeight:20,justifyContent:"center", alignItems: "center",
  },
  badgeText: { fontFamily: "Inter_500Medium", color: "#fff", fontSize: 12, fontWeight: "normal" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  swipeContent: { flex: 1 },
  list: { flex: 1 },
  notif: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 15, paddingVertical: 12, gap: 11,minHeight:90,
  },
  notifUnread: { backgroundColor: "#FFF1F3" },
  avatarWrap: { position: "relative" },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  iconBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#FFFFFF",
  },
  notifBody: { flex: 1 },
  notifUser: { fontFamily: "Inter_500Medium", color: v.ink, fontWeight: "normal", fontSize: 15 },
  notifText: { fontFamily: "Inter_400Regular", color: "#3F3F46", fontSize: 14, lineHeight: 20 },
  notifTime: { fontFamily: "Inter_400Regular", color: v.secondary, fontSize: 13, marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FE2C55" },
  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 14, paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#F0EFEC", alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontFamily: "Inter_500Medium", color: v.ink, fontSize: 18, fontWeight: "normal" },
  emptyText: { fontFamily: "Inter_400Regular", color: "#555", fontSize: 14, textAlign: "center", lineHeight: 20 },
});

