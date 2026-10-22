import React,{useRef} from "react";
import {ActivityIndicator,Animated,PanResponder,StyleSheet,View} from "react-native";

/**
 * The fixed profile header stays outside this component. At scroll offset zero,
 * a downward gesture reveals the blue indicator while the whole profile moves.
 * On release the profile retracts under its header, then its existing data
 * onRefresh callback runs. Other gestures remain owned by the native ScrollView.
 */
export default function ProfilePullRefresh({children,scrollOffsetRef,onRefresh,refreshing}:{
  children:React.ReactNode;
  scrollOffsetRef:React.MutableRefObject<number>;
  onRefresh:()=>void|Promise<void>;
  refreshing:boolean;
}){
  const translation=useRef(new Animated.Value(0)).current;
  const offsetRef=useRef(scrollOffsetRef);offsetRef.current=scrollOffsetRef;
  const refreshCallback=useRef(onRefresh);refreshCallback.current=onRefresh;
  const isBusy=useRef(refreshing);isBusy.current=refreshing;

  const responder=useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture:(_event,gesture)=>
      offsetRef.current.current<=0 && !isBusy.current &&
      gesture.dy>9 && gesture.dy>Math.abs(gesture.dx)*1.35,
    onPanResponderGrant:()=>translation.stopAnimation(),
    onPanResponderMove:(_event,gesture)=>{
      translation.setValue(Math.max(0,Math.min(90,gesture.dy*0.58)));
    },
    onPanResponderRelease:(_event,gesture)=>{
      Animated.timing(translation,{toValue:0,duration:190,useNativeDriver:true}).start();
      if(gesture.dy>=95&&!isBusy.current)void refreshCallback.current();
    },
    onPanResponderTerminate:()=>Animated.timing(translation,{toValue:0,duration:190,useNativeDriver:true}).start(),
    onPanResponderTerminationRequest:()=>false,
  })).current;

  return <View style={styles.root} {...responder.panHandlers}>
    <Animated.View pointerEvents="none" style={[styles.refreshIndicator,{
      opacity:translation.interpolate({inputRange:[0,12,44],outputRange:[0,0.5,1],extrapolate:"clamp"}),
    }]}>
      <ActivityIndicator color="#4B7194" size="small" />
    </Animated.View>
    <Animated.View style={[styles.scrollingContent,{transform:[{translateY:translation}]}]}>
      {children}
    </Animated.View>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,minHeight:0,backgroundColor:"#FFFFFF",overflow:"hidden"},
  refreshIndicator:{position:"absolute",top:8,left:0,right:0,height:40,alignItems:"center",justifyContent:"center"},
  scrollingContent:{flex:1,minHeight:0},
});
