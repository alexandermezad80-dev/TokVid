import HeaderSurface from '../../components/reference/HeaderSurface';
import {palette} from '../../constants/palette';
import {useMyConnections} from "../../hooks/useMyConnections";
import {openPrivateConversation} from "../../lib/features/messages/services/private-messages";
import { requestRegistration } from "../../lib/features/auth/services/registrationBridge";
import {LinearGradient} from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useFollow } from "../../context/FollowContext";
import { supabase } from "../../lib/supabase";

type FriendTab = "friends" | "followers" | "following";

interface Person {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  likes_count: number;
}

function fmtCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function getAvatar(person: Pick<Person, "id" | "username" | "avatar_url">) {
  if (person.avatar_url) return person.avatar_url;
  return `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(
    person.username || person.id
  )}&backgroundColor=FE0979&textColor=ffffff&size=128`;
}

function FollowAction({ person }: { person: Person }) {
  const { isFollowing, toggleFollow, loadingIds } = useFollow();
  const following = isFollowing(person.id);
  const loading = loadingIds.has(person.id);

  return (
    <TouchableOpacity
      style={styles.followButton}
      onPress={() => toggleFollow(person.id)}
      disabled={loading}
      activeOpacity={0.8}
    >
      <LinearGradient pointerEvents="none" colors={["#25989D","#BA6B92"]} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:16}]}/><View pointerEvents="none" style={[StyleSheet.absoluteFill,{margin:1,borderRadius:15,backgroundColor:palette.button}]}/>
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <>
          <Feather
            name={following ? "check" : "user-plus"}
            size={14}
            color="#FFF"
          />
          <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
            {following ? "Siguiendo" : "Seguir"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function ProfileModal({
  person,
  visible,
  onClose,
}: {
  person: Person | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messageLoading, setMessageLoading] = useState(false);

  const openMessage = async () => {
    if (!user || !person) return;
    setMessageLoading(true);
    let conversationId:string;
    try{conversationId=await openPrivateConversation(person.id);}catch(e){Alert.alert("No se pudo abrir el chat",e instanceof Error?e.message:"Inténtalo de nuevo.");return;}finally{setMessageLoading(false);}
    onClose();
    router.push(
      `/chat?conversationId=${conversationId}&otherUserId=${person.id}&otherUsername=${encodeURIComponent(
        person.username
      )}&otherAvatar=${encodeURIComponent(person.avatar_url ?? "")}`
    );
  };

  if (!person) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View
          style={[
            styles.profileModal,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <Image source={{ uri: getAvatar(person) }} style={styles.modalAvatar} />
          <Text style={styles.modalName}>{person.username}</Text>
          <Text style={styles.modalHandleText}>@{person.username}</Text>

          <View style={styles.modalStats}>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatValue}>{fmtCount(person.followers_count)}</Text>
              <Text style={styles.modalStatLabel}>Seguidores</Text>
            </View>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatValue}>{fmtCount(person.following_count)}</Text>
              <Text style={styles.modalStatLabel}>Siguiendo</Text>
            </View>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatValue}>{fmtCount(person.likes_count)}</Text>
              <Text style={styles.modalStatLabel}>Me gusta</Text>
            </View>
          </View>

          {person.bio ? <Text style={styles.modalBio}>{person.bio}</Text> : null}

          <View style={styles.modalActions}>
            <View style={styles.modalFollowWrap}>
              <FollowAction person={person} />
            </View>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={openMessage}
              disabled={messageLoading}
            >
              {messageLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="message-circle" size={16} color="#fff" />
                  <Text style={styles.messageButtonText}>Mensaje</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function FriendsScreen() {
  const params=useLocalSearchParams<{tab?:string}>();
  const connections=useMyConnections();
  const [error,setError]=useState<string|null>(null);
  const [retry,setRetry]=useState(0);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<FriendTab>("friends");
  useEffect(()=>{if(params.tab==="friends"||params.tab==="followers"||params.tab==="following"){setTab(params.tab);setSearch("");}},[params.tab]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const idsKey=JSON.stringify(connections[tab]);
  useFocusEffect(useCallback(()=>{
    let active=true;
    if(!user){requestRegistration();setPeople([]);setLoading(false);return;}
    setLoading(true);setError(null);
    void(async()=>{
      try{const ids=JSON.parse(idsKey) as string[],rows:Person[]=[];
        for(let start=0;start<ids.length;start+=200){
          const {data,error}=await supabase.from("profiles").select("id,username,avatar_url,bio,followers_count,following_count,likes_count").in("id",ids.slice(start,start+200));
          if(error)throw error;rows.push(...(data??[]) as Person[]);
        }
        if(active)setPeople(rows.sort((a,b)=>a.username.localeCompare(b.username)));
      }catch{if(active)setError("No se pudo cargar la lista. Vuelve a intentarlo.");}
      finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[user?.id,idsKey,retry]));

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^@/, "");
    if (!term) return people;
    return people.filter((person) => person.username.toLowerCase().includes(term));
  }, [people, search]);

  const tabs: { key: FriendTab; label: string; icon: "users" | "user-plus" | "user-check" }[] = [
    { key: "friends", label: "Amigos", icon: "users" },
    { key: "followers", label: "Seguidores", icon: "user-plus" },
    { key: "following", label: "Siguiendo", icon: "user-check" },
  ];

  return (
    <View style={styles.container}>
      <HeaderSurface safeTop style={[styles.header, { height:insets.top+52 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{tab==="friends"?"Amigos":tab==="followers"?"Seguidores":"Siguiendo"}</Text>
          <Text style={styles.headerSubtitle}>{tab==="friends"?"Se siguen mutuamente":tab==="followers"?"Personas que te siguen":"Personas a las que sigues"}</Text>
        </View>
        <View style={styles.headerButton} />
      </HeaderSurface>

      <View style={styles.tabs}>
        {tabs.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.tab, tab === item.key && styles.tabActive]}
            onPress={() => {
              setTab(item.key);
              setSearch("");
            }}
          >
            <Feather
              name={item.icon}
              size={16}
              color={tab === item.key ? "#fff" : "#8A8B97"}
            />
            <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={18} color="#8A8B97" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Buscar ${tab === "friends" ? "amigos" : tab === "followers" ? "seguidores" : "siguiendo"}`}
          placeholderTextColor={palette.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x-circle" size={18} color="#8A8B97" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{flexGrow:1,paddingBottom:insets.bottom+90}}>
        {error||connections.error ? <View style={styles.empty}><Text style={styles.emptyText}>{error||connections.error}</Text><TouchableOpacity onPress={()=>{setRetry(n=>n+1);void connections.refresh();}} style={{padding:16}}><Text style={{color:palette.teal}}>Reintentar</Text></TouchableOpacity></View> : loading||connections.loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FE0979" />
            <Text style={styles.centerText}>Cargando...</Text>
          </View>
        ) : filteredPeople.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name={tab === "friends" ? "users" : "user"} size={30} color={palette.teal} />
            </View>
            <Text style={styles.emptyTitle}>
              {search
                ? "No encontramos resultados"
                : tab === "friends"
                ? "Todavía no tienes amigos"
                : tab === "followers"
                ? "Todavía no tienes seguidores"
                : "Todavía no sigues a nadie"}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? "Prueba con otro nombre de usuario."
                : "Cuando haya relaciones, aparecerán aquí automáticamente."}
            </Text>
          </View>
        ) : (
          filteredPeople.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.personRow}
              onPress={() => router.push({pathname:"/user-profile",params:{userId:person.id}})}
              activeOpacity={0.8}
            >
              <Image source={{ uri: getAvatar(person) }} style={styles.avatar} />
              <View style={styles.personInfo}>
                <Text maxFontSizeMultiplier={1.2} style={styles.username} numberOfLines={1}>
                  {person.username}
                </Text>
                <Text maxFontSizeMultiplier={1.2} style={styles.secondaryText} numberOfLines={1}>
                  @{person.username}
                </Text>
              </View>
              <FollowAction person={person} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <ProfileModal
        person={selectedPerson}
        visible={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: { color: palette.headerText, fontSize: 21, fontWeight: "800" },
  headerSubtitle: { color: palette.headerSecondary, fontSize: 11, marginTop: 2 },
  tabs: {
    flexDirection: "row",
    marginHorizontal:16,marginVertical:12,
    height:44,padding:0,
    borderRadius: 12,
    backgroundColor: palette.tabs,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  tabActive: { backgroundColor: palette.button },
  tabText: { color: palette.tabInactive, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: palette.headerText },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 13,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.input,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontSize: 14,
    marginLeft: 9,
    paddingVertical: 0,
  },
  list: { flex: 1, paddingHorizontal: 16 },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight:64,paddingVertical:10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.input,
    borderWidth: 1,
    borderColor: palette.border,
  },
  personInfo: { flex: 1, marginHorizontal: 12, minWidth: 0 },
  username: { color: palette.text, fontSize: 15, fontWeight: "700" },
  secondaryText: { color: palette.secondary, fontSize: 12.5, marginTop: 3 },
  followButton: {
    minWidth: 96,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: palette.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  followingButton: {
    backgroundColor: palette.button,
    borderWidth: 1,
    borderColor: "#FE0979",
  },
  followButtonText: { color: palette.onButton, fontSize: 12, fontWeight: "800" },
  followingButtonText: { color: palette.onButton },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerText: { color: palette.secondary, fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 35, gap: 10 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.selected,
    borderWidth: 1,
    borderColor: palette.selectedBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { color: palette.text, fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyText: { color: palette.secondary, fontSize: 13, textAlign: "center", lineHeight: 19 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  profileModal: {
    backgroundColor: palette.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 18,
    paddingTop: 8,
    alignItems: "center",
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#8A8B97",
    opacity: 0.55,
    marginBottom: 4,
  },
  modalHeader: {
    width: "100%",
    height: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeButton: {
    width: 36,
    height: 32,
    borderRadius: 18,
    backgroundColor: palette.button,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: palette.magenta,
    backgroundColor: palette.input,
    marginTop: 2,
  },
  modalName: { color: palette.text, fontSize: 20, fontWeight: "800", marginTop: 10 },
  modalHandleText: { color: palette.secondary, fontSize: 13, marginTop: 2 },
  modalStats: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 18,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  modalStat: { alignItems: "center", minWidth: 80 },
  modalStatValue: { color: palette.text, fontSize: 17, fontWeight: "800" },
  modalStatLabel: { color: palette.secondary, fontSize: 11, marginTop: 2 },
  modalBio: { color: palette.text, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 12 },
  modalActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalFollowWrap: { flex: 1 },
  messageButton: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    backgroundColor: palette.button,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  messageButtonText: { color: palette.onButton, fontSize: 13, fontWeight: "800" },
});

