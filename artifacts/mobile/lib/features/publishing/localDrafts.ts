import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import {Platform} from "react-native";
import type {PublicationDraft} from "./model";

export type LocalPublicationDraft = PublicationDraft & {
  caption:string;
  createdAt:number;
  updatedAt:number;
};

const KEY_PREFIX="@tokvid:local-publication-drafts:v1:";
const ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIME_EXTENSIONS:Record<string,string>={
  "video/mp4":"mp4", "video/quicktime":"mov",
  "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp",
};
const checkedId=(value:string,label:string)=>{
  if(typeof value!=="string"||!ID_PATTERN.test(value))throw new Error(`Identificador inválido de ${label}.`);
  return value;
};
const root=()=>{
  if(Platform.OS==="web"||!FileSystem.documentDirectory)
    throw new Error("Los borradores locales requieren el almacenamiento privado del teléfono.");
  return FileSystem.documentDirectory.endsWith("/")?FileSystem.documentDirectory:FileSystem.documentDirectory+"/";
};
const ownerFolder=(userId:string)=>`${root()}tokvid-drafts/v1/${checkedId(userId,"cuenta")}/`;
const projectFolder=(userId:string,id:string)=>`${ownerFolder(userId)}${checkedId(id,"borrador")}/`;
const recordKey=(userId:string)=>KEY_PREFIX+checkedId(userId,"cuenta");

