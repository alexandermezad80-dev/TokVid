import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

export type BubbleStyleVariant = "classic"|"minimal"|"rounded"|"glass"|"gradient"|"neon"|"elegant"|"compact";
export type BubbleDirection = "sent"|"received";
export type BubbleGroupPosition = "single"|"first"|"middle"|"last";

type Token = {
  radius:[number,number,number,number]; tight:number; bg:string; color:string;
  border?:string; px:number; py:number; fs:number; lh:number; fw:"400"|"500"; maxWidth:string;
};
const T: Record<BubbleStyleVariant,Record<BubbleDirection,Token>> = {
  classic:{sent:{radius:[18,18,18,18],tight:6,bg:"#FE2C55",color:"#0A0A0F",px:14,py:10,fs:15,lh:21,fw:"400",maxWidth:"78%"},received:{radius:[18,18,18,18],tight:6,bg:"#16161C",color:"#F5F5F7",px:14,py:10,fs:15,lh:21,fw:"400",maxWidth:"78%"}},
  minimal:{sent:{radius:[10,10,10,10],tight:6,bg:"transparent",color:"#00F2EA",border:"#00F2EA",px:12,py:8,fs:14,lh:20,fw:"400",maxWidth:"78%"},received:{radius:[10,10,10,10],tight:6,bg:"transparent",color:"#F5F5F7",border:"rgba(255,255,255,.16)",px:12,py:8,fs:14,lh:20,fw:"400",maxWidth:"78%"}},
  rounded:{sent:{radius:[999,999,999,999],tight:20,bg:"#FF0050",color:"#FFF",px:20,py:12,fs:15,lh:21,fw:"500",maxWidth:"76%"},received:{radius:[999,999,999,999],tight:20,bg:"#24242E",color:"#F5F5F7",px:20,py:12,fs:15,lh:21,fw:"500",maxWidth:"76%"}},
  glass:{sent:{radius:[16,16,16,16],tight:8,bg:"rgba(0,242,234,.14)",color:"#F5F5F7",border:"rgba(255,255,255,.22)",px:14,py:10,fs:15,lh:21,fw:"400",maxWidth:"78%"},received:{radius:[16,16,16,16],tight:8,bg:"rgba(255,255,255,.06)",color:"#F5F5F7",border:"rgba(255,255,255,.14)",px:14,py:10,fs:15,lh:21,fw:"400",maxWidth:"78%"}},
  gradient:{sent:{radius:[20,20,4,20],tight:4,bg:"#FE2C55",color:"#0A0A0F",px:15,py:11,fs:15,lh:21,fw:"500",maxWidth:"78%"},received:{radius:[20,20,20,4],tight:4,bg:"#24212E",color:"#F5F5F7",px:15,py:11,fs:15,lh:21,fw:"400",maxWidth:"78%"}},
  neon:{sent:{radius:[14,14,14,14],tight:6,bg:"rgba(255,0,80,.10)",color:"#FF6C9B",border:"#FF0050",px:14,py:10,fs:14.5,lh:20,fw:"400",maxWidth:"78%"},received:{radius:[14,14,14,14],tight:6,bg:"rgba(0,242,234,.08)",color:"#5FF6EF",border:"#00F2EA",px:14,py:10,fs:14.5,lh:20,fw:"400",maxWidth:"78%"}},
  elegant:{sent:{radius:[22,22,6,22],tight:6,bg:"#1B1B22",color:"#F0E9DC",border:"rgba(212,175,122,.4)",px:18,py:13,fs:15,lh:23,fw:"400",maxWidth:"76%"},received:{radius:[22,22,22,6],tight:6,bg:"#14141A",color:"#E8E4DC",border:"rgba(255,255,255,.08)",px:18,py:13,fs:15,lh:23,fw:"400",maxWidth:"76%"}},
  compact:{sent:{radius:[8,8,8,8],tight:4,bg:"#00C2BC",color:"#06110F",px:10,py:6,fs:13,lh:17,fw:"400",maxWidth:"84%"},received:{radius:[8,8,8,8],tight:4,bg:"#1D1D24",color:"#F5F5F7",px:10,py:6,fs:13,lh:17,fw:"400",maxWidth:"84%"}},
};
export const BUBBLE_VARIANTS = Object.keys(T) as BubbleStyleVariant[];
export const BUBBLE_VARIANT_NAMES: Record<BubbleStyleVariant,string> = {classic:"Classic",minimal:"Minimal",rounded:"Rounded",glass:"Glass",gradient:"Gradient",neon:"Neon",elegant:"Elegant",compact:"Compact"};

function radius(token:Token,d:BubbleDirection,p:BubbleGroupPosition) {
  const r=[...token.radius] as [number,number,number,number];
  const top=p==="middle"||p==="last", bottom=p==="first"||p==="middle";
  if(d==="sent"){if(top)r[1]=token.tight;if(bottom)r[2]=token.tight;}
  else {if(top)r[0]=token.tight;if(bottom)r[3]=token.tight;}
  return r;
}

export default function Bubble({text,direction,groupPosition="single",styleVariant="classic",timestamp}:{text:string;direction:BubbleDirection;groupPosition?:BubbleGroupPosition;styleVariant?:BubbleStyleVariant;timestamp?:string}) {
  const t=T[styleVariant][direction], r=radius(t,direction,groupPosition);
  const base={maxWidth:t.maxWidth,borderRadius:r,backgroundColor:t.bg,borderWidth:t.border?1:0,borderColor:t.border,paddingHorizontal:t.px,paddingVertical:t.py};
  const textNode=<Text accessibilityLabel={(direction==="sent"?"Enviado: ":"Recibido: ")+text+(timestamp?", "+timestamp:"")} style={[styles.text,{color:t.color,fontSize:t.fs,lineHeight:t.lh,fontWeight:t.fw}]}>{text}</Text>;
  let visual:React.ReactNode=<View style={[styles.bubble,base]}>{textNode}</View>;
  if(styleVariant==="glass") visual=<BlurView intensity={18} tint="dark" style={[styles.bubble,base]}>{textNode}</BlurView>;
  if(styleVariant==="classic"&&direction==="sent") visual=<LinearGradient colors={["#00F2EA","#FF0050"]} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.bubble,base]}>{textNode}</LinearGradient>;
  if(styleVariant==="gradient") visual=<LinearGradient colors={direction==="sent"?["#00F2EA","#FF0050"]:["#24242E","#17131F"]} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.bubble,base]}>{textNode}</LinearGradient>;
  return <View style={[styles.row,{alignItems:direction==="sent"?"flex-end":"flex-start"}]}>{visual}{timestamp?<Text style={styles.time}>{timestamp}</Text>:null}</View>;
}
const styles=StyleSheet.create({row:{width:"100%",marginVertical:2},bubble:{overflow:"hidden",shadowColor:"#000",shadowOpacity:.22,shadowRadius:7,shadowOffset:{width:0,height:3}},text:{fontFamily:"Inter",includeFontPadding:false},time:{color:"#444",fontSize:11,marginTop:4,paddingHorizontal:2}});
