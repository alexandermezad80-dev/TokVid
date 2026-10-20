import React from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {referenceVisual as v} from '../../../../constants/referenceVisual';
import Bubble,{BUBBLE_VARIANTS,BUBBLE_VARIANT_NAMES,type BubbleStyleVariant} from './Bubble';
export function BubbleStyleRows({value,onSelect,busy=false}:{value:BubbleStyleVariant;onSelect:(v:BubbleStyleVariant)=>void;busy?:boolean}){
 return <>{BUBBLE_VARIANTS.map(v=><Pressable key={v} disabled={busy} accessibilityRole="radio" accessibilityState={{checked:value===v,disabled:busy}} accessibilityLabel={BUBBLE_VARIANT_NAMES[v]} onPress={()=>onSelect(v)} style={[s.item,value===v&&s.selected]}>
  <Text style={s.label}>{BUBBLE_VARIANT_NAMES[v]}</Text><View pointerEvents="none" style={{width:84,flexShrink:0}}><Bubble text="Hola" direction="sent" styleVariant={v} preview/></View><View style={s.check}>{value===v&&<Feather name="check" size={20} color="#1F8A8F"/>}</View>
 </Pressable>)}</>;
}
export default function BubbleStylePicker({visible,value,onSelect,onClose,busy=false}:{visible:boolean;value:BubbleStyleVariant;onSelect:(v:BubbleStyleVariant)=>void;onClose:()=>void;busy?:boolean}){
 const insets=useSafeAreaInsets(),{height}=useWindowDimensions();
 return <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
  <View style={s.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar estilos de burbuja"/>
   <View style={[s.panel,{height:Math.min(588,height-insets.top-24),maxHeight:height-insets.top-24}]} accessibilityViewIsModal>
    <View style={s.handle}/><View style={s.header}><Pressable style={s.icon} onPress={onClose} accessibilityLabel="Volver a la conversación"><Feather name="chevron-left" color="#FFF" size={24}/></Pressable><Text style={s.title}>Estilo de burbuja</Text><Pressable style={s.icon} onPress={onClose} accessibilityLabel="Cerrar"><Feather name="x" color="#FFF" size={22}/></Pressable></View>
    <ScrollView style={{flexShrink:1}} contentContainerStyle={{padding:12,paddingTop:19,paddingBottom:Math.max(insets.bottom,12)+12}} keyboardShouldPersistTaps="handled"><BubbleStyleRows value={value} onSelect={onSelect} busy={busy}/></ScrollView>
   </View>
  </View>
 </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'#00000080',justifyContent:'flex-end'},panel:{backgroundColor:'#FFF',borderTopLeftRadius:24,borderTopRightRadius:24,overflow:'hidden'},header:{height:40,marginTop:17,marginHorizontal:12,borderRadius:20,backgroundColor:v.steel,flexDirection:'row',alignItems:'center',paddingHorizontal:8},handle:{position:'absolute',top:8,alignSelf:'center',left:'50%',marginLeft:-30,width:60,height:4,borderRadius:2,backgroundColor:v.ink},icon:{width:44,height:40,justifyContent:'center',alignItems:'center'},title:{ fontFamily: "Inter_500Medium",flex:1,color:'#FFF',fontSize:19,fontWeight:"normal"},item:{minHeight:64,marginBottom:4,paddingVertical:8,paddingLeft:16,paddingRight:8,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1.5,borderColor:'transparent',borderRadius:14},selected:{backgroundColor:'#F1FAFA',borderColor:'#2F9A9F'},label:{ fontFamily: "Inter_500Medium",flex:1,color:'#101010',fontSize:17,fontWeight:"normal"},check:{width:20,alignItems:'center'}});
