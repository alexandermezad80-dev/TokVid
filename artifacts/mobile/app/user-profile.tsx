import ProfileTabBar from "../components/ProfileTabBar";
import ReferenceHeader from "../components/reference/ReferenceHeader";
import BrandOutline from "../components/reference/BrandOutline";
import {referenceVisual as v} from "../constants/referenceVisual";
import {LinearGradient} from "expo-linear-gradient";
import {StatusBar} from "expo-status-bar";
import BrandAvatar from "../components/reference/BrandAvatar";
import {readProfileActivity,readProfileVisibility,type ProfileVisibility} from "../lib/features/profile/visibility";
import type {VideoItem} from "../hooks/useVideoFeed";
import {publicationId} from "../lib/features/publishing/model";
import {usePublicationGrid} from "../hooks/usePublicationGrid";
import {openPrivateConversation} from "../lib/features/messages/services/private-messages";
import PublicationThumbnail from "../components/PublicationThumbnail";
import { usePublishedMedia } from "../hooks/usePublishedMedia";
import { requestRegistration } from "../lib/features/auth/services/registrationBridge";
import { Feather } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useFollow } from "../context/FollowContext";
import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  likes_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function avatarUrl(profile: PublicProfile) {
  if (profile.avatar_url) return profile.avatar_url;
  const seed = encodeURIComponent(profile.username);
  return `https://api.dicebear.com/9.x/initials/png?seed=${seed}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=128`;
}

interface ProfileVideo {
  id: string;
  url: string;
  likes_count: number;
}

// ─── Follow button ────────────────────────────────────────────────────────────

