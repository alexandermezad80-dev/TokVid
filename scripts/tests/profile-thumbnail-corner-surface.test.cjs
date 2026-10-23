const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const own=fs.readFileSync(path.join(root,"app/(tabs)/profile.tsx"),"utf8");
const poster=fs.readFileSync(path.join(root,"components/PublicationThumbnail.tsx"),"utf8");
const visitor=fs.readFileSync(path.join(root,"app/user-profile.tsx"),"utf8");
test("APK261 corner repair: white canvas behind rounded thumbnails in four real-media profile tabs",()=>{
 assert.match(own,/publishedTileSurface:\{backgroundColor:v\.white\}/);
 assert.equal((own.match(/styles\.publishedTileSurface/g)||[]).length,4);
 for(const marker of [
   "savedVideos.map((v, idx)",
   "shared.items.map(item=>",
   "likedVideos.map((v, idx)",
   "publications.items.map(item =>",
 ])assert.ok(own.includes(marker),"Original media tab missing: "+marker);
 assert.match(own,/savedVideos\.map\([\s\S]*?styles\.publishedTileSurface/);
 assert.match(own,/shared\.items\.map\([\s\S]*?styles\.publishedTileSurface/);
 assert.match(own,/likedVideos\.map\([\s\S]*?styles\.publishedTileSurface/);
 assert.match(own,/publications\.items\.map\([\s\S]*?styles\.publishedTileSurface/);
});
test("APK261 corner repair: keep original draft fallback and grid geometry, corners and overlays",()=>{
 assert.match(own,/drafts\.items\.map\(item=><View key=\{item\.id\} style=\{\[styles\.gridItem,gridLayout\.tile\]\}>/);
 assert.match(own,/gridItem:\s*\{\s*aspectRatio:\s*0\.75, borderRadius:\s*0,\s*backgroundColor:\s*"#111",\s*overflow:\s*"hidden"/);
 assert.match(own,/tileWidth=Math\.max\(1,\(Math\.floor\(width\)-8\)\/3\)/);
 assert.match(own,/grid:\s*\{[^}]*gap:\s*2, paddingHorizontal:\s*0, paddingVertical:\s*2/);
 assert.match(own,/stickyHeaderIndices=\{\[1\]\}/);
 assert.match(own,/width:width\/6,flex:0/);
 assert.match(poster,/padding: 1, borderRadius: 10/);
 assert.match(poster,/flex:1,borderRadius:9,overflow:"hidden",backgroundColor:"#181E28"/);
 assert.match(poster,/style=\{StyleSheet\.absoluteFill\} resizeMode="cover"/);
 assert.match(poster,/backgroundColor: "#00000055"/);
});
test("APK261 corner repair: no Feed, original thumbnail component or visited-profile modification",()=>{
 assert.match(visitor,/<PublicationThumbnail item=\{v\}\/>/);
 assert.match(visitor,/gridItem:\{aspectRatio:\.75,borderRadius:8,overflow:'hidden'\}/);
 assert.ok(!poster.includes("publishedTileSurface"));
 assert.ok(!visitor.includes("publishedTileSurface"));
 assert.equal((own.match(/<PublicationThumbnail item=/g)||[]).length,4);
});
