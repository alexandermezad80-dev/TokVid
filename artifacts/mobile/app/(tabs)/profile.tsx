import ReferenceHeader from "../../components/reference/ReferenceHeader";
import BrandOutline from "../../components/reference/BrandOutline";
import {referenceVisual as v} from "../../constants/referenceVisual";
import {LinearGradient} from "expo-linear-gradient";
import {StatusBar} from "expo-status-bar";
import BrandAvatar from "../../components/reference/BrandAvatar";
import {usePublicationGrid} from "../../hooks/usePublicationGrid";
import {useMyConnections} from "../../hooks/useMyConnections";
import PublicationThumbnail from "../../components/PublicationThumbnail";
import { usePublishedMedia } from "../../hooks/usePublishedMedia";
import { requestRegistration } from "../../lib/features/auth/services/registrationBridge";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useFollow } from "../../context/FollowContext";
import { useVideoFeed } from "../../hooks/useVideoFeed";
import { useSavedVideos } from "../../hooks/useSavedVideos";


function avatarUrl(user: any, profile: any): string {
  if (profile?.avatar_url) return profile.avatar_url;
  return user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? "";
}

export default function ProfileScreen() {
  const {width}=useWindowDimensions();
  const gridLayout={onLayout:()=>{},tile:{width:(width-4)/3,height:(width-4)/3*4/3}};
  const [expanded,setExpanded]=useState(false),[menu,setMenu]=useState(false);
  const connections=useMyConnections();
  const [tab, setTab] = useState<"videos" | "stories" | "gallery" | "liked" | "saved">("videos");
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, profile, signOut, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user) requestRegistration();
  }, [user]);
  const publications = usePublishedMedia({ userId: user?.id, enabled: !!user });
  const { savedVideos } = useSavedVideos();
  const { followedIds } = useFollow();
  const { likedVideos } = useVideoFeed(followedIds);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [user?.id])
  );

  if (!user) return null;

  const handleSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que querés salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  const displayName =
    profile?.username ??
    user?.user_metadata?.display_name ??
    user?.email?.split("@")[0] ??
    "Vos";

  const handle = `@${profile?.username ?? user?.user_metadata?.username ?? displayName}`;
  const bio = profile?.bio ?? "Living life one frame at a time 🎬✨";
  const followers = profile?.followers_count ?? 0;
  const following = profile?.following_count ?? 0;
  const likes = profile?.likes_count ?? 0;

  const fmtCount = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  return (
    <View style={styles.container}>
      <ReferenceHeader variant="profile">
        <TouchableOpacity style={styles.menuBtn} onPress={()=>router.push("/user-tools")} accessibilityLabel="Herramientas de usuario"><Feather name="menu" size={24} color="#FFF"/></TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={()=>router.push({pathname:"/(tabs)/friends",params:{tab:"friends"}})} accessibilityLabel="Amigos"><Feather name="users" size={22} color="#FFF"/></TouchableOpacity>
        <View style={{flex:1}}/><TouchableOpacity style={styles.menuBtn} onPress={()=>router.push("/edit-profile")} accessibilityLabel="Información de perfil"><Feather name="more-horizontal" size={24} color="#FFF"/></TouchableOpacity>
      </ReferenceHeader>
      <View style={styles.profileSection}>
        <View style={{width:84,gap:8}}>
          <TouchableOpacity style={styles.avatarWrap} onPress={()=>router.push({pathname:"/story-viewer",params:{userId:user.id}})} accessibilityLabel="Ver mis historias">
            <BrandAvatar uri={avatarUrl(user,profile)} size={84} radius={12} reference/>
            <TouchableOpacity style={styles.editBadge} onPress={()=>router.push("/story-create")} accessibilityLabel="Añadir historia"><Feather name="plus" size={18} color="#FFF"/></TouchableOpacity>
          </TouchableOpacity>
          <Pressable onPress={()=>router.push({pathname:"/user-tools",params:{section:"balance"}})} style={styles.accountButton}><BrandOutline radius={7}/><Text style={styles.accountLabel}>Saldo</Text></Pressable>
          <Pressable disabled accessibilityState={{disabled:true}} style={styles.accountButton}><BrandOutline radius={7}/><Text style={styles.accountLabel}>Suscripción</Text></Pressable>
        </View>
        <View style={{flex:1,minWidth:0,gap:8}}>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.displayName}>{handle}</Text>
          <View style={styles.stats}>{[
            {value:fmtCount(likes),label:"Me gusta",target:"liked"},
            {value:connections.loading?"…":fmtCount(connections.following.length),label:"Siguiendo",target:"following"},
            {value:connections.loading?"…":fmtCount(connections.followers.length),label:"Seguidores",target:"followers"},
          ].map(stat=><TouchableOpacity key={stat.target} style={styles.stat} onPress={()=>stat.target==="liked"?setTab("liked"):router.push({pathname:"/(tabs)/friends",params:{tab:stat.target}})}><Text maxFontSizeMultiplier={1.2} style={styles.statValue}>{stat.value}</Text><Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.statLabel}>{stat.label}</Text></TouchableOpacity>)}</View>
          <Text onPress={()=>setExpanded(true)} accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel="Biografía" maxFontSizeMultiplier={1.2} style={styles.bio} numberOfLines={expanded?undefined:3}>{bio}</Text>
          {!!bio&&expanded&&<TouchableOpacity onPress={()=>setExpanded(false)}><Text style={styles.bioMore}>Ver menos</Text></TouchableOpacity>}
          {!!connections.error&&<TouchableOpacity onPress={()=>void connections.refresh()}><Text style={{color:"#D32F3F",fontSize:12}}>{connections.error}</Text></TouchableOpacity>}
        </View>
      </View>
      <View style={styles.tabBar}>{([
        {key:"videos",icon:"grid",label:"Videos"},{key:"stories",icon:"clock",label:"Historias"},{key:"gallery",icon:"image",label:"Galería"},{key:"liked",icon:"heart",label:"Me gusta"},{key:"saved",icon:"bookmark",label:"Guardados"},{key:"more",icon:"more-horizontal",label:"Más"},
      ] as const).map(item=><TouchableOpacity key={item.key} accessibilityLabel={item.label} accessibilityState={{selected:tab===item.key}} onPress={()=>item.key==="more"?router.push("/user-tools"):setTab(item.key)} style={[styles.tabItem,tab===item.key&&styles.tabItemActive]}><Feather name={item.icon} size={22} color={tab===item.key?v.ink:v.inactive}/></TouchableOpacity>)}</View>
      <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false}>
      {tab==="stories"?<View style={styles.emptyState}><TouchableOpacity onPress={()=>router.push({pathname:"/story-viewer",params:{userId:user.id}})}><Text style={styles.emptyTitle}>Ver mis historias</Text></TouchableOpacity><TouchableOpacity onPress={()=>router.push("/story-create")}><Text style={styles.bioMore}>Añadir historia</Text></TouchableOpacity></View>:
      tab === "saved" ? (
        savedVideos.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bookmark" size={40} color="#333" />
            <Text style={styles.emptyTitle}>Sin guardados</Text>
            <Text style={styles.emptyText}>
              Tocá el marcador en cualquier video para guardarlo acá
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {savedVideos.map((v, idx) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.gridItem,gridLayout.tile]}
                onPress={() => router.push(`/saved-feed?startIndex=${idx}`)}
              >
                <PublicationThumbnail item={v} />
                <View style={styles.savedBadge}>
                  <Feather name="bookmark" size={10} color="#FFD60A" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : tab === "liked" ? (
        likedVideos.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="heart" size={40} color="#333" />
            <Text style={styles.emptyTitle}>Sin likes</Text>
            <Text style={styles.emptyText}>
              Los videos que te gusten aparecerán acá
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {likedVideos.map((v, idx) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.gridItem,gridLayout.tile]}
                onPress={() => router.push(`/liked-feed?startIndex=${idx}`)}
              >
                <PublicationThumbnail item={v} />
                <View style={styles.viewsBadge}>
                  <Feather name="heart" size={10} color="#FE2C55" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : (
        <View>
          {publications.loading && publications.items.length === 0 ? <ActivityIndicator color="#85D5DB" style={{ padding: 24 }} /> : null}
          {!!publications.error && <TouchableOpacity onPress={() => void publications.refresh()} style={styles.emptyState}><Text style={styles.emptyText}>{publications.error}</Text><Text style={{color:"#9CDEE1"}}>Reintentar</Text></TouchableOpacity>}
          {!publications.loading && !publications.error && publications.items.length === 0 && <TouchableOpacity style={styles.emptyState} onPress={() => router.push("/(tabs)/create")}><Feather name="plus-circle" size={36} color="#8DCBD0" /><Text style={styles.emptyTitle}>Tu primera publicación</Text><Text style={styles.emptyText}>Comparte una foto o un video desde Galería.</Text></TouchableOpacity>}
          <View style={styles.grid}>{publications.items.filter(item=>tab!=="gallery"||item.mediaType==="image").map(item => <TouchableOpacity key={item.id} style={[styles.gridItem,gridLayout.tile]} accessibilityRole="button" accessibilityLabel={`Abrir publicación: ${item.caption || "Sin descripción"}`} onPress={() => router.push({ pathname:"/publication", params:{id:item.id} })}><PublicationThumbnail item={item} /></TouchableOpacity>)}</View>
          {publications.hasMore && <TouchableOpacity onPress={() => void publications.loadMore()} disabled={publications.loading} style={{padding:20,alignItems:"center"}}><Text style={{color:"#A6E1E5"}}>{publications.loading ? "Cargando…" : "Ver más"}</Text></TouchableOpacity>}
        </View>
      )}

      <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 80 }} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  accountButton:{width:84,minHeight:32,borderRadius:7,backgroundColor:v.white,alignItems:"center",justifyContent:"center",opacity:1},accountLabel:{ fontFamily: "Inter_400Regular",color:v.ink,fontSize:11},bioMore:{ fontFamily: "Inter_400Regular",color:v.ink,fontSize:12},
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 0,backgroundColor:"#000000",
  },
  menuBtn: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: { fontFamily: "Inter_600SemiBold", flex: 1, minWidth: 0, textAlign: "center", color: "#fff", fontSize: 17, },
  profileSection: {
    flexDirection:"row",
    paddingTop:4,paddingBottom:8,
    paddingHorizontal: 16,
    gap: 16,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#FE2C55",
    backgroundColor: "#1C1C1E",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 13,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  displayName: { fontFamily: "Inter_600SemiBold", color: v.ink, fontSize: 16, },
  email: { fontFamily: "Inter_400Regular", color: "#555", fontSize: 13 },
  bio: { fontFamily: "Inter_400Regular", color: v.ink, fontSize: 12,lineHeight:16 },
  stats: { flexDirection: "row",gap:4,marginTop:12,marginBottom:4 },
  stat: { flex:1,alignItems: "center",gap:2 },
  statValue: { fontFamily: "Inter_600SemiBold", color: v.ink, fontSize: 16, },
  statLabel: { fontFamily: "Inter_400Regular", color: v.label, fontSize: 10.5 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  editBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    paddingHorizontal: 52,
    paddingVertical: 10,
  },
  editBtnText: { fontFamily: "Inter_500Medium", color: "#fff", fontSize: 14 },
  shareBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    padding: 10,
  },
  tabBar: {
    backgroundColor:v.white,
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: v.ink,
    height:39,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabItemActive: {},
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2, paddingHorizontal: 0, paddingVertical: 2 },
  gridItem: {
    width: "32%",
    aspectRatio: 0.75, borderRadius: 0,
    backgroundColor: "#111",
    overflow: "hidden",
  },
  viewsBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewsText: { fontFamily: "Inter_500Medium",
    color: "#fff",
    fontSize: 11,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  savedBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontFamily: "Inter_500Medium",
    color: "#101010",
    fontSize: 18,
    },
  emptyText: { fontFamily: "Inter_400Regular",
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

