import React,{useId} from 'react';
import Svg,{Defs,LinearGradient,RadialGradient,Rect,Stop} from 'react-native-svg';

/** Responsive colour fields, not a stretched or cropped bitmap. */
export default function AuroraWallpaper(){
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const base=`aurora-${id}-base`,mint=`aurora-${id}-mint`,lilac=`aurora-${id}-lilac`,peach=`aurora-${id}-peach`,light=`aurora-${id}-light`;
 return <Svg width="100%" height="100%" accessible={false}>
  <Defs>
   <LinearGradient id={base} x1="0%" y1="0%" x2="100%" y2="100%">
    <Stop offset="0" stopColor="#F0F0F5"/><Stop offset="0.5" stopColor="#EDE6F0"/><Stop offset="1" stopColor="#F4E8DD"/>
   </LinearGradient>
   <RadialGradient id={mint} cx="3%" cy="36%" rx="82%" ry="64%">
    <Stop offset="0" stopColor="#B8D9D3" stopOpacity={0.85}/><Stop offset="1" stopColor="#B8D9D3" stopOpacity={0}/>
   </RadialGradient>
   <RadialGradient id={lilac} cx="87%" cy="7%" rx="75%" ry="60%">
    <Stop offset="0" stopColor="#BDB7D9" stopOpacity={0.75}/><Stop offset="1" stopColor="#BDB7D9" stopOpacity={0}/>
   </RadialGradient>
   <RadialGradient id={peach} cx="98%" cy="90%" rx="85%" ry="72%">
    <Stop offset="0" stopColor="#EAC7B3" stopOpacity={0.6}/><Stop offset="1" stopColor="#EAC7B3" stopOpacity={0}/>
   </RadialGradient>
   <LinearGradient id={light} x1="0%" y1="30%" x2="100%" y2="65%">
    <Stop offset="0.24" stopColor="#FFFFFF" stopOpacity={0}/><Stop offset="0.39" stopColor="#FFFFFF" stopOpacity={0.16}/><Stop offset="0.49" stopColor="#FFFFFF" stopOpacity={0}/><Stop offset="0.62" stopColor="#FFFFFF" stopOpacity={0.16}/><Stop offset="0.8" stopColor="#FFFFFF" stopOpacity={0}/>
   </LinearGradient>
  </Defs>
  {[base,mint,lilac,peach,light].map(fill=><Rect key={fill} width="100%" height="100%" fill={`url(#${fill})`}/>)}
 </Svg>;
}
