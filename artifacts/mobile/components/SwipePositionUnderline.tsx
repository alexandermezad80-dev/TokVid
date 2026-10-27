import React, {useMemo} from "react";
import {Animated,StyleSheet,View} from "react-native";
import {referenceVisual as v} from '../constants/referenceVisual';
/** The existing 39dp tab strip stays fixed; only this small position marker moves. */
export default function SwipePositionUnderline({position,tabWidth,markerWidth=22,color=v.label,selectedIndex,moving=false}:{
 position:Animated.Value;tabWidth:number;markerWidth?:number;color?:string;selectedIndex?:number;moving?:boolean;
}){
 // Keep the native graph connected when a tab tap/data update rerenders the
 // strip. Recreating this derived node can leave the marker at its origin.
 const translateX=useMemo(()=>Animated.multiply(position,tabWidth),[position,tabWidth]);
 // The settled profile marker belongs to the selected tab, independent of
 // delayed native animation updates. A distinct View also isolates native
 // cleanup from the new static position after a manual selection.
 if(selectedIndex!==undefined&&!moving)return <View pointerEvents="none" style={[
   styles.line,{width:markerWidth,left:(tabWidth-markerWidth)/2,backgroundColor:color,transform:[{translateX:selectedIndex*tabWidth}]},
 ]}/>;
 return <Animated.View pointerEvents="none" style={[
   styles.line,{width:markerWidth,left:(tabWidth-markerWidth)/2,backgroundColor:color,transform:[{translateX}]},
 ]}/>;
}
const styles=StyleSheet.create({line:{
 position:"absolute",bottom:0,height:2,
}});
