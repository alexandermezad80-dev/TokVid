import React, {useCallback, useRef, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {router, useFocusEffect, useLocalSearchParams} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ReferenceHeader from '../components/reference/ReferenceHeader';
import {useFollow} from '../context/FollowContext';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';
import {connectionLabel, connectionTabs, readProfileFriends, type ConnectionKind, type ConnectionPerson} from '../lib/features/profile/connections';

export default function ProfileConnections() {
  const {userId, kind: initial} = useLocalSearchParams<{userId: string; kind?: string}>();
  const {user} = useAuth(), follow = useFollow(), insets = useSafeAreaInsets();
  const [kind, setKind] = useState<ConnectionKind>(initial === 'following' || initial === 'followers' ? initial : 'friends');
  const [rows, setRows] = useState<ConnectionPerson[]>([]);
  const [more, setMore] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(60), [retry, setRetry] = useState(0);
  const generation = useRef(0), nextOffset = useRef(0), pending = useRef(false);

  const readPage = useCallback(async (tab: 'followers' | 'following', offset: number) => {
    const {data, error} = await supabase.rpc('profile_connections', {p_user: userId, p_kind: tab, p_offset: offset});
    if (error) throw error;
    return (data ?? []) as ConnectionPerson[];
  }, [userId]);

  useFocusEffect(useCallback(() => {
    const request = ++generation.current;
    const active = () => generation.current === request;
    setRows([]); setVisibleCount(60); setMore(false); setError(''); setLoading(true);
    nextOffset.current = 0; pending.current = true;
    void (async () => {
      try {
        const page = kind === 'friends'
          ? await readProfileFriends(userId, readPage, active)
          : await readPage(kind, 0);
        if (!active()) return;
        setRows(page); setMore(kind !== 'friends' && page.length === 60);
        nextOffset.current = page.length;
      } catch {
        if (active()) setError('No se pudieron cargar las relaciones.');
      } finally {
        if (active()) {setLoading(false); pending.current = false;}
      }
    })();
    return () => {++generation.current;};
  }, [userId, kind, readPage, follow.revision, retry]));

  const loadMore = async () => {
    if (kind === 'friends') {setVisibleCount(count => count + 60); return;}
    if (pending.current || !more) return;
    const request = generation.current;
    pending.current = true; setLoading(true); setError('');
    try {
      const page = await readPage(kind, nextOffset.current);
      if (generation.current !== request) return;
      nextOffset.current += page.length;
      setRows(old => [...old, ...page.filter(person => !old.some(existing => existing.id === person.id))]);
      setMore(page.length === 60);
    } catch {
      if (generation.current === request) setError('No se pudieron cargar las relaciones.');
    } finally {
      if (generation.current === request) {setLoading(false); pending.current = false;}
    }
  };

  return <View style={{flex: 1, backgroundColor: '#FFF', paddingBottom: insets.bottom}}>
    <ReferenceHeader title="Amigos y seguidores" left={<Pressable style={s.back} accessibilityLabel="Volver" onPress={() => router.back()}><Feather name="arrow-left" size={24} color="#FFF"/></Pressable>}/>
    <View style={s.tabs}>{connectionTabs.map(tab => <Pressable style={s.tab} key={tab.key} accessibilityRole="tab" accessibilityState={{selected: kind === tab.key}} onPress={() => setKind(tab.key)}>
      <Feather name={tab.icon} size={16} color={kind === tab.key ? '#101010' : '#6B6B75'}/>
      <Text style={[s.tabText, {color: kind === tab.key ? '#101010' : '#6B6B75'}]}>{tab.label}</Text>
    </Pressable>)}</View>
    <ScrollView>{(kind === 'friends' ? rows.slice(0, visibleCount) : rows).map(person => <View style={s.row} key={person.id}>
      <Pressable style={s.person} onPress={() => router.push({pathname: '/user-profile', params: {userId: person.id}})}>
        {person.avatar_url ? <Image source={{uri: person.avatar_url}} style={s.avatar}/> : <View style={[s.avatar, {backgroundColor: '#E6E9EC', alignItems: 'center', justifyContent: 'center'}]}><Feather name="user" size={24} color="#737373"/></View>}
        <Text style={s.name} numberOfLines={1}>@{person.username}</Text>
      </Pressable>
      {user?.id !== person.id && <Pressable disabled={follow.loadingIds.has(person.id)} style={s.follow} accessibilityLabel={`${follow.isFollowing(person.id) ? 'Dejar de seguir a' : 'Seguir a'} ${person.username}`} onPress={() => void follow.toggleFollow(person.id)}>
        <Text style={{ fontFamily: "Inter_400Regular",color: '#FFF', fontSize: 13}}>{connectionLabel(kind)}</Text>
      </Pressable>}
    </View>)}
    {!!error && <View><Text style={s.empty}>{error}</Text><Pressable onPress={() => setRetry(n => n + 1)}><Text style={s.empty}>Reintentar</Text></Pressable></View>}
    {loading ? <ActivityIndicator style={{margin: 24}}/> : !rows.length && !error ? <Text style={s.empty}>No hay usuarios en esta lista.</Text> : null}
    {(kind === 'friends' ? rows.length > visibleCount : more) && !loading && <Pressable onPress={() => void loadMore()}><Text style={s.empty}>Ver más</Text></Pressable>}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  back: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  tabs: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E5E5'},
  tab: {flex: 1, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5},
  tabText: { fontFamily: "Inter_500Medium",fontSize: 12, fontWeight: "normal"},
  row: {minHeight: 80, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12},
  person: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12},
  avatar: {width: 48, height: 48, borderRadius: 24},
  name: { fontFamily: "Inter_500Medium",flex: 1, color: '#101010', fontWeight: "normal", fontSize: 15},
  follow: {backgroundColor: '#161616', paddingHorizontal: 14, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8},
  empty: {color: '#737373', textAlign: 'center', padding: 24},
});
