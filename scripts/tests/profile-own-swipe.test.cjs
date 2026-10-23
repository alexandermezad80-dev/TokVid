const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm");
const src=fs.readFileSync(path.resolve(__dirname,"../../artifacts/mobile/lib/features/profile/ownProfileSwipe.ts"),"utf8");
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={};vm.runInNewContext(js,{exports:mod});
test("B1 gesture needs horizontal priority over vertical drag or tap",()=>{
 for(const [dx,dy] of [[0,0],[9,0],[25,25],[-20,-16],[90,90],[NaN,0],[Infinity,0]])assert.equal(mod.isOwnProfileHorizontalMove(dx,dy),false);
 for(const [dx,dy] of [[16,0],[-18,0],[-85,3],[70,12]])assert.equal(mod.isOwnProfileHorizontalMove(dx,dy),true);
});
test("B1 changing tabs never skips a section or leaves endpoints",()=>{
 const keys=Array.from(mod.OWN_PROFILE_TABS);
 assert.deepEqual(keys,["videos","stories","shared","liked","saved","drafts"]);
 for(let i=0;i<keys.length;i++){
  assert.equal(mod.adjacentOwnProfileTab(keys[i],-110,3),keys[Math.min(5,i+1)]);
  assert.equal(mod.adjacentOwnProfileTab(keys[i],110,3),keys[Math.max(0,i-1)]);
  assert.equal(mod.adjacentOwnProfileTab(keys[i],-45,2),keys[i]);
  assert.equal(mod.adjacentOwnProfileTab(keys[i],-130,135),keys[i]);
  assert.equal(mod.adjacentOwnProfileTab(keys[i],0,0),keys[i]);
 }
});