/** Reject injected paths or a malformed index instead of disclosing another account's media. */
function isStoredDraft(value:unknown,userId:string):value is LocalPublicationDraft{
  if(!value||typeof value!=="object")return false;
  const d=value as Partial<LocalPublicationDraft>;
  if(typeof d.id!=="string"||!ID_PATTERN.test(d.id)||d.userId!==userId)return false;
  const prefix=projectFolder(userId,d.id);
  if(typeof d.uri!=="string"||!d.uri.startsWith(prefix)||d.uri.includes(".."))return false;
  if(d.thumbnailUri!==undefined&&(typeof d.thumbnailUri!=="string"||!d.thumbnailUri.startsWith(prefix)||d.thumbnailUri.includes("..")))return false;
  if(d.kind!=="video"&&d.kind!=="image")return false;
  if(!d.contentType||MIME_EXTENSIONS[d.contentType]!==d.extension)return false;
  if((d.kind==="video")!==d.contentType.startsWith("video/"))return false;
  if(!Number.isFinite(d.size)||!d.size||d.size<=0)return false;
  if(typeof d.caption!=="string"||typeof d.createdAt!=="number"||typeof d.updatedAt!=="number")return false;
  if(d.uploadedUrl!==undefined||d.thumbnailUrl!==undefined)return false;
  return true;
}
async function readIndex(userId:string):Promise<LocalPublicationDraft[]>{
  const raw=await AsyncStorage.getItem(recordKey(userId));
  if(!raw)return [];
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{throw new Error("El índice de borradores está dañado; no se ha sobrescrito.");}
  if(!Array.isArray(parsed)||!parsed.every(d=>isStoredDraft(d,userId)))
    throw new Error("Los datos de borradores no son válidos; no se ha sobrescrito el almacenamiento.");
  const ids=new Set(parsed.map(d=>d.id));
  if(ids.size!==parsed.length)throw new Error("Índice de borradores duplicado; no se ha sobrescrito.");
  return parsed;
}
let queue:Promise<unknown>=Promise.resolve();
function serialize<T>(work:()=>Promise<T>):Promise<T>{
  const result=queue.then(work,work);
  queue=result.then(()=>undefined,()=>undefined);
  return result;
}
const exists=async(uri:string)=>{
  const info=await FileSystem.getInfoAsync(uri);
  if(!info.exists||info.isDirectory)throw new Error("No encontramos el archivo original del borrador.");
  return info;
};
/** Fetches metadata for only the signed-in account. File verification occurs on opening. */
export async function listLocalPublicationDrafts(userId:string):Promise<LocalPublicationDraft[]>{
  const rows=await readIndex(userId);
  return rows.sort((a,b)=>b.updatedAt-a.updatedAt);
}
/** Never uploads, publishes, or changes the existing publication service. */
export function saveLocalPublicationDraft(draft:PublicationDraft,caption:string):Promise<LocalPublicationDraft>{
  return serialize(async()=>{
    checkedId(draft.userId,"cuenta");checkedId(draft.id,"borrador");
    if(typeof caption!=="string"||caption.length>300)throw new Error("Descripción inválida para el borrador.");
    if(draft.kind!=="video"&&draft.kind!=="image")throw new Error("Formato de borrador desconocido.");
    if(MIME_EXTENSIONS[draft.contentType]!==draft.extension||(draft.kind==="video")!==draft.contentType.startsWith("video/"))
      throw new Error("Tipo de archivo inválido.");
    if(typeof draft.uri!=="string"||!draft.uri.startsWith("file://"))throw new Error("El borrador necesita un archivo local.");
    if(!Number.isFinite(draft.size)||draft.size<=0)throw new Error("Tamaño de borrador inválido.");
    const rows=await readIndex(draft.userId);
    const previous=rows.find(row=>row.id===draft.id);
    const folder=projectFolder(draft.userId,draft.id);
    const version=`${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
    const copied:string[]=[];
    let committed=false;
    try{
      await exists(draft.uri);
      if(draft.thumbnailUri)await exists(draft.thumbnailUri);
      await FileSystem.makeDirectoryAsync(folder,{intermediates:true});
      const mediaUri=`${folder}asset-${version}.${draft.extension}`;
      await FileSystem.copyAsync({from:draft.uri,to:mediaUri});copied.push(mediaUri);
      let coverUri:string|undefined;
      if(draft.thumbnailUri){
        coverUri=`${folder}cover-${version}.jpg`;
        await FileSystem.copyAsync({from:draft.thumbnailUri,to:coverUri});copied.push(coverUri);
      }
      const copyInfo=await exists(mediaUri);
      if(!("size" in copyInfo)||copyInfo.size!==draft.size)throw new Error("No pudimos verificar la copia del borrador.");
      const now=Date.now();
      const saved:LocalPublicationDraft={
        id:draft.id,userId:draft.userId,uri:mediaUri,
        kind:draft.kind,contentType:draft.contentType,extension:draft.extension,size:draft.size,
        ...(coverUri?{thumbnailUri:coverUri}:{}),
        ...(draft.replyCommentId?{replyCommentId:draft.replyCommentId}:{}),
        caption,createdAt:previous?.createdAt??now,updatedAt:now,
      };
      const next=[...rows.filter(row=>row.id!==draft.id),saved];
      await AsyncStorage.setItem(recordKey(draft.userId),JSON.stringify(next));
      committed=true;
      // Best-effort removal of old versions, only after the new index is durable.
      if(previous)for(const old of [previous.uri,previous.thumbnailUri]){
        if(old&&old!==mediaUri&&old!==coverUri){
          try{await FileSystem.deleteAsync(old,{idempotent:true});}
          catch(e){console.warn("TOKVID: borrador anterior pendiente de limpieza",e);}
        }
      }
      return saved;
    }finally{
      if(!committed)for(const path of copied){
        try{await FileSystem.deleteAsync(path,{idempotent:true});}
        catch(e){console.warn("TOKVID: limpieza pendiente después de error de guardado",e);}
      }
    }
  });
}
export async function openLocalPublicationDraft(userId:string,id:string):Promise<LocalPublicationDraft>{
  checkedId(id,"borrador");
  const row=(await readIndex(userId)).find(x=>x.id===id);
  if(!row)throw new Error("No encontramos ese borrador en tu cuenta.");
  await exists(row.uri);
  if(row.thumbnailUri)await exists(row.thumbnailUri);
  return row;
}
export function deleteLocalPublicationDraft(userId:string,id:string):Promise<void>{
  return serialize(async()=>{
    checkedId(id,"borrador");
    const rows=await readIndex(userId);
    const own=rows.find(row=>row.id===id);
    if(!own)throw new Error("No encontramos ese borrador en tu cuenta.");
    await AsyncStorage.setItem(recordKey(userId),JSON.stringify(rows.filter(row=>row.id!==id)));
    // Only the validated owner/id directory can be removed.
    await FileSystem.deleteAsync(projectFolder(userId,id),{idempotent:true});
  });
}
