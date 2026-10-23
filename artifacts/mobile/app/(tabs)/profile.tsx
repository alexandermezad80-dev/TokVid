import ReferenceHeader from "../../components/reference/ReferenceHeader";
import ProfilePullRefresh from "../../components/ProfilePullRefresh";
import TokvidProfileIcon from "../../components/TokvidProfileIcon";
import BrandOutline from "../../components/reference/BrandOutline";
import {referenceVisual as v} from "../../constants/referenceVisual";
import {LinearGradient} from "expo-linear-gradient";
import {StatusBar} from "expo-status-bar";
import BrandAvatar from "../../components/reference/BrandAvatar";
import {usePublicationGrid} from "../../hooks/usePublicationGrid";
import {useMyConnections} from "../../hooks/useMyConnections";
import PublicationThumbnail from "../../components/PublicationThumbnail";
import { usePublishedMedia } from "../../hooks/usePublishedMedia";
import { useMySharedVideos } from "../../hooks/useMySharedVideos";
import { useLocalPublicationDrafts } from "../../hooks/useLocalPublicationDrafts";
import { requestRegistration } from "../../lib/features/auth/services/registrationBridge";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const tileWidth=Math.max(1,(Math.floor(width)-8)/3);
  const gridLayout={onLayout:()=>{},tile:{width:tileWidth,height:tileWidth*4/3}};
  const [expanded,setExpanded]=useState(false),[menu,setMenu]=useState(false);
  const connections=useMyConnections();
  const [tab, setTab] = useState<"videos" | "stories" | "shared" | "liked" | "saved" | "drafts">("videos");
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [profileSectionHeight, setProfileSectionHeight] = useState(0);
  const [filtersPinned,setFiltersPinned]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const refreshGuard=useRef(false);
  const scrollOffsetRef=useRef(0);
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, profile, signOut, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user) requestRegistration();
  }, [user]);
  const publications = usePublishedMedia({ userId: user?.id, enabled: !!user });
  const { savedVideos, refresh: refreshSaved } = useSavedVideos();
  const { followedIds } = useFollow();
  const { likedVideos, refreshLikes } = useVideoFeed(followedIds);
  const shared=useMySharedVideos(user?.id,tab==="shared");
  const drafts=useLocalPublicationDrafts(user?.id,tab==="drafts");
  const [removingDraftId,setRemovingDraftId]=useState<string|null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [user?.id])
  );

  const onRefresh=useCallback(async()=>{
    if(!user || refreshGuard.current)return;
    refreshGuard.current=true;setRefreshing(true);
    try{
      const tasks:Promise<unknown>[]=[
        Promise.resolve(refreshProfile()),
        connections.refresh(),
        publications.refresh(),
      ];
      if(tab==="saved")tasks.push(refreshSaved());
      if(tab==="liked")tasks.push(refreshLikes());
      if(tab==="shared")tasks.push(shared.refresh());
      if(tab==="drafts")tasks.push(drafts.refresh());
      const results=await Promise.allSettled(tasks);
      if(results.some(result=>result.status==='rejected'))Alert.alert('No se pudo actualizar el perfil','Comprueba tu conexión e inténtalo de nuevo.');
    }finally{refreshGuard.current=false;setRefreshing(false);}
  },[user?.id,refreshProfile,connections.refresh,publications.refresh,refreshSaved,refreshLikes,shared.refresh,drafts.refresh,tab]);
  if (!user) return null;
  const confirmRemoveDraft=(id:string)=>{
    if(removingDraftId)return;
    Alert.alert("Eliminar borrador","¿Eliminar este proyecto sin publicar de tu teléfono? Esta acción no se puede deshacer.",[
      {text:"Cancelar",style:"cancel"},
      {text:"Eliminar",style:"destructive",onPress:()=>{
        const owner=user.id;
        setRemovingDraftId(id);
        void drafts.remove(id).catch(e=>{
          Alert.alert("No se pudo eliminar",e instanceof Error?e.message:"Inténtalo de nuevo.");
        }).finally(()=>{setRemovingDraftId(current=>current===id?null:current);});
      }},
    ]);
  };

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
        <TouchableOpacity style={styles.menuBtn} onPress={()=>router.push("/user-tools")} accessibilityLabel="Herramientas de usuario"><Feather name="menu" size={24} color="#0B0B0D"/></TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={()=>router.push({pathname:"/(tabs)/friends",params:{tab:"friends"}})} accessibilityLabel="Amigos"><Feather name="users" size={22} color="#0B0B0D"/></TouchableOpacity>
        <View style={{flex:1}}/><TouchableOpacity style={styles.menuBtn} onPress={()=>router.push("/edit-profile")} accessibilityLabel="Información de perfil"><Feather name="more-horizontal" size={24} color="#0B0B0D"/></TouchableOpacity>
      </ReferenceHeader>
      <ProfilePullRefresh scrollOffsetRef={scrollOffsetRef} refreshing={refreshing} onRefresh={onRefresh}>
  <ScrollView style={{flex:1}} stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false} overScrollMode="never"
        
        scrollEventThrottle={16}
        onScroll={event=>{
      scrollOffsetRef.current=Math.max(0,event.nativeEvent.contentOffset.y);
          const pinned=event.nativeEvent.contentOffset.y>=Math.max(1,profileSectionHeight-1);
          setFiltersPinned(current=>current===pinned?current:pinned);
        }}
        onLayout={event => setScrollViewportHeight(event.nativeEvent.layout.height)}
        contentContainerStyle={scrollViewportHeight > 0 && profileSectionHeight > 0 ? {minHeight: scrollViewportHeight + profileSectionHeight} : undefined}>
      <View style={styles.profileSection} onLayout={event => setProfileSectionHeight(event.nativeEvent.layout.height)}>
        <View style={{width:90,gap:8}}>
          <View style={styles.avatarWrap}>
            <TouchableOpacity onPress={()=>router.push({pathname:"/story-viewer",params:{userId:user.id}})} accessibilityLabel="Ver mis historias">
              <BrandAvatar uri={avatarUrl(user,profile)} size={90} radius={12} reference/>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBadge} onPress={()=>router.push("/story-create")} accessibilityLabel="Añadir historia">
              <LinearGradient colors={[v.steelDark,v.steelLight]} start={{x:0,y:0.5}} end={{x:1,y:0.5}} style={styles.editBadgeFill}>
                <Feather name="plus" size={14} color="#FFF"/>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
          {!!connections.error&&<TouchableOpacity onPress={()=>void connections.refresh()}><Text style={{ fontFamily: "Inter_400Regular",color:"#D32F3F",fontSize:12}}>{connections.error}</Text></TouchableOpacity>}
        </View>
      </View>
      <View style={[styles.stickySlot,{width,elevation:filtersPinned?1:0,shadowOpacity:filtersPinned?0.05:0}]}>
  <View style={styles.tabBar}>{([
        {key:"videos",icon:"grid",label:"Videos"},{key:"stories",icon:"clock",label:"Historias"},{key:"shared",icon:"share-2",label:"Compartidos"},{key:"liked",icon:"heart",label:"Me gusta"},{key:"saved",icon:"bookmark",label:"Guardados"},{key:"drafts",icon:"file-text",label:"Borradores"},
      ] as const).map(item=><TouchableOpacity key={item.key} accessibilityLabel={item.label} accessibilityState={{selected:tab===item.key}} onPress={()=>setTab(item.key)} style={[styles.tabItem,{width:width/6,flex:0},tab===item.key&&styles.tabItemActive]}>{item.key==="videos"||item.key==="stories"||item.key==="shared"||item.key==="drafts"?<TokvidProfileIcon name={item.key} size={22} color={tab===item.key?v.ink:v.inactive}/>:<Feather name={item.icon} size={22} color={tab===item.key?v.ink:v.inactive}/>}</TouchableOpacity>)}</View>
        {filtersPinned&&<>
          <View pointerEvents="none" style={styles.stickyTopShade}/>
          <View pointerEvents="none" style={styles.stickyBottomShade}/>
        </>}
  </View>
      {tab==="stories"?<View style={styles.emptyState}><TokvidProfileIcon name="stories" size={40} color="#75828D"/><TouchableOpacity onPress={()=>router.push({pathname:"/story-viewer",params:{userId:user.id}})}><Text style={styles.emptyTitle}>Ver mis historias</Text></TouchableOpacity><TouchableOpacity onPress={()=>router.push("/story-create")}><Text style={styles.bioMore}>Añadir historia</Text></TouchableOpacity></View>:
      tab === "drafts" ? (
        <View>
          {drafts.loading && drafts.items.length===0 ? <ActivityIndicator color="#85D5DB" style={{padding:24}}/> : null}
          {!!drafts.error && <TouchableOpacity style={styles.emptyState} onPress={()=>void drafts.refresh().catch(()=>{})}
            accessibilityLabel="Reintentar cargar borradores">
            <TokvidProfileIcon name="drafts" size={40} color="#75828D"/>
            <Text style={styles.emptyText}>{drafts.error}</Text>
            <Text style={{color:"#2F777B"}}>Reintentar</Text>
          </TouchableOpacity>}
          {!drafts.loading && !drafts.error && drafts.items.length===0 && <View style={styles.emptyState}>
            <TokvidProfileIcon name="drafts" size={40} color="#75828D"/>
            <Text style={styles.emptyTitle}>Sin borradores</Text>
            <Text style={styles.emptyText}>Tus fotos y videos sin publicar aparecerán aquí. Solo tú puedes verlos en este teléfono.</Text>
          </View>}
          <View style={[styles.grid,{width}]}>
            {drafts.items.map(item=><View key={item.id} style={[styles.gridItem,gridLayout.tile]}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Continuar borrador: ${item.caption||"Sin descripción"}`}
                style={styles.draftCover} onPress={()=>router.push({pathname:"/(tabs)/create",params:{draftId:item.id}})}>
                {item.thumbnailUri||item.kind==="image"
                  ?<Image source={{uri:item.thumbnailUri??item.uri}} style={StyleSheet.absoluteFill} resizeMode="cover"/>
                  :<Feather name="video" size={32} color="#B9C3C9"/>}
                <View style={styles.draftKind}><Feather name={item.kind==="video"?"video":"image"} size={13} color="#FFF"/></View>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Eliminar borrador: ${item.caption||"Sin descripción"}`}
                disabled={removingDraftId!==null} onPress={()=>confirmRemoveDraft(item.id)} style={styles.draftDelete}>
                <Feather name="trash-2" color="#FFF" size={17}/>
              </TouchableOpacity>
            </View>)}
          </View>
        </View>
      ) : tab === "saved" ? (
        savedVideos.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bookmark" size={40} color="#75828D" />
            <Text style={styles.emptyTitle}>Sin guardados</Text>
            <Text style={styles.emptyText}>
              Tocá el marcador en cualquier video para guardarlo acá
            </Text>
          </View>
        ) : (
          <View style={[styles.grid,{width}]}>
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
      ) : tab === "shared" ? (
        <View>
          {shared.loading && shared.items.length===0 ? <ActivityIndicator color="#85D5DB" style={{padding:24}}/> : null}
          {!!shared.error && <TouchableOpacity style={styles.emptyState} onPress={()=>void shared.refresh()}>
            <TokvidProfileIcon name="shared" size={40} color="#75828D"/>
            <Text style={styles.emptyText}>{shared.error}</Text>
            <Text style={{color:"#2F777B"}}>Reintentar</Text>
          </TouchableOpacity>}
          {!shared.loading && !shared.error && shared.items.length===0 && !shared.hasMore &&
            <View style={styles.emptyState}>
              <TokvidProfileIcon name="shared" size={40} color="#75828D"/>
              <Text style={styles.emptyTitle}>Sin videos compartidos</Text>
              <Text style={styles.emptyText}>Los videos de otros creadores que compartas aparecerán aquí</Text>
            </View>}
          <View style={[styles.grid,{width}]}>
            {shared.items.map(item=><TouchableOpacity key={item.id} style={[styles.gridItem,gridLayout.tile]}
              accessibilityRole="button" accessibilityLabel={`Abrir video compartido: ${item.caption || "Sin descripción"}`}
              onPress={()=>router.push({pathname:"/publication",params:{id:item.id}})}>
              <PublicationThumbnail item={item}/>
            </TouchableOpacity>)}
          </View>
          {shared.hasMore && <TouchableOpacity style={{padding:20,alignItems:"center"}} disabled={shared.loading}
            onPress={()=>void shared.loadMore()}><Text style={{color:"#2F777B"}}>
            {shared.loading?"Cargando…":shared.items.length?"Ver más":"Buscar más videos"}
          </Text></TouchableOpacity>}
        </View>
      ) : tab === "liked" ? (
        likedVideos.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="heart" size={40} color="#75828D" />
            <Text style={styles.emptyTitle}>Sin likes</Text>
            <Text style={styles.emptyText}>
              Los videos que te gusten aparecerán acá
            </Text>
          </View>
        ) : (
          <View style={[styles.grid,{width}]}>
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
          {!publications.loading && !publications.error && publications.items.length === 0 && <TouchableOpacity style={styles.emptyState} onPress={() => router.push("/(tabs)/create")}>
            <TokvidProfileIcon name="videos" size={40} color="#75828D"/>
            <View style={styles.emptyAction}>
              <Feather name="plus" size={22} color="#6B7580"/>
              <Text style={[styles.emptyText,{fontFamily:"Inter_400Regular",fontSize:14,lineHeight:19}]}>{"Comparte tu primera\nfoto o video"}</Text>
            </View>
          </TouchableOpacity>}
          <View style={[styles.grid,{width}]}>{publications.items.map(item => <TouchableOpacity key={item.id} style={[styles.gridItem,gridLayout.tile]} accessibilityRole="button" accessibilityLabel={`Abrir publicación: ${item.caption || "Sin descripción"}`} onPress={() => router.push({ pathname:"/publication", params:{id:item.id} })}><PublicationThumbnail item={item} /></TouchableOpacity>)}</View>
          {publications.hasMore && <TouchableOpacity onPress={() => void publications.loadMore()} disabled={publications.loading} style={{padding:20,alignItems:"center"}}><Text style={{color:"#A6E1E5"}}>{publications.loading ? "Cargando…" : "Ver más"}</Text></TouchableOpacity>}
        </View>
      )}

      <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 80 }} />
      </ScrollView>
      </ProfilePullRefresh>

    </View>
  );
}

