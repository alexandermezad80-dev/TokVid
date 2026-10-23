const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const code=fs.readFileSync(path.join(root,"hooks/useLocalPublicationDrafts.ts"),"utf8");
const profile=fs.readFileSync(path.join(root,"app/(tabs)/profile.tsx"),"utf8");
const icon=fs.readFileSync(path.join(root,"components/TokvidProfileIcon.tsx"),"utf8");
test("C3 only own private drafts in sixth slot; protected navigations and sticky unchanged",()=>{
 assert.match(profile,/\{key:"drafts",icon:"file-text",label:"Borradores"\}/);
 assert.match(profile,/onPress=\{\(\)=>setTab\(item\.key\)\}/);
 assert.match(profile,/useLocalPublicationDrafts\(user\?\.id,tab==="drafts"\)/);
 assert.match(profile,/stickyHeaderIndices=\{\[1\]\}/);
 assert.match(profile,/width:width\/6,flex:0/);
 assert.match(profile,/height:39/);
 assert.match(profile,/onPress=\{\(\)=>router\.push\("\/user-tools"\)\}/);
 assert.match(profile,/onPress=\{\(\)=>router\.push\("\/edit-profile"\)\}/);
 assert.match(icon,/name==="drafts"/);
});
test("C3 tiles are backed by private file URIs, never published thumbnail service",()=>{
 assert.match(profile,/drafts\.items\.map\(item=><View/);
 assert.match(profile,/item\.thumbnailUri\|\|item\.kind==="image"/);
 assert.match(profile,/source=\{\{uri:item\.thumbnailUri\?\?item\.uri\}\}/);
 assert.match(profile,/pathname:"\/\(tabs\)\/create",params:\{draftId:item\.id\}/);
 assert.match(profile,/\{text:"Cancelar",style:"cancel"\}/);
 assert.match(profile,/\{text:"Eliminar",style:"destructive"/);
 assert.match(profile,/drafts\.remove\(id\)/);
 assert.doesNotMatch(code,/supabase|storage\.from|publishDraft/);
});
test("C3 draft hook never displays another owner's rows while auth changes",()=>{
 assert.match(code,/items:enabled&&owner===userId\?items:\[\]/);
 assert.match(code,/listLocalPublicationDrafts\(userId\)/);
 assert.match(code,/deleteLocalPublicationDraft\(userId,id\)/);
 const js=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 assert.ok(js.includes("listLocalPublicationDrafts"));
});
