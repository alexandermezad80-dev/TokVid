const test=require("node:test"),assert=require("node:assert/strict"),ts=require("typescript"),
fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const file=path.resolve(__dirname,"../../artifacts/mobile/hooks/useMySharedVideos.ts");
const code=fs.readFileSync(file,"utf8");
test("owner's shared history excludes photographs and owner's own publications",()=>{
 const output=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exp={};
 vm.runInNewContext(output,{exports:exp,require(name){
   if(name==="react")return {useCallback:f=>f,useRef:n=>({current:n}),useState:v=>[v,()=>{}]};
   if(name==="expo-router")return {useFocusEffect:()=>{}};
   if(name.includes("/visibility"))return {readProfileActivity:async()=>({items:[],hasMore:false})};
   throw Error("Unexpected dependency "+name);
 }});
 const items=[
 {id:"foreign-video",mediaType:"video",creatorId:"other"},
 {id:"foreign-photo",mediaType:"image",creatorId:"other"},
 {id:"self-video",mediaType:"video",creatorId:"me"},
 {id:"self-photo",mediaType:"image",creatorId:"me"}];
 assert.deepEqual(Array.from(exp.onlySharedVideosByOthers(items,"me"),v=>v.id),["foreign-video"]);
 assert.match(code,/readProfileActivity\(userId,"shared",start\)/);
 assert.match(code,/offset\.current=start\+SHARE_PAGE_SIZE/);
 assert.match(code,/return \{items,loading,error,hasMore,refresh:\(\)=>fetchPage\(\),loadMore:\(\)=>fetchPage\(true\)\}/);
});
