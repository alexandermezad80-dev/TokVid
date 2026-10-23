import {useCallback,useRef,useState} from "react";
import {useFocusEffect} from "expo-router";
import {readProfileActivity} from "../lib/features/profile/visibility";
import type {VideoItem} from "./useVideoFeed";

const PAGE_SIZE=60;
/** Preserve already-liked placeholders until real content is verified and approved.
 * For persisted publications the user's actual like history is authoritative.
 */
export function mergeLikedProfileItems(real:VideoItem[],feedLiked:VideoItem[]):VideoItem[]{
  const known=new Set(real.map(item=>item.id));
  return [...real,...feedLiked.filter(item=>!item.isReal&&!known.has(item.id))];
}
export function useProfileLikedHistory(userId?:string,enabled=false){
  const [items,setItems]=useState<VideoItem[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [hasMore,setHasMore]=useState(false);
  const offset=useRef(0);
  const busy=useRef(false);
  const seq=useRef(0);
  const fetchPage=useCallback(async(append=false)=>{
    if(!userId||!enabled||(append&&busy.current))return;
    const request=++seq.current;
    busy.current=true;setLoading(true);setError(null);
    const start=append?offset.current:0;
    try{
      const page=await readProfileActivity(userId,"liked",start);
      if(seq.current!==request)return;
      setItems(current=>append?[...new Map([...current,...page.items].map(v=>[v.id,v])).values()]:page.items);
      // Page size is based on LIKE EVENTS, not viewable RLS-filtered media.
      offset.current=start+PAGE_SIZE;
      setHasMore(page.hasMore);
    }catch{
      if(seq.current===request)setError("No se pudieron cargar tus Me gusta.");
    }finally{
      if(seq.current===request){busy.current=false;setLoading(false);}
    }
  },[userId,enabled]);
  const refresh=useCallback(()=>fetchPage(false),[fetchPage]);
  const loadMore=useCallback(()=>fetchPage(true),[fetchPage]);
  useFocusEffect(useCallback(()=>{
    setItems([]);offset.current=0;setHasMore(false);setError(null);
    if(userId&&enabled)void fetchPage();
    return ()=>{seq.current++;busy.current=false;};
  },[userId,enabled,fetchPage]));
  return {items,loading,error,hasMore,refresh,loadMore};
}
