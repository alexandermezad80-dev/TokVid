import {useCallback,useRef,useState} from "react";
import {useFocusEffect} from "expo-router";
import {deleteLocalPublicationDraft,listLocalPublicationDrafts,type LocalPublicationDraft} from "../lib/features/publishing/localDrafts";

/** On-demand owner-only draft list; no public feed, no remote storage. */
export function useLocalPublicationDrafts(userId?:string,enabled=false){
  const [items,setItems]=useState<LocalPublicationDraft[]>([]);
  const [owner,setOwner]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const sequence=useRef(0);
  const refresh=useCallback(async()=>{
    if(!userId||!enabled)return;
    const ticket=++sequence.current;
    setLoading(true);setError(null);
    try{
      const rows=await listLocalPublicationDrafts(userId);
      if(sequence.current===ticket){setItems(rows);setOwner(userId);}
    }catch(e){
      if(sequence.current===ticket)setError(e instanceof Error?e.message:"No pudimos cargar tus borradores.");
      throw e;
    }finally{
      if(sequence.current===ticket)setLoading(false);
    }
  },[userId,enabled]);
  useFocusEffect(useCallback(()=>{
    if(userId&&enabled)void refresh().catch(()=>{});
    return ()=>{sequence.current++;};
  },[userId,enabled,refresh]));
  const remove=useCallback(async(id:string)=>{
    if(!userId||!enabled)throw new Error("Debes abrir tus borradores desde tu perfil.");
    await deleteLocalPublicationDraft(userId,id);
    await refresh();
  },[userId,enabled,refresh]);
  return {items:enabled&&owner===userId?items:[],loading:enabled&&loading,error:enabled?error:null,refresh,remove};
}
