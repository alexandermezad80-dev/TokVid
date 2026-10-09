import {useState} from "react";
import {useWindowDimensions,type LayoutChangeEvent} from "react-native";
import {publicationTileSize} from "../lib/features/profile/presentation";
export function usePublicationGrid(){
 const {width}=useWindowDimensions();const [measured,setMeasured]=useState<number|null>(null);
 return {tile:publicationTileSize(measured??width),onLayout:(e:LayoutChangeEvent)=>setMeasured(e.nativeEvent.layout.width)};
}
