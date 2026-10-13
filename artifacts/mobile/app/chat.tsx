import {Feather} from "@expo/vector-icons";
import {LinearGradient} from "expo-linear-gradient";
import {router,useLocalSearchParams,useFocusEffect} from "expo-router";
import React,{useCallback,useEffect,useRef,useState} from "react";
import {ActivityIndicator,Alert,BackHandler,FlatList,Image,Keyboard,Pressable,StyleSheet,Text,TextInput,View,useWindowDimensions,useColorScheme} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useOverlayKeyboard} from "../hooks/useOverlayKeyboard";
import {CHAT_WALLPAPERS,readChatWallpaper,chatPalette} from "../lib/features/messages/chatWallpapers";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import {RecordingPresets,requestRecordingPermissionsAsync,setAudioModeAsync,useAudioRecorder,useAudioRecorderState} from "expo-audio";
import {useAuth} from "../context/AuthContext";
import {usePrivateChat} from "../hooks/usePrivateChat";
import {supabase} from "../lib/supabase";
import {createDatabaseChannel} from "../lib/realtimeSubscriptions";
import Bubble from "../lib/features/messages/components/Bubble";
import MessageMenu,{type MessageMenuPage,type MessageAction} from "../lib/features/messages/components/MessageMenu";
import ChatMedia from "../lib/features/messages/components/ChatMedia";
import type {PrivateMessage} from "../lib/features/messages/model";
import {CHAT_BACKGROUNDS,DEFAULT_CHAT_PREFERENCES,readChatPreferences,saveChatPreferences,readChatTools,reactToMessage,pinMessage,hideOwnMessages,cancelUnreadMessage,type ChatPreferences,type MessageDetail,type Reaction,type Attachment} from "../lib/features/messages/services/chat-tools";
import {uploadChatMedia,type LocalChatMedia} from "../lib/features/messages/services/chat-media";
import {createCall} from "../lib/features/calls/services/calls-service";
import LiveShareCard from "../lib/features/live/LiveShareCard";

