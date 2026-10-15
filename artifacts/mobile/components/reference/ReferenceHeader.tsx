import React from 'react';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {StatusBar} from 'expo-status-bar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {palette} from '../../constants/palette';
export const HEADER_COLORS = palette.header;
export default function ReferenceHeader({title,left,right,children,compact=false,black=false,contentHeight,colors=HEADER_COLORS,style}:{title?:string;left?:React.ReactNode;right?:React.ReactNode;children?:React.ReactNode;compact?:boolean;black?:boolean;contentHeight?:number;colors?:readonly [string,string,...string[]];style?:StyleProp<ViewStyle>}){
 const insets=useSafeAreaInsets();
 return <View style={[s.shell,{paddingTop:insets.top,backgroundColor:black?'#0B0B0D':'#5F6A74'},style]}>
  <StatusBar style="light"/>
  {!black&&<LinearGradient colors={colors} start={{x:0,y:0}} end={{x:1,y:.36}} style={StyleSheet.absoluteFill}/>}
  <View style={[s.row,{minHeight:contentHeight??(compact?38:52.5)}]}>{children??<>{left}{title&&<Text numberOfLines={1} style={[s.title,compact&&{fontSize:22}]}>{title}</Text>}{right}</>}</View>
 </View>;
}
const s=StyleSheet.create({shell:{borderBottomLeftRadius:20,borderBottomRightRadius:20,overflow:'hidden',zIndex:2},row:{flexDirection:'row',alignItems:'center',paddingHorizontal:8},title:{flex:1,color:'#FFF',fontSize:18,fontWeight:'700'}});
