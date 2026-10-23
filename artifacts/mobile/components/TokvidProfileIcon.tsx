import React from "react";
import Svg, {Circle,Path,Rect} from "react-native-svg";

/** Vector-only TOKVID proposals: lightweight, no raster images or remote assets. */
type ProfileIconName = "videos" | "stories" | "shared" | "drafts";
export default function TokvidProfileIcon({name,size=22,color="#9AA5AE"}:{
  name:ProfileIconName;size?:number;color?:string;
}){
  return <Svg width={size} height={size} viewBox="0 0 36 36" stroke={color} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round" fill="none">
    {name==="videos"?<>
      <Rect x={3.5} y={4} width={17} height={17} rx={3}/>
      <Rect x={24} y={4} width={8.5} height={10} rx={2.5}/>
      <Rect x={24} y={17.5} width={8.5} height={14.5} rx={2.5}/>
      <Rect x={3.5} y={24.5} width={17} height={7.5} rx={2.5}/>
    </>:name==="stories"?<>
      <Path d="M26 7 A14 14 0 1 0 30 27"/>
      <Path d="M30 10 A14 14 0 0 1 33 19"/>
      <Path d="M15 14 L23 18 L15 22 Z"/>
      <Circle cx={28} cy={5} r={2} fill={color} stroke="none"/>
    </>:name==="drafts"?<>
      <Path d="M22 29 H7 Q5 29 5 27 V6 Q5 4 7 4 H21 L28 11 V17"/>
      <Path d="M21 4 V11 H28"/>
      <Path d="M15 22 L26.5 10.5 Q28 9 29.5 10.5 L31.5 12.5 Q33 14 31.5 15.5 L20 27 L14 29 Z"/>
      <Path d="M24.5 13 L29 17.5"/>
    </>:<>
      <Rect x={4} y={5} width={19} height={22} rx={3}/>
      <Path d="M12 10 H28 Q32 10 32 14 V29 Q32 32 29 32 H15 Q12 32 12 29"/>
      <Path d="M17 20 H28 M24 16 L28 20 L24 24"/>
    </>}
  </Svg>;
}
