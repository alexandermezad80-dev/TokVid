import React from 'react';
import {StyleSheet, View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {referenceVisual as v} from '../../constants/referenceVisual';

/** Decorative only: the existing control keeps its handlers and touch area. */
export default function BrandOutline({radius, width=1.5}:{radius:number;width?:number}) {
  return <LinearGradient pointerEvents="none" colors={v.outline} start={{x:0,y:.5}} end={{x:1,y:.5}} style={[StyleSheet.absoluteFill,{borderRadius:radius}]}>
    <View style={{position:'absolute',top:width,bottom:width,left:width,right:width,borderRadius:Math.max(0,radius-width),backgroundColor:v.white}}/>
  </LinearGradient>;
}
export function BrandDivider(){
  return <LinearGradient pointerEvents="none" colors={v.outline} start={{x:0,y:.5}} end={{x:1,y:.5}} style={{height:1,width:'100%'}}/>;
}
