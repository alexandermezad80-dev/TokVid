import {usePublicationGrid} from "../hooks/usePublicationGrid";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PublicationThumbnail from "../components/PublicationThumbnail";
import { usePublishedMedia } from "../hooks/usePublishedMedia";
export default function SearchScreen() {
  const gridLayout=usePublicationGrid();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const timer = setTimeout(() => setTerm(query), 300); return () => clearTimeout(timer); }, [query]);
  const publications = usePublishedMedia({ search: term });
  return <View onLayout={gridLayout.onLayout} style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Volver"><Feather name="arrow-left" color="#fff" size={23} /></Pressable><View style={styles.inputWrap}><Feather name="search" size={18} color="#9DC5CD" /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar fotos y videos…" placeholderTextColor="#9298A7" style={styles.input} autoCorrect={false} returnKeyType="search" accessibilityLabel="Buscar por descripción o hashtag" onSubmitEditing={() => setTerm(query)} />{!!query && <Pressable onPress={() => setQuery("")} accessibilityLabel="Limpiar búsqueda"><Feather name="x" color="#AAA" size={20} /></Pressable>}</View></View>
    <Text style={styles.title}>{term ? "Resultados" : "Publicaciones recientes"}</Text>
    <FlatList data={publications.items} keyExtractor={item => item.id} numColumns={3} contentContainerStyle={styles.grid} columnWrapperStyle={styles.row} keyboardShouldPersistTaps="handled" refreshing={publications.loading} onRefresh={() => void publications.refresh()} onEndReached={() => { if (publications.hasMore) void publications.loadMore(); }}
      renderItem={({item}) => <Pressable style={[styles.tile,gridLayout.tile]} accessibilityRole="button" accessibilityLabel={`Abrir publicación de ${item.creator}`} onPress={() => router.push({ pathname:"/publication", params:{ id:item.id } })}><PublicationThumbnail item={item} /><View style={styles.caption}><Text style={styles.creator} numberOfLines={1}>@{item.creator}</Text><Text style={styles.description} numberOfLines={2}>{item.caption}</Text></View></Pressable>}
      ListEmptyComponent={publications.loading ? <ActivityIndicator color="#99D4DE" style={{padding:40}} /> : <View style={styles.empty}><Text style={styles.description}>{publications.error || (term ? "No encontramos publicaciones con esa descripción o hashtag." : "Las primeras publicaciones aparecerán aquí.")}</Text>{!!publications.error && <Pressable onPress={() => void publications.refresh()}><Text style={styles.title}>Reintentar</Text></Pressable>}</View>}
    />
  </View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#0C0D13"},header:{flexDirection:"row",alignItems:"center",padding:12,gap:8},back:{width:40,height:44,justifyContent:"center",alignItems:"center"},inputWrap:{flex:1,flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#20222D",borderRadius:14,paddingHorizontal:12},input:{flex:1,minHeight:46,color:"#fff",fontSize:14},title:{color:"#E4E8F1",fontSize:16,fontWeight:"600",paddingHorizontal:16,paddingVertical:12},grid:{padding:10,gap:8},row:{gap:6},tile:{width:"32%",aspectRatio:0.65,borderRadius:10,overflow:"hidden",backgroundColor:"#202530"},caption:{position:"absolute",bottom:0,left:0,right:0,backgroundColor:"#080D15AA",padding:7},creator:{color:"#fff",fontSize:11,fontWeight:"600"},description:{color:"#CBD0DB",fontSize:12,lineHeight:17},empty:{padding:28}});