const styles = StyleSheet.create({
  accountButton:{width:84,minHeight:29,borderRadius:7,backgroundColor:v.white,alignItems:"center",justifyContent:"center",opacity:1},accountLabel:{ fontFamily: "Inter_400Regular",color:v.ink,fontSize:11},bioMore:{ fontFamily: "Inter_400Regular",color:v.ink,fontSize:12},
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
  handle: { fontFamily: "Inter_500Medium", flex: 1, minWidth: 0, textAlign: "center", color: "#fff", fontSize: 17, fontWeight: "normal" },
  profileSection: {
    flexDirection:"row",
    paddingTop:4,paddingBottom:8,
    paddingHorizontal: 16,
    gap: 10,
  },
  avatarWrap: { position: "relative",width:104,height:104,marginBottom:-14,marginRight:-14 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#FE2C55",
    backgroundColor: "#1C1C1E",
  },
  editBadge: {
    position:"absolute",bottom:0,right:0,width:20,height:20,borderRadius:10,
    borderWidth:1,borderColor:"#FFFFFF",overflow:"hidden",zIndex:2,
  },
  editBadgeFill:{flex:1,width:"100%",alignItems:"center",justifyContent:"center"},
  displayName: { fontFamily: "Inter_500Medium", color: v.ink, fontSize: 16, fontWeight: "normal" },
  email: { fontFamily: "Inter_400Regular", color: "#555", fontSize: 13 },
  bio: { fontFamily: "Inter_400Regular", color: v.ink, fontSize: 12,lineHeight:17,textAlign:"left",marginRight:24 },
  stats: { flexDirection: "row",gap:4,marginTop:12,marginBottom:4 },
  stat: { flex:1,alignItems: "center",gap:2 },
  statValue: { fontFamily: "Inter_500Medium", color: v.ink, fontSize: 16, fontWeight: "normal" },
  statLabel: { fontFamily: "Inter_400Regular", color: v.label, fontSize: 10.5 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  editBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    paddingHorizontal: 52,
    paddingVertical: 10,
  },
  editBtnText: { fontFamily: "Inter_500Medium", color: "#fff", fontWeight: "normal", fontSize: 14 },
  shareBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    padding: 10,
  },
  stickySlot:{width:"100%",height:39,backgroundColor:v.white,zIndex:1,elevation:0,shadowColor:"#000000",shadowOpacity:0,shadowRadius:2,shadowOffset:{width:0,height:1}},
  stickyTopShade:{position:"absolute",top:0,left:0,right:0,height:1,backgroundColor:"rgba(84,96,110,0.18)"},
  stickyBottomShade:{position:"absolute",bottom:0,left:0,right:0,height:1,backgroundColor:"rgba(84,96,110,0.18)"},
  tabBar:{backgroundColor:v.white,flexDirection:"row",width:"100%",height:39},
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabItemActive: {},
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2, paddingHorizontal: 0, paddingVertical: 2,alignSelf:"stretch" },
  draftCover:{flex:1,alignItems:"center",justifyContent:"center"},
  draftKind:{position:"absolute",bottom:5,left:5,backgroundColor:"#00000099",padding:5,borderRadius:5},
  draftDelete:{position:"absolute",top:5,right:5,width:32,height:32,alignItems:"center",justifyContent:"center",backgroundColor:"#000000B3",borderRadius:16},
  gridItem: {
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
    fontWeight: "normal",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  savedBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
  },
  emptyAction:{alignItems:"center",gap:5},
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontFamily: "Inter_500Medium",
    color: "#101010",
    fontSize: 18,
    fontWeight: "normal",
  },
  emptyText: { fontFamily: "Inter_400Regular",
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

