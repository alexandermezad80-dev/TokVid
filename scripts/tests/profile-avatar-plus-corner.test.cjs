const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const profile=fs.readFileSync(path.join(root,"app/(tabs)/profile.tsx"),"utf8");
const brand=fs.readFileSync(path.join(root,"components/reference/BrandAvatar.tsx"),"utf8");

test("APK261: Create-story plus centers on actual 90dp avatar corner, not 104dp wrapper",()=>{
 assert.match(profile,/avatarWrap:\s*\{\s*position:\s*"relative",width:104,height:104,marginBottom:-14,marginRight:-14\s*\}/);
 assert.match(profile,/<BrandAvatar uri=\{avatarUrl\(user,profile\)\} size=\{90\} radius=\{12\} reference\/>/);
 const match=profile.match(/editBadge:\s*\{\s*position:"absolute",bottom:(\d+),right:(\d+),width:(\d+),height:(\d+),borderRadius:(\d+)/);
 assert.ok(match,"Plus placement should be explicit");
 const [bottom,right,width,height,radius]=match.slice(1).map(Number);
 assert.deepEqual([bottom,right,width,height,radius],[4,4,20,20,10]);
 // Right/bottom center = 104 - 4 - 10 = 90dp, equal to the frame edge.
 assert.equal(104-right-width/2,90);
 assert.equal(104-bottom-height/2,90);
 assert.match(profile,/borderWidth:1,borderColor:"#FFFFFF",overflow:"hidden",zIndex:2/);
});
test("APK261: the new placement preserves touch action, gradient, frame, profile geometry",()=>{
 for(const token of [
 'onPress={()=>router.push("/story-create")}',
 'accessibilityLabel="Añadir historia"',
 '<LinearGradient colors={[v.steelDark,v.steelLight]}',
 '<Feather name="plus" size={14} color="#FFF"/>',
 'onPress={()=>router.push({pathname:"/story-viewer",params:{userId:user.id}})}',
 'tileWidth=Math.max(1,(Math.floor(width)-8)/3)',
 'stickyHeaderIndices={[1]}',
 'width:width/6,flex:0',
 'stickySlot:{width:"100%",height:39',
 ])assert.ok(profile.includes(token),"Approved behavior changed: "+token);
 assert.ok(brand.includes("style={{width:size,height:size,borderRadius:radius,padding:1}}"));
 assert.equal((profile.match(/bottom:4,right:4,width:20,height:20/g)||[]).length,1);
});
test("APK261: profile TSX transpiles with zero diagnostics after plus adjustment",()=>{
 const output=ts.transpileModule(profile,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.deepEqual(output.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>String(d.messageText)),[]);
});
