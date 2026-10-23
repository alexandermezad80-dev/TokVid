import {NativeModules,Platform} from "react-native";
export type TrimResult={uri:string;size:number;durationMs:number};
const get=()=>{
 if(Platform.OS!=="android"||!NativeModules.TokvidVideoTrimmer)throw Error("Recorte no disponible en este dispositivo.");
 return NativeModules.TokvidVideoTrimmer as {inspect(uri:string):Promise<{durationMs:number}>;trim(uri:string,a:number,b:number):Promise<TrimResult>;cancelTrim():void};
};
export const inspectVideo=(uri:string)=>get().inspect(uri);
export const cancelTrim=()=>{if(Platform.OS==="android")NativeModules.TokvidVideoTrimmer?.cancelTrim();};
export async function exportTrim(uri:string,start:number,end:number){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end-start<500||end>180000)throw Error("Intervalo inválido.");
 const r=await get().trim(uri,start,end);
 if(!r||!r.uri?.startsWith("file://")||!(r.size>0&&r.size<=250*1024*1024)||!(r.durationMs>0&&r.durationMs<=180000))
  throw Error("No se validó el archivo exportado.");
 return r;
}
