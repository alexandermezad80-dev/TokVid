import React from "react";
import { Modal,Pressable,ScrollView,StyleSheet,Text,View } from "react-native";
import { BUBBLE_VARIANTS,BUBBLE_VARIANT_NAMES,type BubbleStyleVariant } from "./Bubble";
export default function BubbleStylePicker({visible,value,onSelect,onClose}:{visible:boolean;value:BubbleStyleVariant;onSelect:(v:BubbleStyleVariant)=>void;onClose:()=>void}){
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
  <Pressable style={s.backdrop} onPress={onClose}><Pressable style={s.panel} onPress={e=>e.stopPropagation()}>
   <Text style={s.title}>Estilo de Bubbles</Text><Text style={s.sub}>Cambia solo la apariencia de tus mensajes.</Text>
   <ScrollView contentContainerStyle={s.list}>{BUBBLE_VARIANTS.map(v=><Pressable key={v} accessibilityRole="button" accessibilityState={{selected:value===v}} style={[s.item,value===v&&s.selectedItem]} onPress={()=>onSelect(v)}>
    <Text style={s.itemText}>{BUBBLE_VARIANT_NAMES[v]}</Text>{value===v?<Text style={s.check}>✓ Seleccionado</Text>:null}
   </Pressable>)}</ScrollView>
   <Pressable style={s.close} onPress={onClose}><Text style={s.closeText}>Cerrar</Text></Pressable>
  </Pressable></Pressable>
 </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:"rgba(0,0,0,.72)",justifyContent:"flex-end"},panel:{backgroundColor:"#12121A",borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:"82%"},title:{color:"#F5F5F7",fontSize:20,fontWeight:"700"},sub:{color:"#8B8B96",fontSize:13,marginTop:5,marginBottom:16},list:{gap:8,paddingBottom:8},item:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:"rgba(255,255,255,.08)",backgroundColor:"#16161C",paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},selectedItem:{borderColor:"#00F2EA"},itemText:{color:"#F5F5F7",fontSize:15,fontWeight:"600"},check:{color:"#00F2EA",fontSize:12,fontWeight:"700"},close:{marginTop:12,minHeight:48,borderRadius:14,backgroundColor:"#24242E",alignItems:"center",justifyContent:"center"},closeText:{color:"#FFF",fontSize:15,fontWeight:"600"}});
