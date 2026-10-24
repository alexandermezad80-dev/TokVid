import React from "react";
import {Animated,StyleSheet} from "react-native";
/** The existing 39dp tab strip stays fixed; only this small position marker moves. */
export default function SwipePositionUnderline({position,tabWidth}:{
 position:Animated.Value;tabWidth:number;
}){
 return <Animated.View pointerEvents="none" style={[
   styles.line,{width:tabWidth,transform:[{translateX:Animated.multiply(position,tabWidth)}]},
 ]}/>;
}
const styles=StyleSheet.create({line:{
 position:"absolute",bottom:0,left:0,height:2,backgroundColor:"#1C1C1E",
}});
