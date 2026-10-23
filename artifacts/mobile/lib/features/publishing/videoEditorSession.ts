import type {PublicationDraft} from "./model";
import type {TrimResult} from "./videoTrimNative";
type Session={key:string;draftId:string;userId:string;uri:string};
type Completed={draftId:string;userId:string;result:TrimResult};
let current:Session|null=null,finished:Completed|null=null;
export function beginVideoEdit(draft:PublicationDraft){
 if(draft.kind!=="video")throw Error("Elige un video.");
 const key=Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
 current={key,draftId:draft.id,userId:draft.userId,uri:draft.uri};finished=null;return key;
}
export function getVideoEdit(key:string,userId?:string){return current?.key===key&&current.userId===userId?current:null;}
export function completeVideoEdit(key:string,userId:string,result:TrimResult){
 const session=getVideoEdit(key,userId);if(!session)return false;
 finished={draftId:session.draftId,userId,result};current=null;return true;
}
export function cancelVideoEdit(key:string){if(current?.key===key)current=null;}
export function takeCompletedVideoEdit(userId?:string){
 if(!finished||finished.userId!==userId)return null;
 const value=finished;finished=null;return value;
}
