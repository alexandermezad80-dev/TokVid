import * as FileSystem from "expo-file-system/legacy";
import {supabase,supabaseAnonKey} from "../../../supabase";
import {publicationId} from "../../publishing/model";
import type {Attachment} from "./chat-tools";
export type LocalChatMedia={uri:string;kind:Attachment["kind"];mime:string;duration?:number};
export async function uploadChatMedia(userId:string,conversationId:string,media:LocalChatMedia):Promise<Attachment>{
 const info=await FileSystem.getInfoAsync(media.uri);
 if(!info.exists||!info.size||info.size>50*1024*1024)throw new Error("El archivo debe pesar menos de 50 MB.");
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Vuelve a iniciar sesión.");
 const ext=media.kind==="audio"?"m4a":media.kind==="video"?"mp4":media.mime==="image/png"?"png":"jpg";
 const path=`${conversationId}/${userId}/${publicationId()}.${ext}`;
 const upload=await FileSystem.uploadAsync(supabase.storage.from("chat-media").getPublicUrl(path).data.publicUrl.replace("/storage/v1/object/public/","/storage/v1/object/"),media.uri,{httpMethod:"POST",uploadType:FileSystem.FileSystemUploadType.BINARY_CONTENT,headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabaseAnonKey,"Content-Type":media.mime,"x-upsert":"false"}});
 if(upload.status<200||upload.status>=300)throw new Error("No se pudo subir el archivo. Puedes reintentar.");
 return {path,kind:media.kind,mime:media.mime,duration:media.duration};
}
export async function privateMediaUrl(path:string){const {data,error}=await supabase.storage.from("chat-media").createSignedUrl(path,300);if(error||!data)throw new Error("Archivo no disponible.");return data.signedUrl;}
