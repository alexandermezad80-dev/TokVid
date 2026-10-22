import {referenceVisual as v} from "../constants/referenceVisual";
import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ReferenceHeader from '../components/reference/ReferenceHeader';
import {useAuth} from '../context/AuthContext';
import {readProfileVisibility,saveProfileVisibility,type ProfileVisibility} from '../lib/features/profile/visibility';
const OPTIONS=[{key:'balance',label:'Saldo',icon:'credit-card'},{key:'tools',label:'Herramientas de usuario',icon:'tool'},{key:'activity',label:'Centro de actividades',icon:'activity'},{key:'privacy',label:'Ajustes y privacidad',icon:'shield'},{key:'qr',label:'Código QR',icon:'grid'}] as const;
const FOOTER=[{key:'delete',label:'Eliminar cuenta',icon:'trash-2'},{key:'switch',label:'Cambiar cuenta',icon:'repeat'},{key:'logout',label:'Cerrar sesión',icon:'log-out'}] as const;
export default function UserTools(){
 const {section}=useLocalSearchParams<{section?:string}>(),{user,signOut}=useAuth(),insets=useSafeAreaInsets();
 const [visibility,setVisibility]=useState<ProfileVisibility>({show_likes:false,show_shares:false}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;if(user&&section==='privacy'){setLoading(true);void readProfileVisibility(user.id).then(v=>{if(active){setVisibility(v);setError('');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});}return()=>{active=false;};},[user?.id,section]);
 if(!user)return null;
 const title=[...OPTIONS,...FOOTER].find(o=>o.key===section)?.label;
 const navigate=(key:string)=>router.push({pathname:'/user-tools',params:{section:key}});
 const leave=async()=>{if(busy)return;setBusy(true);try{await signOut();router.replace('/(tabs)');}catch{Alert.alert('No se pudo cerrar la sesión','Inténtalo de nuevo.');}finally{setBusy(false);}};
 const save=async(key:keyof ProfileVisibility,value:boolean)=>{if(busy)return;setBusy(true);try{setVisibility(await saveProfileVisibility(user.id,{...visibility,[key]:value}));}catch(e){Alert.alert('No se guardó',e instanceof Error?e.message:'Inténtalo de nuevo.');}finally{setBusy(false);}};
 const row=(o:typeof OPTIONS[number]|typeof FOOTER[number],arrow=true)=><Pressable key={o.key} style={[s.row,(o.key==='privacy'||o.key==='qr')&&s.divider]} onPress={()=>navigate(o.key)}><Feather name={o.icon} size={22} color={v.ink}/><Text style={s.label}>{o.label}</Text>{arrow&&<Feather name="chevron-right" size={18} color={v.inactive}/>}</Pressable>;
 return <View style={{flex:1,backgroundColor:'#FFF',paddingBottom:insets.bottom}}><ReferenceHeader variant="tools" title={title} left={<Pressable style={s.back} onPress={()=>router.back()} accessibilityLabel="Volver"><Feather name="arrow-left" color="#0B0B0D" size={24}/></Pressable>}/>
 {!section?<ScrollView contentContainerStyle={{flexGrow:1,paddingTop:8}}>{OPTIONS.map(o=>row(o))}<View style={{flex:1,minHeight:60}}/><View style={s.divider}>{FOOTER.map(o=>row(o,false))}</View></ScrollView>:
 <ScrollView contentContainerStyle={{padding:20,flexGrow:1}}>
 {(section==='balance'||section==='tools')&&<><View style={s.card}><Text style={s.muted}>Saldo</Text><Text style={s.balance}>0.00</Text></View><Text style={s.note}>Saldo aún no disponible. El importe mostrado es provisional.</Text></>}
 {section==='privacy'&&(loading?<ActivityIndicator/>:error?<Text style={s.note}>{error}</Text>:<><Text style={s.heading}>Visibilidad de tu perfil</Text>{([['show_likes','Mostrar mis Me gusta'],['show_shares','Mostrar mis compartidos']] as const).map(([key,label])=><View key={key} style={s.privacyRow}><Text style={s.label}>{label}</Text><Switch value={visibility[key]} disabled={busy} onValueChange={v=>void save(key,v)} trackColor={{false:'#D5D9DE',true:'#2F9A9F'}} thumbColor="#FFF"/></View>)}<Text style={s.note}>Solo estas secciones pueden hacerse públicas. Tus guardados y herramientas personales siguen siendo privados.</Text></>)}
 {section==='activity'&&<Pressable style={s.button} onPress={()=>router.push({pathname:'/(tabs)/inbox',params:{tab:'activity'}})}><Text style={s.buttonText}>Ver Actividad</Text></Pressable>}
 {section==='qr'&&<Text style={s.note}>Tu código QR estará disponible próximamente.</Text>}
 {section==='delete'&&<Text style={s.note}>La eliminación de cuenta aún no está disponible desde esta pantalla.</Text>}
 {(section==='logout'||section==='switch')&&<><Text style={s.heading}>{section==='switch'?'Cierra esta sesión para entrar con otra cuenta.':'¿Quieres cerrar tu sesión?'}</Text><Pressable disabled={busy} style={s.button} onPress={()=>void leave()}>{busy?<ActivityIndicator color="#FFF"/>:<Text style={s.buttonText}>{section==='switch'?'Cerrar sesión y cambiar cuenta':'Cerrar sesión'}</Text>}</Pressable></>}
 </ScrollView>}
 </View>;
}
const s=StyleSheet.create({back:{width:44,height:44,alignItems:'center',justifyContent:'center'},row:{minHeight:56,flexDirection:'row',alignItems:'center',paddingHorizontal:20,gap:14},label:{ fontFamily: "Inter_500Medium",flex:1,fontSize:17,color:v.ink,fontWeight:"normal"},divider:{borderTopWidth:1,borderTopColor:'#E5E5E5'},card:{minHeight:106,padding:20,borderRadius:16,borderWidth:1,borderColor:'#E5E5E5',backgroundColor:'#F9F9F9'},muted:{ fontFamily: "Inter_400Regular",fontSize:15,color:v.secondary},balance:{ fontFamily: "Inter_500Medium",fontSize:32,fontWeight:"normal",color:v.ink,marginTop:6},note:{ fontFamily: "Inter_400Regular",fontSize:14,lineHeight:21,color:v.secondary,marginTop:16},heading:{ fontFamily: "Inter_500Medium",fontSize:18,fontWeight:"normal",color:v.ink,marginBottom:16},privacyRow:{minHeight:64,flexDirection:'row',alignItems:'center',gap:12},button:{marginTop:20,minHeight:46,backgroundColor:'#161616',borderRadius:12,alignItems:'center',justifyContent:'center',padding:12},buttonText:{ fontFamily: "Inter_500Medium",fontSize:16,color:'#FFF',fontWeight:"normal"}});
