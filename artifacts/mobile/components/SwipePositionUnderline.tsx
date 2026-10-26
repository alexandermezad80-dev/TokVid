import React from "react";
import {Animated,StyleSheet} from "react-native";
import {referenceVisual as v} from '../constants/referenceVisual';
/** The existing 39dp tab strip stays fixed; only this small position marker moves. */
export default function SwipePositionUnderline({position,tabWidth,markerWidth=22,color=v.label}:{
 position:Animated.Value;tabWidth:number;markerWidth?:number;color?:string;
}){
 return <Animated.View pointerEvents="none" style={[
   styles.line,{width:markerWidth,left:(tabWidth-markerWidth)/2,backgroundColor:color,transform:[{translateX:Animated.multiply(position,tabWidth)}]},
 ]}/>;
}
const styles=StyleSheet.create({line:{
 position:"absolute",bottom:0,height:2,
}});
