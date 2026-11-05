import {useCallback,useRef,useState} from "react";
import {useFocusEffect} from "expo-router";
import {readProfileActivity,removeSharedReference} from "../lib/features/profile/visibility";
import type {VideoItem} from "./useVideoFeed";

const SHARE_PAGE_SIZE=60; // Public RPC paginates activity events, not displayed items.

/** Videos by others, plus active stories by any author. Likes never create a reference. */
export function onlySharedVideosByOthers(items:VideoItem[],userId:string):VideoItem[]{
  return items.filter(item=>!!item.storyId || (item.mediaType==="video" && item.creatorId!==userId));
}

export function useMySharedVideos(userId?:string,enabled=false){
  const [items,setItems]=useState<VideoItem[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [hasMore,setHasMore]=useState(false);
  const offset=useRef(0);
  const sequence=useRef(0);
  const busy=useRef(false);
  const fetchPage=useCallback(async(append=false)=>{
    if(!userId||!enabled||(append&&busy.current))return;
    const request=++sequence.current;
    busy.current=true;setLoading(true);setError(null);
    const start=append?offset.current:0;
    try{
      // Reuse existing share history, authenticated access and publication RLS.
      const page=await readProfileActivity(userId,"shared",start);
      if(sequence.current!==request)return;
      const videos=onlySharedVideosByOthers(page.items,userId);
      setItems(old=>append?[...new Map([...old,...videos].map(item=>[(item.storyId?'story:':'video:')+item.id,item])).values()]:videos);
      offset.current=start+SHARE_PAGE_SIZE;
      setHasMore(page.hasMore);
    }catch{
      if(sequence.current===request)setError("No se pudieron cargar tus videos compartidos.");
    }finally{
      if(sequence.current===request){busy.current=false;setLoading(false);}
    }
  },[userId,enabled]);
  useFocusEffect(useCallback(()=>{
    setItems([]);offset.current=0;setHasMore(false);setError(null);
    if(userId&&enabled)void fetchPage();
    return ()=>{sequence.current++;busy.current=false;};
  },[userId,enabled,fetchPage]));
  const remove=async(item:VideoItem)=>{
    await removeSharedReference(item);
    sequence.current++;busy.current=false;setLoading(false);
    setItems(old=>old.filter(current=>current.id!==item.id||!!current.storyId!==!!item.storyId));
  };
  return {items,loading,error,hasMore,remove,refresh:()=>fetchPage(),loadMore:()=>fetchPage(true)};
}
