import React,{useEffect,useRef} from "react";
import {ActivityIndicator,Animated,PanResponder,StyleSheet,View} from "react-native";

/** A gesture-only refresh surface that never changes the fixed header or tab geometry.
 * Unlike Android RefreshControl it moves the list and reveals a temporary spinner
 * in the newly exposed gap, rather than drawing on top of the first row.
 * Native scrolling, horizontal swipes and ordinary taps remain with children.
 */
export default function PullRefreshUnderHeader({children,scrollOffsetRef,onRefresh,refreshing,enabled=true,color="#4B7194",indicatorTop=8,maxPull=104,triggerDistance=95}:{
 children:React.ReactNode;
 scrollOffsetRef:React.MutableRefObject<number>;
 onRefresh:()=>void|Promise<void>;
 refreshing:boolean;
 enabled?:boolean;
 color?:string;
 indicatorTop?:number;
 maxPull?:number;
 triggerDistance?:number;
}){
 const translation=useRef(new Animated.Value(0)).current;
 const offset=useRef(scrollOffsetRef);offset.current=scrollOffsetRef;
 const callback=useRef(onRefresh);callback.current=onRefresh;
 const active=useRef(refreshing);active.current=refreshing;
 const permitted=useRef(enabled);permitted.current=enabled;
 const maxDistance=useRef(maxPull);maxDistance.current=maxPull;
 const trigger=useRef(triggerDistance);trigger.current=triggerDistance;
 const pulling=useRef(false);
 const pull=useRef(PanResponder.create({
   onMoveShouldSetPanResponderCapture:(_event,g)=>
     permitted.current && !active.current && offset.current.current<=1 &&
     (g.numberActiveTouches??1)===1 && g.dy>12 && g.dy>Math.abs(g.dx)*1.45,
   onPanResponderGrant:()=>{pulling.current=true;translation.stopAnimation();},
   onPanResponderMove:(_event,g)=>{
     translation.setValue(Math.max(0,Math.min(maxDistance.current,g.dy*0.72)));
   },
   onPanResponderRelease:(_event,g)=>{
     pulling.current=false;
     Animated.timing(translation,{toValue:0,duration:220,useNativeDriver:true}).start();
     if(g.dy>=trigger.current && permitted.current && !active.current)void Promise.resolve(callback.current()).catch(()=>{});
   },
   onPanResponderTerminate:()=>{
     pulling.current=false;
     Animated.timing(translation,{toValue:0,duration:220,useNativeDriver:true}).start();
   },
   onPanResponderTerminationRequest:()=>false,
 })).current;
 useEffect(()=>()=>{translation.stopAnimation();},[translation]);
 return <View style={styles.root} {...pull.panHandlers}>
   <Animated.View pointerEvents="none" style={[styles.indicator,{top:indicatorTop,opacity:translation.interpolate({
     inputRange:[0,14,44],outputRange:[0,0.4,1],extrapolate:"clamp",
   })}]}>
     <ActivityIndicator size="small" color={color}/>
   </Animated.View>
   <Animated.View style={[styles.content,{transform:[{translateY:translation}]}]}>{children}</Animated.View>
 </View>;
}
const styles=StyleSheet.create({
 root:{flex:1,minHeight:0,overflow:"hidden"},
 indicator:{position:"absolute",left:0,right:0,height:40,alignItems:"center",justifyContent:"center"},
 content:{flex:1,minHeight:0},
});
