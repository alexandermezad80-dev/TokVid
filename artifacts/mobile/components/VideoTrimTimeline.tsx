import React,{useRef,useState} from 'react';
import {PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import {Image} from 'expo-image';
import type {VideoThumbnail} from 'expo-video';
import {clampTime,editorTime} from '../lib/features/publishing/trimTimeline';
import {palette} from '../constants/palette';

type Props={duration:number;start:number;end:number;current:number;frames:VideoThumbnail[];disabled:boolean;onChange:(first:boolean,value:number)=>void;onSeek:(value:number)=>void;onDrag:(dragging:boolean)=>void};
function Handle({first,value,duration,width,disabled,onChange,onDrag}:{first:boolean;value:number;duration:number;width:number;disabled:boolean;onChange:Props['onChange'];onDrag:Props['onDrag']}){
 const latest=useRef({value,duration,width,disabled,onChange,onDrag});latest.current={value,duration,width,disabled,onChange,onDrag};
 const origin=useRef(0);
 const responder=useRef(PanResponder.create({
  onStartShouldSetPanResponder:()=>!latest.current.disabled,
  onPanResponderGrant:()=>{origin.current=latest.current.value;latest.current.onDrag(true);},
  onPanResponderMove:(_,g)=>{const p=latest.current;if(!p.disabled)p.onChange(first,origin.current+g.dx/Math.max(1,p.width)*p.duration);},
  onPanResponderRelease:()=>latest.current.onDrag(false),
  onPanResponderTerminate:()=>latest.current.onDrag(false),
  onPanResponderTerminationRequest:()=>false,
 })).current;
 return <View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={first?'Inicio del fragmento':'Final del fragmento'} accessibilityState={{disabled}} accessibilityValue={{min:0,max:duration,now:value,text:editorTime(value)}} accessibilityActions={[{name:'increment',label:'Avanzar 0.1 segundos'},{name:'decrement',label:'Retroceder 0.1 segundos'}]} onAccessibilityAction={e=>{if(!disabled)onChange(first,value+(e.nativeEvent.actionName==='increment'?0.1:-0.1));}} style={[styles.handle,{left:width*(value/Math.max(duration,0.01))-22}]}><View style={styles.grip}/></View>;
}
export default function VideoTrimTimeline(props:Props){
 const [width,setWidth]=useState(1),{duration,start,end,current,frames,disabled,onChange,onSeek,onDrag}=props;
 const x=(n:number)=>width*clampTime(n/Math.max(duration,0.01),0,1);
 return <View style={styles.outer}>
  <View style={styles.ruler}><Text style={styles.time}>0:00</Text><Text style={styles.time}>{editorTime(duration/2)}</Text><Text style={styles.time}>{editorTime(duration)}</Text></View>
  <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={styles.track}>
   <Pressable disabled={disabled} accessibilityLabel="Buscar posición en el video" style={styles.strip} onPress={e=>onSeek(clampTime(e.nativeEvent.locationX/width*duration,start,end))}>
    {frames.length?frames.map((frame,i)=><Image key={i} source={frame} style={{flex:1,height:'100%'}} contentFit="cover" pointerEvents="none"/>):<View style={styles.placeholder}><Text style={styles.time}>Vista del video</Text></View>}
   </Pressable>
   <View pointerEvents="none" style={[styles.shade,{left:0,width:x(start)}]}/><View pointerEvents="none" style={[styles.shade,{right:0,width:width-x(end)}]}/>
   <View pointerEvents="none" style={[styles.selection,{left:x(start),width:Math.max(0,x(end)-x(start))}]}/>
   <View pointerEvents="none" style={[styles.cursor,{left:x(current)}]}/>
   <Handle first value={start} {...{duration,width,disabled,onChange,onDrag}}/>
   <Handle first={false} value={end} {...{duration,width,disabled,onChange,onDrag}}/>
  </View>
 </View>;
}
const styles=StyleSheet.create({outer:{paddingHorizontal:22,gap:8},ruler:{flexDirection:'row',justifyContent:'space-between'},time:{fontFamily:'Inter_400Regular',fontSize:10,color:palette.secondary},track:{height:64},strip:{flexDirection:'row',height:64,borderRadius:7,overflow:'hidden',backgroundColor:palette.input},placeholder:{flex:1,alignItems:'center',justifyContent:'center'},shade:{position:'absolute',top:0,bottom:0,backgroundColor:'#0008'},selection:{position:'absolute',top:0,bottom:0,borderTopWidth:2,borderBottomWidth:2,borderColor:palette.teal},cursor:{position:'absolute',width:2,top:-4,bottom:-4,backgroundColor:'#FFFFFF',borderWidth:0.5,borderColor:'#526467'},handle:{position:'absolute',top:-4,width:44,height:72,alignItems:'center',justifyContent:'center'},grip:{height:66,width:10,borderRadius:4,backgroundColor:palette.teal,borderWidth:1,borderColor:'#FFFFFF'}});
