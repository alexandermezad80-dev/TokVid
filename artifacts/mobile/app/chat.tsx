import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React,{useCallback,useEffect,useRef,useState} from "react";
import { ActivityIndicator,Alert,BackHandler,FlatList,Image,Keyboard,Pressable,StyleSheet,Text,TextInput,View,useWindowDimensions } from "react-native";
import { useAuth } from "../context/AuthContext";
import { requestRegistration } from "../lib/features/auth/services/registrationBridge";
import { usePrivateChat } from "../hooks/usePrivateChat";
import { useKeyboardSheetViewport } from "../hooks/useKeyboardSheetViewport";
import { supabase } from "../lib/supabase";
import Bubble,{type BubbleStyleVariant} from "../lib/features/messages/components/Bubble";
import MessageMenu,{type MessageMenuPage} from "../lib/features/messages/components/MessageMenu";
import { canRemoveForEveryone,type PrivateMessage } from "../lib/features/messages/model";
import { getBubbleStyleVariant,setBubbleStyleVariant } from "../lib/features/messages/services/bubble-preferences";
import { createCall,type CallType } from "../lib/features/calls/services/calls-service";
import LiveShareCard from "../lib/features/live/LiveShareCard";

type Anchor={x:number;y:number;width:number;height:number};
export default function ChatScreen(){
 const params=useLocalSearchParams<{conversationId:string}>();
 const conversationId=typeof params.conversationId==="string"?params.conversationId:"";
 const {user}=useAuth(); const chat=usePrivateChat(conversationId,user?.id);
 const [focused,setFocused]=useState(false);useFocusEffect(useCallback(()=>{setFocused(true);return()=>setFocused(false);},[]));
 const viewport=useKeyboardSheetViewport(focused);const {width}=useWindowDimensions();
 const [text,setText]=useState("");const textRef=useRef("");textRef.current=text;
 const [style,setStyle]=useState<BubbleStyleVariant>("classic"),[page,setPage]=useState<MessageMenuPage>("options");
 const [anchor,setAnchor]=useState<Anchor|null>(null),[target,setTarget]=useState<string|null>(null);
 const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState<Set<string>>(new Set());
 const [all,setAll]=useState<{before:string;total:number;own:number}|null>(null);
 const [busy,setBusy]=useState(false),[startingCall,setStartingCall]=useState<CallType|null>(null);
 const list=useRef<FlatList<PrivateMessage>>(null),rowRefs=useRef(new Map<string,View>()),toolbar=useRef<View>(null);
 const close=()=>{setAnchor(null);setTarget(null);setPage("options");};
 const clearSelection=()=>{setSelecting(false);setSelected(new Set());setAll(null);};
 useEffect(()=>{if(!user)requestRegistration();},[user]);
 useEffect(()=>{void getBubbleStyleVariant().then(setStyle);},[]);
 useEffect(()=>{setText("");clearSelection();close();},[conversationId,user?.id]);
 useEffect(()=>{if(!focused){close();clearSelection();}},[focused]);
 useEffect(()=>{if(!anchor&&!selecting)return;const event=BackHandler.addEventListener("hardwareBackPress",()=>{anchor?close():clearSelection();return true;});return()=>event.remove();},[!!anchor,selecting]);
 useEffect(()=>{setSelected(old=>new Set([...old].filter(id=>chat.messages.some(m=>m.id===id))));if(target&&!chat.messages.some(m=>m.id===target))close();},[chat.messages]);
 const lastId=chat.messages.at(-1)?.id;
 useEffect(()=>{if(lastId&&!selecting)requestAnimationFrame(()=>list.current?.scrollToEnd({animated:true}));},[lastId,viewport.keyboardInset]);
 const open=(id:string|null,menuPage:MessageMenuPage="options")=>{
   Keyboard.dismiss();const node=id?rowRefs.current.get(id):toolbar.current;
   node?.measureInWindow((x,y,w,h)=>{setTarget(id);setPage(menuPage);setAnchor({x,y:y-viewport.viewportTop,width:w,height:h});});
 };
 const chosen=target?chat.messages.filter(m=>m.id===target):chat.messages.filter(m=>selected.has(m.id));
 const count=all?.total??selected.size;
 const everyone=!!user&&(all?all.total>0&&all.own===all.total:canRemoveForEveryone(chosen,user.id));
 const startSelecting=()=>{setSelecting(true);setSelected(new Set(target?[target]:[]));setAll(null);close();};
 const toggle=(id:string)=>{if(all)return;setSelected(old=>{const next=new Set(old);next.has(id)?next.delete(id):next.add(id);return next;});};
 const selectAll=async()=>{
  setBusy(true);
  try{const {data,error}=await supabase.rpc("private_message_selection",{p_conversation_id:conversationId});if(error||!data)throw Error();setSelected(new Set());setAll(data as {before:string;total:number;own:number});}
  catch{Alert.alert("No se pudo seleccionar","Inténtalo de nuevo.");}finally{setBusy(false);}
 };
 const remove=(forAll:boolean)=>{
  const ids=target?[target]:[...selected],before=target?undefined:all?.before;
  Alert.alert(forAll?"Eliminar para todos":"Eliminar para mí",forAll?"Se quitarán tus mensajes seleccionados de ambos chats.":"Se quitarán los mensajes seleccionados solo de tu vista.",[
   {text:"Cancelar",style:"cancel"},{text:"Eliminar",style:"destructive",onPress:()=>{void(async()=>{setBusy(true);try{await chat.remove(ids,forAll,before);close();clearSelection();}catch(e){Alert.alert("No se pudo eliminar",e instanceof Error?e.message:"Inténtalo de nuevo.");}finally{setBusy(false);}})();}}
  ]);
 };
 const send=async()=>{const value=textRef.current;if(await chat.send(value)){if(textRef.current===value)setText("");}};
 const startCall=async(type:CallType)=>{if(!chat.other||startingCall)return;setStartingCall(type);try{const call=await createCall(conversationId,chat.other.id,type);router.push(`/call?callId=${encodeURIComponent(call.id)}&type=${call.type}`);}catch(e){Alert.alert("No se pudo iniciar la llamada",e instanceof Error?e.message:"Inténtalo de nuevo.");}finally{setStartingCall(null);}};
 const name=chat.other?.username??"Conversación";
 const renderMessage=({item,index}:{item:PrivateMessage;index:number})=>{
  const mine=item.sender_id===user?.id,isSelected=all?Date.parse(item.created_at)<=Date.parse(all.before):selected.has(item.id);
  const previous=chat.messages[index-1],next=chat.messages[index+1];
  const sameBefore=previous?.sender_id===item.sender_id,sameAfter=next?.sender_id===item.sender_id;
  const groupPosition=!sameBefore?(sameAfter?"first":"single"):(sameAfter?"middle":"last");
  const time=!previous||new Date(item.created_at).getTime()-new Date(previous.created_at).getTime()>300000;
  return <View ref={node=>{if(node)rowRefs.current.set(item.id,node);else rowRefs.current.delete(item.id);}} collapsable={false}>
   {time&&<Text style={styles.time}>{new Date(item.created_at).toLocaleString("es",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"})}</Text>}
   <View style={[styles.message,isSelected&&selecting&&styles.selected]}>
    {selecting&&<Pressable accessibilityRole="checkbox" accessibilityState={{checked:!!isSelected}} accessibilityLabel={`Seleccionar mensaje ${mine?"enviado":"recibido"}`} disabled={!!all} onPress={()=>toggle(item.id)} style={styles.check}><Feather name={isSelected?"check-circle":"circle"} color={isSelected?"#A1D6D9":"#6B7080"} size={21}/></Pressable>}
    <View style={{flex:1}}>{item.text.startsWith("[TOKVID_LIVE_SHARE]|")?<View><LiveShareCard roomId={item.text.split("|")[2]}/><Pressable onPress={()=>selecting?toggle(item.id):open(item.id)} style={styles.liveAction}><Text style={styles.link}>Opciones del mensaje</Text></Pressable></View>:<Bubble text={item.text} direction={mine?"sent":"received"} styleVariant={style} groupPosition={groupPosition} onPress={()=>selecting?toggle(item.id):open(item.id)} onLongPress={()=>{setSelecting(true);setSelected(new Set([item.id]));setAll(null);close();}}/>}</View>
   </View>
  </View>;
 };
 if(!user)return null;
 return <View ref={viewport.viewportRef} collapsable={false} onLayout={viewport.onLayout} style={[styles.screen,{paddingTop:viewport.insets.top,paddingBottom:viewport.keyboardInset}]}>
  <LinearGradient pointerEvents="none" colors={["#10161C","#12131B","#17121A"]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/>
  <LinearGradient colors={["rgba(0,242,254,0.055)","rgba(254,9,121,0.045)"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.header}>
   <Pressable style={styles.icon} onPress={()=>router.back()} accessibilityLabel="Volver"><Feather name="arrow-left" size={23} color="#EEE"/></Pressable>
   <Pressable style={styles.person} onPress={()=>chat.other&&router.push({pathname:"/user-profile",params:{userId:chat.other.id}})} accessibilityLabel={`Ver perfil de ${name}`}>
    {chat.other?.avatar_url?<Image source={{uri:chat.other.avatar_url}} style={styles.avatar}/>:<View style={[styles.avatar,styles.initial]}><Text style={styles.name}>{name[0]?.toUpperCase()}</Text></View>}
    <Text style={styles.name} numberOfLines={1}>@{name}</Text>
   </Pressable>
   <Pressable style={styles.icon} onPress={()=>void startCall("voice")} disabled={!!startingCall||!chat.other} accessibilityLabel="Llamada de voz"><Feather name="phone" size={19} color="#DDD"/></Pressable>
   <Pressable style={styles.icon} onPress={()=>void startCall("video")} disabled={!!startingCall||!chat.other} accessibilityLabel="Videollamada"><Feather name="video" size={19} color="#DDD"/></Pressable>
   <Pressable style={styles.icon} onPress={()=>router.push(`/call-history?conversationId=${encodeURIComponent(conversationId)}`)} accessibilityLabel="Historial de llamadas"><Feather name="clock" size={19} color="#A9AEBB"/></Pressable>
   <View ref={toolbar} collapsable={false}><Pressable style={styles.icon} onPress={()=>open(null)} accessibilityLabel="Opciones del chat"><Feather name="sliders" size={19} color="#DDD"/></Pressable></View>
  </LinearGradient>
  {selecting&&<View style={styles.selectionBar}><Pressable onPress={clearSelection} style={styles.icon} accessibilityLabel="Cancelar selección"><Feather name="x" color="#EEE" size={21}/></Pressable><Text style={styles.selectionCount}>{count} seleccionados</Text><Pressable onPress={()=>void selectAll()} disabled={busy} style={styles.allButton}><Text style={styles.link}>Seleccionar todos</Text></Pressable></View>}
  {!!chat.error&&<Pressable onPress={()=>void chat.refresh()} style={styles.error}><Text style={styles.errorText}>{chat.error}</Text></Pressable>}
  {chat.loading&&!chat.messages.length?<View style={styles.empty}><ActivityIndicator color="#A3D4D6"/></View>:<FlatList ref={list} data={chat.messages} renderItem={renderMessage} keyExtractor={item=>item.id} style={{flex:1}} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" onScrollBeginDrag={close}
   ListHeaderComponent={chat.hasOlder?<Pressable onPress={()=>void chat.loadOlder()} style={styles.allButton}><Text style={[styles.link,{textAlign:"center"}]}>{chat.loading?"Cargando…":"Ver mensajes anteriores"}</Text></Pressable>:null}
   ListEmptyComponent={!chat.error?<View style={styles.empty}><Text style={styles.emptyText}>Comienza la conversación</Text></View>:null}
  />}
  {selecting?<View style={[styles.inputRow,{paddingBottom:Math.max(viewport.insets.bottom,12)}]}><Pressable disabled={!count||busy} onPress={()=>open(null,"delete")} style={[styles.deleteBar,(!count||busy)&&{opacity:0.4}]}><Feather name="trash-2" color="#E9A0B3" size={20}/><Text style={styles.deleteText}>Eliminar ({count})</Text></Pressable></View>:<View style={[styles.inputRow,{paddingBottom:viewport.keyboardVisible?10:Math.max(viewport.insets.bottom,10)}]}>
   <TextInput value={text} onChangeText={setText} style={styles.input} placeholder="Escribe un mensaje…" placeholderTextColor="#949AA9" selectionColor="#A6D8DC" multiline maxLength={1000} accessibilityLabel="Escribe un mensaje"/>
   <Pressable onPress={()=>void send()} disabled={!text.trim()||chat.sending||!chat.other} style={[styles.send,(!text.trim()||chat.sending||!chat.other)&&{opacity:0.4}]} accessibilityLabel="Enviar mensaje">{chat.sending?<ActivityIndicator color="#E9EFF3"/>:<Feather name="send" size={20} color="#E9EFF3"/>}</Pressable>
  </View>}
  {anchor&&<MessageMenu anchor={anchor} width={width} height={viewport.availableHeight} safeTop={viewport.insets.top} page={page} onPage={setPage} onClose={close} variant={style} onVariant={variant=>{setStyle(variant);void setBubbleStyleVariant(variant).catch(()=>Alert.alert("No se guardó el estilo","Puedes volver a seleccionarlo."));close();}} onSelect={startSelecting} onDelete={remove} canDelete={!!target||count>0} forEveryone={everyone} busy={busy}/>}
 </View>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#12141A"},header:{flexDirection:"row",alignItems:"center",paddingHorizontal:6,paddingVertical:8,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"#FFFFFF14"},icon:{width:36,height:44,alignItems:"center",justifyContent:"center"},person:{flex:1,flexDirection:"row",alignItems:"center",gap:8,overflow:"hidden"},avatar:{width:32,height:32,borderRadius:16},initial:{backgroundColor:"#30323D",alignItems:"center",justifyContent:"center"},name:{flexShrink:1,color:"#ECEFF5",fontSize:14,fontWeight:"600"},messages:{paddingHorizontal:12,paddingVertical:12,flexGrow:1},message:{flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"transparent",borderRadius:14,padding:2},selected:{borderColor:"#8CCAD53B",backgroundColor:"#83CDD30A"},check:{width:36,minHeight:48,alignItems:"center",justifyContent:"center"},time:{color:"#9BA0AE",fontSize:11,textAlign:"center",marginVertical:12},inputRow:{paddingTop:10,paddingHorizontal:12,flexDirection:"row",alignItems:"flex-end",gap:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"#FFFFFF12",backgroundColor:"#12151DEE"},input:{flex:1,minHeight:46,maxHeight:120,paddingHorizontal:16,paddingVertical:12,borderRadius:22,backgroundColor:"#232630",color:"#F3F3F8",fontSize:15,lineHeight:21},send:{width:46,height:46,borderRadius:23,backgroundColor:"#345A65",alignItems:"center",justifyContent:"center"},empty:{flex:1,minHeight:200,alignItems:"center",justifyContent:"center"},emptyText:{color:"#AAB0BD",fontSize:15},selectionBar:{flexDirection:"row",alignItems:"center",paddingHorizontal:8,backgroundColor:"#20242D"},selectionCount:{flex:1,color:"#E3E6ED",fontSize:14},allButton:{minHeight:48,justifyContent:"center",paddingHorizontal:10},link:{color:"#A2CFD5",fontSize:13},deleteBar:{flex:1,minHeight:48,borderWidth:StyleSheet.hairlineWidth,borderColor:"#EBA1B42E",borderRadius:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10},deleteText:{color:"#E9A0B3",fontSize:15,fontWeight:"600"},error:{padding:12,backgroundColor:"#392530"},errorText:{color:"#EFBDC9",fontSize:13,lineHeight:18},liveAction:{alignItems:"center",padding:8}});
