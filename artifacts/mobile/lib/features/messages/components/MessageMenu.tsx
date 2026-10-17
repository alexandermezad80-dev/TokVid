import {referenceVisual as v,referenceHeaders} from "../../../../constants/referenceVisual";
import {palette} from '../../../../constants/palette';
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import Bubble,{BUBBLE_VARIANTS,BUBBLE_VARIANT_NAMES,type BubbleStyleVariant} from "./Bubble";
import { privateMessagePopover } from "../model";
export type MessageMenuPage="options"|"bubbles"|"bulk";
export type MessageAction="reply"|"forward"|"copy"|"pin"|"translate"|"hide"|"remove"|"bulk"|"cancel"|"report"|"emoji";
export default function MessageMenu({anchor,width,height,safeTop,page,onPage,onClose,variant,onVariant,onAction,onReaction,mine,canCancel,pinned,busy}: {
 anchor:{x:number;y:number;width:number;height:number};width:number;height:number;safeTop:number;
 page:MessageMenuPage;onPage:(page:MessageMenuPage)=>void;onClose:()=>void;
 variant:BubbleStyleVariant;onVariant:(style:BubbleStyleVariant)=>void;
 onAction:(action:MessageAction)=>void;onReaction:(emoji:string)=>void;
 mine:boolean;canCancel:boolean;pinned:boolean;busy:boolean;
}){
 const {fontScale}=useWindowDimensions();
 const barTop=Math.max(referenceHeaders.chat.top,safeTop+8)+referenceHeaders.chat.height+2;
 const placement=privateMessagePopover(anchor,width,height,barTop+40,page==="bubbles"?460:page==="bulk"?200:mine?Math.min(650,560*fontScale):360);
 const action=(label:string,icon:React.ComponentProps<typeof Feather>["name"],run:()=>void)=><Pressable accessibilityRole="button" disabled={busy} onPress={run} style={({pressed})=>[styles.action,pressed&&styles.pressed]}><Feather name={icon} color={v.ink} size={18}/><Text style={styles.label}>{label.startsWith("Eliminar")?<><Text style={{color:palette.teal}}>Eliminar</Text>{label.slice(8)}</>:label}</Text></Pressable>;
 return <View style={styles.overlay} accessibilityViewIsModal><Pressable style={[styles.backdrop,{top:barTop+40}]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar opciones"/>
  <View style={[styles.heading,{top:barTop}]}>{page!=="options"&&<Pressable onPress={()=>onPage("options")} style={styles.icon} accessibilityLabel="Volver a opciones"><Feather name="chevron-left" color={v.white} size={21}/></Pressable>}<Text style={styles.title}>{page==="bubbles"?"Estilo de burbuja":page==="bulk"?"Mis mensajes":"Mensaje"}</Text><Pressable onPress={onClose} style={styles.icon} accessibilityLabel="Cerrar menú"><Feather name="x" color={v.white} size={20}/></Pressable></View>
  <View style={[styles.menu,{left:placement.left,top:placement.top,width:placement.width,maxHeight:placement.maxHeight}]}>
   {page==="options"&&<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reactions} contentContainerStyle={{paddingHorizontal:4}}>{["❤️","👍","😂","😮","😢","🙏"].map(emoji=><Pressable key={emoji} disabled={busy} onPress={()=>onReaction(emoji)} style={styles.emojiButton} accessibilityLabel={`Reaccionar ${emoji}`}><Text style={styles.emoji}>{emoji}</Text></Pressable>)}<Pressable accessibilityLabel="Más emojis del teclado" onPress={()=>onAction("emoji")} style={styles.emojiButton}><Feather name="plus" size={20} color={v.ink}/></Pressable></ScrollView>}

   <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{flexShrink:1}}>
    {page==="options"&&<>
     {action("Responder","corner-up-left",()=>onAction("reply"))}
     {action("Reenviar","corner-up-right",()=>onAction("forward"))}
     {mine&&action("Copiar","copy",()=>onAction("copy"))}
     {action(pinned?"Desanclar":"Anclar","bookmark",()=>onAction("pin"))}
     {mine&&action("Traducir","globe",()=>onAction("translate"))}
     {mine&&action("Estilo de burbuja","message-circle",()=>onPage("bubbles"))}
     {action("Eliminar para mí","eye-off",()=>onAction("hide"))}
     {mine&&action("Eliminar para todos","trash-2",()=>onAction("remove"))}
     {mine&&action("Eliminar todos","check-square",()=>onPage("bulk"))}
     {mine&&canCancel&&action("Cancelar envío","rotate-ccw",()=>onAction("cancel"))}
     {!mine&&action("Denunciar","flag",()=>onAction("report"))}
    </>}
    {page==="bubbles"&&BUBBLE_VARIANTS.map(style=><Pressable key={style} accessibilityRole="radio" accessibilityState={{checked:style===variant}} onPress={()=>onVariant(style)} style={[styles.variant,style===variant&&styles.selected]}><Text style={styles.variantName}>{BUBBLE_VARIANT_NAMES[style]}</Text><View pointerEvents="none" style={{width:96}}><Bubble text="Hola" direction="sent" styleVariant={style}/></View>{style===variant&&<Feather name="check" color={palette.teal} size={16}/>}</Pressable>)}
    {page==="bulk"&&<><Text style={styles.hint}>Selecciona todos los mensajes que tú enviaste. Se ocultarán solo de tu vista.</Text>{action("Seleccionar todos","check-square",()=>onAction("bulk"))}</>}
   </ScrollView>
  </View>
 </View>;
}
const styles=StyleSheet.create({overlay:{...StyleSheet.absoluteFillObject,zIndex:50},backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"#00000036"},menu:{position:"absolute",backgroundColor:v.white,borderRadius:16,borderWidth:StyleSheet.hairlineWidth,borderColor:v.border,overflow:"hidden",elevation:8},heading:{position:"absolute",left:0,right:0,height:40,flexDirection:"row",alignItems:"center",paddingLeft:12,backgroundColor:v.steelDark},title:{flex:1,fontSize:14,color:v.white,fontWeight:"600"},icon:{width:44,height:40,alignItems:"center",justifyContent:"center"},action:{flexDirection:"row",alignItems:"center",minHeight:44,paddingHorizontal:14,paddingVertical:10,gap:10},label:{flex:1,color:v.ink,fontSize:14,lineHeight:20},pressed:{backgroundColor:v.input},variant:{marginHorizontal:6,marginVertical:1,minHeight:54,paddingHorizontal:8,paddingVertical:2,flexDirection:"row",alignItems:"center",gap:6,borderWidth:1,borderColor:"transparent",borderRadius:10},selected:{borderColor:palette.selectedBorder,backgroundColor:palette.selected},variantName:{flex:1,color:v.ink,fontSize:13},hint:{color:v.secondary,fontSize:13,lineHeight:19,padding:14},reactions:{flexGrow:0,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:v.border},emojiButton:{minWidth:44,minHeight:48,alignItems:"center",justifyContent:"center"},emoji:{fontSize:23,maxWidth:42}});
