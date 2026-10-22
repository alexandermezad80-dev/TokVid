import React,{useCallback,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {referenceHeaders, referenceVisual as v, type ReferenceHeaderVariant} from '../../constants/referenceVisual';
import {palette} from '../../constants/palette';
export const HEADER_COLORS = palette.header;
export default function ReferenceHeader({title,left,right,children,compact=false,black=false,contentHeight,colors=HEADER_COLORS,style,variant}:{variant?:ReferenceHeaderVariant;title?:string;left?:React.ReactNode;right?:React.ReactNode;children?:React.ReactNode;compact?:boolean;black?:boolean;contentHeight?:number;colors?:readonly [string,string,...string[]];style?:StyleProp<ViewStyle>}){
 const insets=useSafeAreaInsets();
 const [focused,setFocused]=useState(false);
 useFocusEffect(useCallback(()=>{setFocused(true);return()=>setFocused(false);},[]));
 if(variant){
  const metric=referenceHeaders[variant];
  // Reference coordinates are minimums; never place a control under a taller status bar.
  return <View style={{paddingTop:Math.max(metric.top,insets.top+8),backgroundColor:v.white,zIndex:2}}>
   {focused&&<StatusBar style="dark"/>}
   <View style={[s.row,style,{marginHorizontal:metric.margin,height:metric.height,borderRadius:metric.radius,backgroundColor:v.white}]}>
    {children??<>{left}{title&&<Text numberOfLines={1} style={[s.title,black&&{color:"#FFFFFF"},compact&&{ fontFamily: "Inter_400Regular",fontSize:22}]}>{title}</Text>}{right}</>}
   </View>
  </View>;
 }

 return <View style={[s.shell,{paddingTop:insets.top,backgroundColor:black?'#0B0B0D':v.white},style]}>
  {focused&&<StatusBar style={black ? "light" : "dark"}/>}
  <View style={[s.row,{minHeight:contentHeight??(compact?38:52.5)}]}>{children??<>{left}{title&&<Text numberOfLines={1} style={[s.title,black&&{color:"#FFFFFF"},compact&&{ fontFamily: "Inter_400Regular",fontSize:22}]}>{title}</Text>}{right}</>}</View>
 </View>;
}
const s=StyleSheet.create({shell:{borderBottomLeftRadius:20,borderBottomRightRadius:20,overflow:'hidden',zIndex:2},row:{flexDirection:'row',alignItems:'center',paddingHorizontal:8},title:{ fontFamily: "Inter_500Medium",flex:1,color:palette.headerText,fontSize:18,fontWeight:"normal"}});
