import React from "react";
import {Animated,StyleSheet,View} from "react-native";

/** Display the existing page and just the nearby previews.
 * The main page retains intrinsic height in a profile and fills its container in Inbox.
 * Inactive previews never intercept presses; no approved page action is duplicated.
 */
export default function HorizontalSwipePages<T extends string>({sections,active,center,position,width,renderPage,fill=false}:{
 sections:readonly T[];
 active:T;
 center:T;
 position:Animated.Value;
 width:number;
 renderPage:(page:T)=>React.ReactNode;
 fill?:boolean;
}){
 const activeIndex=sections.indexOf(active),centerIndex=sections.indexOf(center);
 const translateX=Animated.add(activeIndex*width,Animated.multiply(position,-width));
 return <View style={[styles.clip,{width},fill&&styles.fill]}>
   <Animated.View style={[{width},fill&&styles.fill,{transform:[{translateX}]}]}>
     <View style={[{width},fill&&styles.fill]}>{renderPage(active)}</View>
     {sections.map((section,index)=>
       index!==activeIndex&&Math.abs(index-centerIndex)<=1?
         <View key={section} pointerEvents="none" style={[styles.adjacent,{left:(index-activeIndex)*width,width},fill&&styles.fullHeight]}>
           {renderPage(section)}
         </View>:null)}
   </Animated.View>
 </View>;
}
const styles=StyleSheet.create({
 clip:{overflow:"hidden"},
 fill:{flex:1,minHeight:0},
 adjacent:{position:"absolute",top:0},
 fullHeight:{height:"100%"},
});
