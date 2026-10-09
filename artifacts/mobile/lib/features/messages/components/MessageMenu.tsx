import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Bubble,{BUBBLE_VARIANTS,BUBBLE_VARIANT_NAMES,type BubbleStyleVariant} from "./Bubble";
import { privateMessagePopover } from "../model";
export type MessageMenuPage="options"|"bubbles"|"delete";
export default function MessageMenu({anchor,width,height,safeTop,page,onPage,onClose,variant,onVariant,onSelect,onDelete,canDelete,forEveryone,busy}: {
 anchor:{x:number;y:number;width:number;height:number};width:number;height:number;safeTop:number;
 page:MessageMenuPage;onPage:(page:MessageMenuPage)=>void;onClose:()=>void;
 variant:BubbleStyleVariant;onVariant:(style:BubbleStyleVariant)=>void;onSelect:()=>void;
 onDelete:(everyone:boolean)=>void;canDelete:boolean;forEveryone:boolean;busy:boolean;
}){
 const placement=privateMessagePopover(anchor,width,height,safeTop,page==="bubbles"?440:page==="delete"?240:230);
 const action=(label:string,icon:React.ComponentProps<typeof Feather>["name"],run:()=>void,destructive=false)=><Pressable accessibilityRole="button" disabled={busy} onPress={run} style={({pressed})=>[styles.action,pressed&&styles.pressed]}><Feather name={icon} color={destructive?"#F3A5B9":"#DEE2EB"} size={19}/><Text style={[styles.label,destructive&&{color:"#F3A5B9"}]}>{label}</Text></Pressable>;
 return <View style={styles.overlay} accessibilityViewIsModal><Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar opciones"/>
  <View style={[styles.menu,{left:placement.left,top:placement.top,width:placement.width,maxHeight:placement.maxHeight}]}>
   <BlurView pointerEvents="none" intensity={16} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill}/>
   <LinearGradient pointerEvents="none" colors={["rgba(0,242,254,0.045)","rgba(254,9,121,0.035)"]} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/>
   <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
    <View style={styles.heading}>{page!=="options"&&<Pressable onPress={()=>onPage("options")} style={styles.icon} accessibilityLabel="Volver a opciones"><Feather name="chevron-left" color="#DEE2EB" size={23}/></Pressable>}<Text style={styles.title}>{page==="bubbles"?"Burbujas":page==="delete"?"Eliminar mensajes":"Opciones"}</Text><Pressable onPress={onClose} style={styles.icon} accessibilityLabel="Cerrar menú"><Feather name="x" color="#D4D6DE" size={21}/></Pressable></View>
    {page==="options"&&<>{action("Burbujas","message-circle",()=>onPage("bubbles"))}{action("Seleccionar mensajes","check-square",onSelect)}{canDelete&&action("Eliminar","trash-2",()=>onPage("delete"),true)}</>}
    {page==="bubbles"&&BUBBLE_VARIANTS.map(style=><Pressable key={style} accessibilityRole="radio" accessibilityState={{checked:style===variant}} accessibilityLabel={BUBBLE_VARIANT_NAMES[style]} onPress={()=>onVariant(style)} style={[styles.variant,style===variant&&styles.selected]}><Text style={styles.variantName}>{BUBBLE_VARIANT_NAMES[style]}</Text><View pointerEvents="none" style={{flex:1}}><Bubble text="Hola" direction="sent" styleVariant={style}/></View>{style===variant&&<Feather name="check" color="#A0D9DD" size={18}/>}</Pressable>)}
    {page==="delete"&&<><Text style={styles.hint}>Elige dónde eliminar la selección.</Text>{action("Eliminar para mí","eye-off",()=>onDelete(false),true)}{forEveryone&&action("Eliminar para todos","trash-2",()=>onDelete(true),true)}{!forEveryone&&<Text style={styles.hint}>Solo puedes eliminar para todos los mensajes que tú enviaste.</Text>}</>}
   </ScrollView>
  </View>
 </View>;
}
const styles=StyleSheet.create({overlay:{...StyleSheet.absoluteFillObject,zIndex:50},backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"#00000026"},menu:{position:"absolute",backgroundColor:"rgba(24,26,34,0.97)",borderRadius:18,borderWidth:StyleSheet.hairlineWidth,borderColor:"#FFFFFF29",overflow:"hidden",elevation:14},heading:{flexDirection:"row",alignItems:"center",paddingLeft:16,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:"#FFFFFF14",minHeight:52},title:{flex:1,fontSize:16,color:"#F3F4F8",fontWeight:"600"},icon:{width:48,height:48,alignItems:"center",justifyContent:"center"},action:{flexDirection:"row",alignItems:"center",minHeight:50,paddingHorizontal:16,paddingVertical:12,gap:12},label:{flex:1,color:"#EDF0F5",fontSize:15,lineHeight:21},pressed:{backgroundColor:"#FFFFFF0C"},variant:{marginHorizontal:10,marginVertical:4,minHeight:66,padding:10,flexDirection:"row",alignItems:"center",gap:8,borderWidth:1,borderColor:"transparent",borderRadius:12},selected:{borderColor:"#86BCC15C",backgroundColor:"#91D1D608"},variantName:{color:"#E5E8F0",fontSize:14,width:85},hint:{color:"#AAB0BF",fontSize:13,lineHeight:19,padding:16}});
