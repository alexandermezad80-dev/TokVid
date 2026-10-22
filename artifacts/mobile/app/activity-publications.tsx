import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ReferenceHeader from '../components/reference/ReferenceHeader';
import PublicationThumbnail from '../components/PublicationThumbnail';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';
import {mapRowsToVideoItems,type VideoItem} from '../hooks/useVideoFeed';
import {activityPublication,activityHasGallery} from '../lib/features/messages/activity';
import {openActivity} from '../components/ActivityBanner';
import type {AppNotification} from '../context/NotificationsContext';
type Tile={video:VideoItem;notification:AppNotification};
export default function ActivityPublications(){
 const {actorId,type}=useLocalSearchParams<{actorId:string;type:string}>(),{user}=useAuth(),{width}=useWindowDimensions(),insets=useSafeAreaInsets();
 const [tiles,setTiles]=useState<Tile[]>([]),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[name,setName]=useState('Actividad');
 useEffect(()=>{setTiles([]);setOffset(0);},[user?.id,actorId,type]);
 useEffect(()=>{let active=true;if(!user||!activityHasGallery({type,actor_id:actorId,data:{},read:true}))return;setLoading(true);
 void(async()=>{try{const events=await supabase.from('notifications').select('*').eq('user_id',user.id).eq('actor_id',actorId).eq('type',type).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+59);if(events.error)throw events.error;
 const notifications=(events.data??[]) as AppNotification[],byVideo=new Map<string,AppNotification>();for(const n of notifications){const id=activityPublication(n).videoId;if(id&&/^[0-9a-f-]{36}$/i.test(id)&&!byVideo.has(id))byVideo.set(id,n);}
 const result=byVideo.size?await supabase.from('videos').select('*').in('id',[...byVideo.keys()]):{data:[],error:null};if(result.error)throw result.error;
 const videos=await mapRowsToVideoItems(result.data??[]);const page:Tile[]=[];for(const [id,notification] of byVideo){const video=videos.find(v=>v.id===id);if(video)page.push({video,notification});}
 if(active){setTiles(old=>offset?[...old,...page.filter(t=>!old.some(o=>o.video.id===t.video.id))]:page);setMore(notifications.length===60);setName(notifications[0]?.actor_name??'Actividad');setError('');}
 }catch{if(active)setError('No se pudieron cargar estas publicaciones.');}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[user?.id,actorId,type,offset]);
 return <View style={{flex:1,backgroundColor:'#FFF',paddingBottom:insets.bottom}}><ReferenceHeader compact title="Actividad" left={<Pressable style={s.back} onPress={()=>router.back()} accessibilityLabel="Volver"><Feather name="arrow-left" color="#0B0B0D" size={24}/></Pressable>}/><Text style={s.name}>{name}</Text><ScrollView><View style={s.grid}>{tiles.map(t=><Pressable key={t.video.id} style={{width:(width-44)/3,aspectRatio:3/4,borderRadius:8,overflow:'hidden'}} accessibilityLabel={`Abrir actividad: ${t.video.caption||'Publicación'}`} onPress={()=>openActivity(t.notification)}><PublicationThumbnail item={t.video}/></Pressable>)}</View>{loading?<ActivityIndicator style={{margin:24}}/>:!tiles.length?<Text style={s.note}>{error||'No hay publicaciones disponibles para esta actividad.'}</Text>:error?<Text style={s.note}>{error}</Text>:null}{more&&!loading&&<Pressable onPress={()=>setOffset(n=>n+60)}><Text style={s.note}>Ver más</Text></Pressable>}</ScrollView></View>;
}
const s=StyleSheet.create({back:{width:44,height:38,alignItems:'center',justifyContent:'center'},name:{ fontFamily: "Inter_500Medium",padding:16,fontSize:17,fontWeight:"normal",color:'#101010'},grid:{flexDirection:'row',flexWrap:'wrap',gap:6,paddingHorizontal:16},note:{ fontFamily: "Inter_400Regular",padding:24,textAlign:'center',fontSize:14,color:'#737373'}});
