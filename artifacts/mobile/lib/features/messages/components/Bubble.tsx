import React from 'react';
import {Pressable,StyleSheet,Text,View,type ViewStyle} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {BUBBLE_TOKENS,normalizeBubbleStyle,type BubbleStyleVariant,type BubbleToken} from '../bubbleStyles';
export {BUBBLE_VARIANTS,BUBBLE_VARIANT_NAMES,type BubbleStyleVariant,type BubbleToken} from '../bubbleStyles';
export type BubbleDirection='sent'|'received';
export type BubbleGroupPosition='single'|'first'|'middle'|'last';
type Props={text:string;direction:BubbleDirection;groupPosition?:BubbleGroupPosition;styleVariant?:BubbleStyleVariant;timestamp?:string;dark?:boolean;preview?:boolean;onPress?:()=>void;onLongPress?:()=>void};
export default function Bubble({text,direction,groupPosition='single',styleVariant='classic',timestamp,dark=false,preview=false,onPress,onLongPress}:Props){
 const variant=normalizeBubbleStyle(styleVariant),compact=variant==='compact';
 const token:BubbleToken=direction==='received'?{background:dark?'#202B34':'#FFFFFF',color:dark?'#FFFFFF':'#101010',border:dark?'#3F4D59':'#DDE2E6',radius:16}:BUBBLE_TOKENS[variant];
 const top=groupPosition==='middle'||groupPosition==='last',bottom=groupPosition==='middle'||groupPosition==='first';
 const shape:ViewStyle={borderRadius:token.radius,borderWidth:token.border?1:0,borderColor:token.border,backgroundColor:token.background,
  borderTopRightRadius:direction==='sent'&&top?6:token.radius,borderBottomRightRadius:direction==='sent'&&(bottom||variant==='elegant')?6:token.radius,
  borderTopLeftRadius:direction==='received'&&top?6:token.radius,borderBottomLeftRadius:direction==='received'&&bottom?6:token.radius,
  paddingHorizontal:preview?0:compact?10:14,paddingVertical:preview?0:compact?7:10,
  ...(preview?{width:compact?60:84,height:compact?32:40,alignItems:'center',justifyContent:'center'}:{})};
 const content=<Text numberOfLines={preview?1:undefined} maxFontSizeMultiplier={preview?1.15:1.5} accessibilityLabel={(direction==='sent'?'Enviado: ':'Recibido: ')+text+(timestamp?', '+timestamp:'')} style={{color:token.color,fontSize:preview?(compact?15:17):(compact?14:15),lineHeight:preview?22:21,includeFontPadding:false}}>{text}</Text>;
 return <View style={[s.row,{alignItems:direction==='sent'?'flex-end':'flex-start'}]}>
  <Pressable style={{maxWidth:preview?'100%':'82%'}} disabled={!onPress&&!onLongPress} onPress={onPress} onLongPress={onLongPress} accessibilityRole={onPress?'button':'text'}>
   {token.gradient?<LinearGradient colors={token.gradient} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.bubble,shape]}>{content}</LinearGradient>:<View style={[s.bubble,shape]}>{content}</View>}
  </Pressable>{timestamp&&<Text style={s.time}>{timestamp}</Text>}
 </View>;
}
const s=StyleSheet.create({row:{width:'100%',marginVertical:2},bubble:{overflow:'hidden'},time:{fontSize:11,color:'#8A8B97',marginTop:4,paddingHorizontal:2}});