type Anchor={x:number;y:number;width:number;height:number};
export default function ChatScreen(){
 const params=useLocalSearchParams<{conversationId:string;messageId?:string}>();
 const conversationId=typeof params.conversationId==="string"?params.conversationId:"";
 const {user}=useAuth(),chat=usePrivateChat(conversationId,user?.id),insets=useSafeAreaInsets(),window=useWindowDimensions();
 const dark=useColorScheme()!=="light",colors=chatPalette(dark);
 const styles={...baseStyles,screen:[baseStyles.screen,{backgroundColor:colors.background}],header:[baseStyles.header,{backgroundColor:colors.background+"F2"}],name:[baseStyles.name,{color:colors.text}],white:[baseStyles.white,{color:colors.text}],composer:[baseStyles.composer,{backgroundColor:colors.background+"F2"}],field:[baseStyles.field,{backgroundColor:dark?"#25353F":"#E5EFEE"}],input:[baseStyles.input,{color:colors.text}],quote:[baseStyles.quote,{backgroundColor:colors.card}],notice:[baseStyles.notice,{backgroundColor:colors.card}],meta:[baseStyles.meta,{color:colors.secondary}],time:[baseStyles.time,{color:colors.secondary}],reaction:[baseStyles.reaction,{backgroundColor:colors.card}]};
 const [focused,setFocused]=useState(false),[text,setText]=useState(""),[prefs,setPrefs]=useState<ChatPreferences>(DEFAULT_CHAT_PREFERENCES);
 const keyboardLayout=useOverlayKeyboard(focused);
 const [wallpaper,setWallpaper]=useState("none");
 useFocusEffect(useCallback(()=>{let active=true;if(user)void readChatWallpaper(user.id,conversationId).then(id=>{if(active)setWallpaper(id);});return()=>{active=false;};},[user?.id,conversationId]));
 const [composerHeight,setComposerHeight]=useState(70);
 const [anchor,setAnchor]=useState<Anchor|null>(null),[target,setTarget]=useState<string|null>(null),[page,setPage]=useState<MessageMenuPage>("options");
 const [reply,setReply]=useState<PrivateMessage|null>(null),[busy,setBusy]=useState(false),[keyboard,setKeyboard]=useState(false);
 const [ownSelection,setOwnSelection]=useState<{before:string;count:number}|null>(null);
 const [media,setMedia]=useState<LocalChatMedia|null>(null),uploaded=useRef<Attachment|null>(null);
 const [details,setDetails]=useState<MessageDetail[]>([]),[reactions,setReactions]=useState<Reaction[]>([]),[pins,setPins]=useState<string[]>([]);
 const [emojiTarget,setEmojiTarget]=useState<string|null>(null),[emoji,setEmoji]=useState("");
 const [viewport,setViewport]=useState({top:0,height:window.height});
 const root=useRef<View>(null),list=useRef<FlatList<PrivateMessage>>(null),input=useRef<TextInput>(null),rowRefs=useRef(new Map<string,View>());
 const layoutTail=useRef<string|null>(null);
 const atBottom=useRef(true),initialScroll=useRef(true),textRef=useRef(text),operation=useRef(false);textRef.current=text;
 const recorder=useAudioRecorder(RecordingPresets.HIGH_QUALITY),recording=useAudioRecorderState(recorder);
 const close=()=>{setAnchor(null);setTarget(null);setPage("options");};
 const showError=(e:unknown)=>Alert.alert("No se pudo completar",e instanceof Error?e.message:"Inténtalo de nuevo.");
 const perform=async(action:()=>Promise<void>)=>{if(operation.current)return;operation.current=true;setBusy(true);try{await action();}catch(e){showError(e);}finally{operation.current=false;setBusy(false);}};
 useFocusEffect(useCallback(()=>{let active=true;setFocused(true);if(user)void readChatPreferences(user.id,conversationId).then(p=>{if(active)setPrefs(p);}).catch(showError);return()=>{active=false;setFocused(false);};},[conversationId,user?.id]));
 useEffect(()=>{setText("");setReply(null);setMedia(null);uploaded.current=null;setOwnSelection(null);close();layoutTail.current=null;atBottom.current=true;initialScroll.current=true;},[conversationId,user?.id]);
 useEffect(()=>{const show=Keyboard.addListener("keyboardDidShow",()=>setKeyboard(true)),hide=Keyboard.addListener("keyboardDidHide",()=>setKeyboard(false));return()=>{show.remove();hide.remove();};},[]);
 useEffect(()=>{if(!focused){close();if(recording.isRecording)void recorder.stop().then(()=>setAudioModeAsync({allowsRecording:false}));}},[focused]);
 useEffect(()=>{if(!anchor&&!ownSelection&&!emojiTarget)return;const listener=BackHandler.addEventListener("hardwareBackPress",()=>{if(anchor)close();else if(emojiTarget)setEmojiTarget(null);else setOwnSelection(null);return true;});return()=>listener.remove();},[!!anchor,!!ownSelection,emojiTarget]);
 const toolsGeneration=useRef(0);
 const refreshTools=useCallback(async()=>{const seq=++toolsGeneration.current;const data=await readChatTools(chat.messages.map(m=>m.id));if(seq!==toolsGeneration.current)return;setDetails(data.details);setReactions(data.reactions);setPins(data.pins);},[chat.messages]);
 useEffect(()=>{if(!focused)return;void refreshTools().catch(()=>{});const timer=setInterval(()=>void refreshTools().catch(()=>{}),4000);return()=>{clearInterval(timer);++toolsGeneration.current;};},[refreshTools,focused]);
 useEffect(()=>{if(!focused||!user)return;const channel=createDatabaseChannel(`chat-tools:${conversationId}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"message_reactions"},()=>void refreshTools().catch(()=>{})).on("postgres_changes",{event:"UPDATE",schema:"public",table:"message_reactions"},()=>void refreshTools().catch(()=>{})).subscribe();return()=>{void supabase.removeChannel(channel);};},[focused,conversationId,refreshTools,user?.id]);
 useEffect(()=>{if(target&&!chat.messages.some(m=>m.id===target))close();if(reply&&!chat.messages.some(m=>m.id===reply.id))setReply(null);},[chat.messages]);
 const jump=(id:string)=>{const index=chat.messages.findIndex(m=>m.id===id);if(index>=0){atBottom.current=false;list.current?.scrollToIndex({index,animated:true,viewPosition:0.5});}else if(chat.hasOlder&&!chat.loading)void chat.loadOlder();};
 useEffect(()=>{if(params.messageId&&chat.messages.length)jump(params.messageId);},[params.messageId,chat.messages.length]);
 const open=(id:string)=>{const node=rowRefs.current.get(id);node?.measureInWindow((x,y,width,height)=>{setTarget(id);setPage("options");setAnchor({x,y:y-viewport.top,width,height});});};
 const selected=chat.messages.find(m=>m.id===target);
 const remove=(forAll:boolean)=>{if(!selected)return;const id=selected.id;Alert.alert(forAll?"Eliminar para todos":"Eliminar para mí",forAll?"Este mensaje tuyo se quitará de ambos chats.":"Este mensaje se ocultará solo de tu vista.",[{text:"Cancelar",style:"cancel"},{text:"Eliminar",onPress:()=>void perform(async()=>{await chat.remove([id],forAll);close();})}]);};
 const react=async(value:string,id=target)=>{if(!id||!user)return;await perform(async()=>{await reactToMessage(id,user.id,value,reactions.some(r=>r.message_id===id&&r.user_id===user.id&&r.emoji===value));await refreshTools();setEmojiTarget(null);setEmoji("");close();});};
 const action=(kind:MessageAction)=>{if(!selected||!user)return;const msg=selected;
  if(kind==="reply"){setReply(msg);close();requestAnimationFrame(()=>input.current?.focus());}
  else if(kind==="copy")void perform(async()=>{await Clipboard.setStringAsync(msg.text);close();});
  else if(kind==="pin")void perform(async()=>{await pinMessage(msg.id,user.id,pins.includes(msg.id));await refreshTools();close();});
  else if(kind==="hide"||kind==="remove")remove(kind==="remove");
  else if(kind==="cancel")void perform(async()=>{await cancelUnreadMessage(msg.id);await chat.refresh();close();});
  else if(kind==="bulk")void perform(async()=>{const {data,error}=await supabase.rpc("private_message_selection",{p_conversation_id:conversationId});if(error||!data)throw new Error("No se pudo seleccionar.");setOwnSelection({before:data.before,count:data.own});close();Keyboard.dismiss();});
  else if(kind==="emoji"){setEmojiTarget(msg.id);setEmoji("");close();}
  else{close();router.push({pathname:"/chat-action",params:{conversationId,messageId:msg.id,action:kind,otherId:chat.other?.id??""}});}
 };
 const pick=async(camera:boolean)=>{if(busy||recording.isRecording)return;try{if(camera){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted)throw new Error("Permite usar la cámara para tomar una foto.");}const result=camera?await ImagePicker.launchCameraAsync({mediaTypes:["images","videos"],videoMaxDuration:60,quality:0.85}):await ImagePicker.launchImageLibraryAsync({mediaTypes:["images","videos"],quality:0.85});if(!result.canceled&&result.assets[0]){const a=result.assets[0];uploaded.current=null;setMedia({uri:a.uri,kind:a.type==="video"?"video":"image",mime:a.mimeType??(a.type==="video"?"video/mp4":"image/jpeg")});}}catch(e){showError(e);}};
 const record=()=>void perform(async()=>{if(recording.isRecording){await recorder.stop();await setAudioModeAsync({allowsRecording:false});if(recorder.uri){uploaded.current=null;setMedia({uri:recorder.uri,kind:"audio",mime:"audio/mp4",duration:recording.durationMillis});}}else{const permission=await requestRecordingPermissionsAsync();if(!permission.granted)throw new Error("Permite usar el micrófono para grabar un audio.");await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});await recorder.prepareToRecordAsync();recorder.record();}});
 const send=()=>void perform(async()=>{if(!user)return;const draft=textRef.current;let attachment=uploaded.current;if(media&&!attachment){attachment=await uploadChatMedia(user.id,conversationId,media);uploaded.current=attachment;}const body=draft.trim()||(media?.kind==="audio"?"Audio":media?.kind==="video"?"Video":"Foto");if(await chat.send(body,{reply_to:reply?.id,attachment:attachment??undefined})){if(textRef.current===draft)setText("");setReply(null);setMedia(null);uploaded.current=null;atBottom.current=true;requestAnimationFrame(()=>list.current?.scrollToEnd({animated:true}));}});
 const startCall=()=>void perform(async()=>{if(!chat.other)return;const c=await createCall(conversationId,chat.other.id,"voice");router.push(`/call?callId=${encodeURIComponent(c.id)}&type=${c.type}`);});
 const name=chat.other?.username??"Conversación",bg=dark?(CHAT_BACKGROUNDS[prefs.background]??CHAT_BACKGROUNDS.slate):["#FAFAFC","#F4F6F8"] as const;
 const renderMessage=({item,index}:{item:PrivateMessage;index:number})=>{const mine=item.sender_id===user?.id,detail=details.find(d=>d.message_id===item.id),reactionList=reactions.filter(r=>r.message_id===item.id),quoted=chat.messages.find(m=>m.id===detail?.reply_to),chosen=!!ownSelection&&mine&&item.created_at<=ownSelection.before;const prev=chat.messages[index-1];return <View ref={node=>{if(node)rowRefs.current.set(item.id,node);else rowRefs.current.delete(item.id);}} collapsable={false} style={chosen?styles.selected:undefined}>
  {(!prev||Date.parse(item.created_at)-Date.parse(prev.created_at)>300000)&&<Text style={styles.time}>{new Date(item.created_at).toLocaleString("es",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</Text>}
  <View style={{alignItems:mine?"flex-end":"flex-start",paddingVertical:3}}>
   {detail?.forwarded&&<Text style={styles.meta}>Reenviado</Text>}
   {detail?.reply_to&&<Pressable onPress={()=>quoted&&jump(quoted.id)} style={styles.quote}><Text style={styles.meta}>Respuesta</Text><Text numberOfLines={2} style={styles.white}>{quoted?.text??"Mensaje anterior"}</Text></Pressable>}
   {pins.includes(item.id)&&<Text style={styles.meta}>Anclado para mí</Text>}
   {detail?.attachment&&<ChatMedia attachment={detail.attachment}/>}
   {item.text.startsWith("[TOKVID_LIVE_SHARE]|")?<LiveShareCard roomId={item.text.split("|")[2]}/>:<Bubble text={item.text} direction={mine?"sent":"received"} styleVariant={prefs.bubble_style} dark={dark} onPress={()=>open(item.id)} onLongPress={()=>open(item.id)}/>}
   {detail?.attachment&&<Pressable onPress={()=>open(item.id)} style={styles.mediaOptions}><Text style={styles.meta}>Opciones del mensaje</Text></Pressable>}
   {!!reactionList.length&&<View style={styles.reactionRow}>{[...new Set(reactionList.map(r=>r.emoji))].map(e=><Pressable key={e} onPress={()=>void react(e,item.id)} style={styles.reaction}><Text style={styles.white}>{e} {reactionList.filter(r=>r.emoji===e).length}</Text></Pressable>)}</View>}
  </View>
 </View>;};
 if(!user)return null;
 return <View ref={node=>{root.current=node;keyboardLayout.viewportRef.current=node;}} style={[styles.screen,{height:keyboardLayout.fullHeight,flex:0}]} onLayout={event=>{keyboardLayout.onLayout(event);root.current?.measureInWindow((_x,y,_w,height)=>setViewport({top:y,height}));}} collapsable={false}>
  <LinearGradient colors={bg} style={StyleSheet.absoluteFill}/>
  {CHAT_WALLPAPERS.find(w=>w.id===wallpaper)?.source&&<><Image source={CHAT_WALLPAPERS.find(w=>w.id===wallpaper)!.source!} resizeMode="cover" style={StyleSheet.absoluteFill}/>{dark&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:"#0000002E"}]}/>}</>}
  <View style={{flex:1,paddingTop:insets.top}}>
   <View style={styles.header}>
    <Pressable onPress={()=>router.replace({pathname:"/(tabs)/inbox",params:{tab:"messages"}})} style={styles.icon} accessibilityLabel="Volver a Mensajes"><Feather name="arrow-left" size={23} color={colors.text}/></Pressable>
    <Pressable style={styles.person} onPress={()=>chat.other&&router.push({pathname:"/user-profile",params:{userId:chat.other.id}})} accessibilityLabel={`Ver perfil de ${name}`}>{chat.other?.avatar_url?<Image source={{uri:chat.other.avatar_url}} style={styles.avatar}/>:<View style={[styles.avatar,styles.initial]}><Text style={styles.white}>{name[0]?.toUpperCase()}</Text></View>}<Text numberOfLines={1} style={styles.name}>@{name}</Text></Pressable>
    <Pressable style={styles.icon} onPress={startCall} disabled={busy||!chat.other} accessibilityLabel="Llamada de voz"><Feather name="phone" size={21} color={colors.text}/></Pressable>
    <Pressable style={styles.icon} onPress={()=>router.push({pathname:"/chat-details",params:{conversationId}})} accessibilityLabel="Detalles de la conversación"><Feather name="menu" size={23} color={colors.text}/></Pressable>
   </View>
   {!!chat.error&&<Pressable onPress={()=>void chat.refresh()} style={styles.notice}><Text style={styles.white}>{chat.error}</Text></Pressable>}
   {ownSelection&&<View style={styles.notice}><Text style={styles.white}>{ownSelection.count} mensajes tuyos seleccionados</Text><Pressable onPress={()=>setOwnSelection(null)} style={styles.icon} accessibilityLabel="Cancelar selección"><Feather name="x" color={colors.text} size={22}/></Pressable></View>}
   {chat.loading&&!chat.messages.length?<View style={styles.empty}><ActivityIndicator color="#A0C5CB"/></View>:<FlatList ref={list} data={chat.messages} renderItem={renderMessage} keyExtractor={m=>m.id} style={{flex:1}} contentContainerStyle={[styles.messages,{paddingBottom:composerHeight+keyboardLayout.keyboardInset+8}]} keyboardShouldPersistTaps="handled" onScrollBeginDrag={close} scrollEventThrottle={32} maintainVisibleContentPosition={{minIndexForVisible:0}} onScroll={e=>{const {contentOffset,contentSize,layoutMeasurement}=e.nativeEvent;atBottom.current=contentSize.height-contentOffset.y-layoutMeasurement.height<80;}} onContentSizeChange={()=>{const tail=chat.messages.at(-1)?.id??null;const newMessage=tail!==layoutTail.current;layoutTail.current=tail;if(!params.messageId&&(initialScroll.current||(newMessage&&atBottom.current))&&chat.messages.length){initialScroll.current=false;list.current?.scrollToEnd({animated:false});}}} onLayout={()=>{if(atBottom.current&&!params.messageId)requestAnimationFrame(()=>list.current?.scrollToEnd({animated:false}));}} onScrollToIndexFailed={info=>{list.current?.scrollToOffset({offset:info.averageItemLength*info.index,animated:false});}} ListHeaderComponent={chat.hasOlder?<Pressable onPress={()=>void chat.loadOlder()} style={styles.mediaOptions}><Text style={styles.meta}>Ver mensajes anteriores</Text></Pressable>:null} ListEmptyComponent={<View style={styles.empty}><Text style={styles.meta}>Comienza la conversación</Text></View>}/>}
   <View onLayout={e=>setComposerHeight(e.nativeEvent.layout.height)} style={{position:"absolute",left:0,right:0,bottom:keyboardLayout.keyboardInset}}>
   {reply&&<View style={styles.notice}><View style={{flex:1}}><Text style={styles.meta}>Respondiendo</Text><Text style={styles.white} numberOfLines={2}>{reply.text}</Text></View><Pressable style={styles.icon} onPress={()=>setReply(null)} accessibilityLabel="Cancelar respuesta"><Feather name="x" color={colors.text} size={20}/></Pressable></View>}
   {media&&<View style={styles.notice}>{media.kind==="image"&&<Image source={{uri:media.uri}} style={{width:54,height:54,borderRadius:8}}/>}<Text style={[styles.white,{flex:1}]}>{media.kind==="audio"?"Audio listo para enviar":media.kind==="video"?"Video listo para enviar":"Foto lista para enviar"}</Text><Pressable disabled={busy} style={styles.icon} onPress={()=>{setMedia(null);uploaded.current=null;}} accessibilityLabel="Descartar archivo"><Feather name="x" color={colors.text} size={20}/></Pressable></View>}
   {ownSelection?<View style={[styles.composer,{paddingBottom:Math.max(insets.bottom,10)}]}><Pressable disabled={busy||!ownSelection.count} style={styles.deleteButton} onPress={()=>Alert.alert("Eliminar todos mis mensajes","Se ocultarán solo de tu vista. Los mensajes recibidos se conservarán.",[{text:"Cancelar",style:"cancel"},{text:"Eliminar",onPress:()=>void perform(async()=>{await hideOwnMessages(conversationId,ownSelection.before);setOwnSelection(null);await chat.refresh();})}])}><Text style={styles.white}><Text style={{color:"#A0C5CB"}}>Eliminar</Text> ({ownSelection.count})</Text></Pressable></View>:<View style={[styles.composer,{paddingBottom:keyboard?8:Math.max(insets.bottom,10)}]}>
    <Pressable style={styles.icon} onPress={()=>void pick(true)} accessibilityLabel="Cámara" disabled={busy||recording.isRecording}><Feather name="camera" color={colors.secondary} size={22}/></Pressable>
    <View style={styles.field}><TextInput ref={input} value={text} onChangeText={setText} editable={!recording.isRecording} style={styles.input} placeholder={recording.isRecording?`Grabando ${Math.floor(recording.durationMillis/1000)} s…`:"Mensaje…"} placeholderTextColor="#A4B4C0" selectionColor="#92B8C3" multiline maxLength={1000} accessibilityLabel="Mensaje"/><Pressable style={styles.icon} onPress={()=>void pick(false)} disabled={busy||recording.isRecording} accessibilityLabel="Galería"><Feather name="image" color={colors.secondary} size={21}/></Pressable><Pressable style={styles.icon} accessibilityLabel={recording.isRecording?"Detener grabación":text.trim()||media?"Enviar mensaje":"Grabar audio"} disabled={busy||chat.sending||!chat.other} onPress={text.trim()||media?send:record}>{busy||chat.sending?<ActivityIndicator color="#B5D1D5"/>:<Feather name={recording.isRecording?"square":text.trim()||media?"send":"mic"} color={colors.text} size={21}/>}</Pressable></View>
   </View>}
   </View>
  </View>
  {anchor&&selected&&<MessageMenu anchor={anchor} width={window.width} height={keyboardLayout.availableHeight} safeTop={insets.top} page={page} onPage={setPage} onClose={close} variant={prefs.bubble_style} onVariant={style=>void perform(async()=>{const p=await saveChatPreferences(user.id,conversationId,{bubble_style:style});setPrefs(p);close();})} onAction={action} onReaction={value=>void react(value)} mine={selected.sender_id===user.id} canCancel={!selected.read_by_other} pinned={pins.includes(selected.id)} busy={busy}/>}
  {emojiTarget&&<View style={styles.emojiPanel}><Text style={styles.white}>Elige un emoji con tu teclado</Text><TextInput autoFocus value={emoji} onChangeText={setEmoji} maxLength={24} style={styles.input} placeholder="😊" placeholderTextColor="#AAA"/><View style={{flexDirection:"row"}}><Pressable style={styles.mediaOptions} onPress={()=>setEmojiTarget(null)}><Text style={styles.white}>Cancelar</Text></Pressable><Pressable style={styles.mediaOptions} disabled={busy||!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(emoji)} onPress={()=>void react(emoji.trim(),emojiTarget)}><Text style={styles.white}>Aplicar reacción</Text></Pressable></View></View>}
 </View>;
}
const baseStyles=StyleSheet.create({screen:{flex:1,backgroundColor:"#121820"},header:{flexDirection:"row",alignItems:"center",paddingHorizontal:4,paddingVertical:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"#8995A428",backgroundColor:"#18212AF2"},icon:{width:44,minHeight:44,alignItems:"center",justifyContent:"center"},person:{flex:1,minWidth:0,flexDirection:"row",gap:8,alignItems:"center"},avatar:{width:36,height:36,borderRadius:18},initial:{backgroundColor:"#38444F",alignItems:"center",justifyContent:"center"},name:{flex:1,color:"#F2F4F7",fontSize:16,fontWeight:"600"},white:{color:"#F2F4F7",fontSize:14},messages:{flexGrow:1,paddingHorizontal:12,paddingVertical:8},time:{color:"#A4ADB9",fontSize:11,textAlign:"center",marginVertical:12},meta:{color:"#B5C4CE",fontSize:12},quote:{maxWidth:"82%",borderLeftWidth:2,borderLeftColor:"#789BA4",padding:10,backgroundColor:"#26343E",borderRadius:8},selected:{backgroundColor:"#82B8C01A",borderRadius:12},notice:{padding:10,flexDirection:"row",gap:8,alignItems:"center",backgroundColor:"#26313C"},composer:{paddingHorizontal:6,paddingTop:8,flexDirection:"row",alignItems:"flex-end",backgroundColor:"#141C25",borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"#667D8B26"},field:{flex:1,flexDirection:"row",alignItems:"flex-end",borderRadius:23,backgroundColor:"#25353F",borderWidth:StyleSheet.hairlineWidth,borderColor:"#87A4AE35"},input:{flex:1,minHeight:46,maxHeight:120,paddingHorizontal:12,paddingVertical:12,color:"#F0F4F6",fontSize:15},empty:{flex:1,minHeight:160,justifyContent:"center",alignItems:"center"},mediaOptions:{padding:12,minHeight:44,justifyContent:"center"},reactionRow:{flexDirection:"row",gap:4,flexWrap:"wrap",marginTop:3},reaction:{padding:6,minWidth:44,minHeight:32,borderRadius:14,backgroundColor:"#2B3B45"},deleteButton:{flex:1,minHeight:48,alignItems:"center",justifyContent:"center",borderRadius:14,backgroundColor:"#283B43"},emojiPanel:{position:"absolute",top:100,left:16,right:16,padding:16,borderRadius:16,backgroundColor:"#24303C",zIndex:100}});