function FollowButton({ userId }: { userId: string }) {
  const { isFollowing, toggleFollow, loadingIds } = useFollow();
  const following = isFollowing(userId);
  const loading = loadingIds.has(userId);

  return (
    <TouchableOpacity
      style={styles.followBtn}
      accessibilityLabel={following ? "Amigos: dejar de seguir" : "Seguir"}
      onPress={() => toggleFollow(userId)}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={v.darkGray} size="small" />
      ) : (
        <><Feather name={following ? "users" : "user-plus"} size={14} color={v.darkGray}/><Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.followBtnText}>{following ? "Amigos" : "Seguir"}</Text></>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const gridLayout=usePublicationGrid();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) requestRegistration();
  }, [user]);

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const publications = usePublishedMedia({ userId, enabled: !!userId && !!user });
  const videos = publications.items;
  const videosLoading = publications.loading;
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'videos'|'liked'|'shared'>('videos');
  const [expanded,setExpanded]=useState(false),[visibility,setVisibility]=useState<ProfileVisibility>({show_likes:false,show_shares:false});
  const [activity,setActivity]=useState<VideoItem[]>([]),[activityLoading,setActivityLoading]=useState(false),[activityError,setActivityError]=useState(''),[activityMore,setActivityMore]=useState(false),[activityOffset,setActivityOffset]=useState(0);
  useFocusEffect(useCallback(()=>{let active=true;setVisibility({show_likes:false,show_shares:false});void readProfileVisibility(userId).then(v=>{if(active){setVisibility(v);setTab(current=>current==='liked'&&!v.show_likes||current==='shared'&&!v.show_shares?'videos':current);}}).catch(()=>{});return()=>{active=false;};},[userId]));
  useEffect(()=>{setActivity([]);setActivityOffset(0);},[userId,tab]);
  useEffect(()=>{let active=true;if(tab==='videos')return;setActivityLoading(true);void readProfileActivity(userId,tab,activityOffset).then(page=>{if(active){setActivity(old=>activityOffset?[...old,...page.items.filter(v=>!old.some(o=>o.id===v.id))]:page.items);setActivityMore(page.hasMore);setActivityError('');}}).catch(e=>{if(active)setActivityError(e.message);}).finally(()=>{if(active)setActivityLoading(false);});return()=>{active=false;};},[userId,tab,activityOffset]);
  const [msgLoading, setMsgLoading] = useState(false);

  const openChat = async () => {
    if (!user || !userId || !profile) return;
    setMsgLoading(true);
    let convId:string;
    try{convId=await openPrivateConversation(userId);}catch(e){Alert.alert("No se pudo abrir el chat",e instanceof Error?e.message:"Inténtalo de nuevo.");return;}finally{setMsgLoading(false);}
    router.push(
      `/chat?conversationId=${convId}&otherUserId=${userId}&otherUsername=${encodeURIComponent(profile.username)}&otherAvatar=${encodeURIComponent(profile.avatar_url ?? "")}`
    );
  };

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, followers_count, following_count, likes_count")
      .eq("id", userId)
      .single();
    setProfile(data as PublicProfile | null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void fetchProfile(); }, [fetchProfile]);
  const visit=useRef<{key:string;id:string}|null>(null);
  useEffect(()=>{if(!user||!userId||user.id===userId)return;const key=`${user.id}:${userId}`;if(visit.current?.key!==key)visit.current={key,id:publicationId()};void supabase.rpc("record_profile_visit",{p_other_id:userId,p_event_id:visit.current.id});},[user?.id,userId]);
  if (!user) return null;
  if(user.id===userId) return <Redirect href="/(tabs)/profile"/>;

  const shown=tab==='videos'?videos:activity;
  const error=tab==='videos'?publications.error:activityError;
  const isLoading=tab==='videos'?videosLoading:activityLoading;
  const connections=(kind:'friends'|'following'|'followers')=>router.push({pathname:'/profile-connections',params:{userId,kind}});
  return <View onLayout={gridLayout.onLayout} style={styles.container}>
   <ReferenceHeader variant="profile"><TouchableOpacity style={styles.backBtn} onPress={()=>router.back()} accessibilityLabel="Volver"><Feather name="arrow-left" size={24} color="#FFF"/></TouchableOpacity><TouchableOpacity style={styles.backBtn} onPress={()=>connections('friends')} accessibilityLabel="Amigos y seguidores"><Feather name="users" size={22} color="#FFF"/></TouchableOpacity><View style={{flex:1}}/></ReferenceHeader>
   <View testID="visited-profile-body" style={{flex:1,minHeight:0}}>
   {loading?<View style={[styles.center,{flex:1}]}><ActivityIndicator color="#2F9A9F"/></View>:!profile?<View style={[styles.center,{flex:1}]}><Text style={styles.gridStateTitle}>Usuario no encontrado</Text></View>:<ScrollView style={{flex:1}} showsVerticalScrollIndicator={false}>
    <View style={styles.profileSection}>
     <View style={{width:90,gap:8}}><TouchableOpacity onPress={()=>profile.avatar_url&&router.push({pathname:'/profile-photo',params:{uri:profile.avatar_url}})} accessibilityLabel="Ver foto de perfil"><BrandAvatar uri={profile.avatar_url} size={90} radius={12} reference/></TouchableOpacity>
      <TouchableOpacity style={styles.accountButton} onPress={openChat} disabled={msgLoading}><BrandOutline radius={7}/>{msgLoading?<ActivityIndicator color={v.ink}/>:<Text style={styles.accountLabel}>Mensajes</Text>}</TouchableOpacity>
      <TouchableOpacity style={styles.accountButton} disabled accessibilityState={{disabled:true}}><BrandOutline radius={7}/><Text style={styles.accountLabel}>Suscripción</Text></TouchableOpacity>
     </View>
     <View style={{flex:1,gap:8,minWidth:0}}><View style={styles.nameRow}><Text numberOfLines={1} style={[styles.displayName,{flexShrink:1}]}>@{profile.username}</Text><FollowButton userId={profile.id}/></View>
      <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{fmtCount(profile.likes_count)}</Text><Text style={styles.statLabel}>Me gusta</Text></View><TouchableOpacity style={styles.stat} onPress={()=>connections('following')}><Text style={styles.statValue}>{fmtCount(profile.following_count)}</Text><Text style={styles.statLabel}>Siguiendo</Text></TouchableOpacity><TouchableOpacity style={styles.stat} onPress={()=>connections('followers')}><Text style={styles.statValue}>{fmtCount(profile.followers_count)}</Text><Text style={styles.statLabel}>Seguidores</Text></TouchableOpacity></View>
      {!!profile.bio&&<><Text onPress={()=>setExpanded(true)} accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel="Biografía" numberOfLines={expanded?undefined:3} style={styles.bio}>{profile.bio}</Text>{expanded&&<TouchableOpacity onPress={()=>setExpanded(false)}><Text style={styles.more}>Ver menos</Text></TouchableOpacity>}</>}
     </View>
    </View>
    <View style={styles.tabBar}>{(['videos',...(visibility.show_likes?['liked']:[]),...(visibility.show_shares?['shared']:[])] as ('videos'|'liked'|'shared')[]).map(t=><TouchableOpacity key={t} onPress={()=>setTab(t)} accessibilityLabel={t==='videos'?'Publicaciones':t==='liked'?'Me gusta':'Compartidos'} accessibilityState={{selected:tab===t}} style={[styles.tabItem,tab===t&&styles.tabItemActive]}><Feather name={t==='videos'?'grid':t==='liked'?'heart':'share-2'} size={22} color={tab===t?v.ink:v.inactive}/></TouchableOpacity>)}</View>
    {!!error&&<Text style={styles.gridStateText}>{error}</Text>}
    <View style={styles.grid}>{shown.map(v=><TouchableOpacity key={v.id} style={[styles.gridItem,gridLayout.tile]} onPress={()=>router.push({pathname:'/publication',params:{id:v.id}})}><PublicationThumbnail item={v}/></TouchableOpacity>)}</View>
    {isLoading?<ActivityIndicator style={{margin:24}} color="#2F9A9F"/>:!shown.length&&!error?<View style={styles.center}><Text style={styles.gridStateText}>Todavía no hay publicaciones en esta sección.</Text></View>:null}
    {(tab==='videos'?publications.hasMore:activityMore)&&<TouchableOpacity disabled={isLoading} style={{padding:20}} onPress={()=>tab==='videos'?void publications.loadMore():setActivityOffset(n=>n+60)}><Text style={[styles.gridStateText,{color:'#2F777B'}]}>Ver más</Text></TouchableOpacity>}
    <View style={{height:24}}/>
   </ScrollView>}
   </View>
   <ProfileTabBar/>
  </View>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#FFF'},header:{backgroundColor:'#000',flexDirection:'row',alignItems:'center',paddingHorizontal:12},backBtn:{width:44,height:44,alignItems:'center',justifyContent:'center'},center:{minHeight:180,justifyContent:'center',alignItems:'center',padding:24},profileSection:{flexDirection:'row',paddingHorizontal:16,paddingTop:8,paddingBottom:8,gap:10},accountButton:{width:84,minHeight:29,borderRadius:7,backgroundColor:v.white,alignItems:'center',justifyContent:'center'},accountLabel:{ fontFamily: "Inter_400Regular",color:v.ink,fontSize:11},displayName:{ fontFamily: "Inter_500Medium",color:v.ink,fontSize:16,fontWeight:"normal"},stats:{flexDirection:'row',gap:4,marginTop:12,marginBottom:4},stat:{flex:1,alignItems:'center',gap:2},statValue:{ fontFamily: "Inter_500Medium",color:v.ink,fontSize:16,fontWeight:"normal"},statLabel:{ fontFamily: "Inter_400Regular",color:v.label,fontSize:10.5},bio:{ fontFamily: "Inter_400Regular",color:v.ink,fontSize:12,lineHeight:17,textAlign:'left',marginRight:24},more:{ fontFamily: "Inter_400Regular",color:v.ink,fontSize:12,textDecorationLine:'underline'},nameRow:{flexDirection:'row',alignItems:'center',gap:8,minWidth:0},followBtn:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:0,backgroundColor:v.input,borderWidth:1,borderColor:v.border,borderRadius:16,paddingHorizontal:8,minHeight:26,justifyContent:'center'},followBtnText:{ fontFamily: "Inter_500Medium",color:v.darkGray,fontSize:12,fontWeight:"normal"},tabBar:{flexDirection:'row',backgroundColor:v.white,height:39,borderTopWidth:1,borderBottomWidth:1,borderColor:v.ink},tabItem:{flex:1,alignItems:'center',justifyContent:'center'},tabItemActive:{},grid:{flexDirection:'row',flexWrap:'wrap',gap:6,paddingHorizontal:10,paddingVertical:10},gridItem:{aspectRatio:.75,borderRadius:8,overflow:'hidden'},gridStateTitle:{ fontFamily: "Inter_500Medium",fontSize:18,color:'#101010',fontWeight:"normal"},gridStateText:{ fontFamily: "Inter_400Regular",fontSize:14,color:'#737373',textAlign:'center',padding:16}});
