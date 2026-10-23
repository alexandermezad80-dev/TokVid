const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../../artifacts/mobile");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const profile=read("app/(tabs)/profile.tsx"),story=read("app/story-create.tsx"),icons=read("components/TokvidProfileIcon.tsx");
test("A1 protects exact story viewer and story creation routes independently",()=>{
 assert.match(profile,/onPress=\{\(\)=>router\.push\(\{pathname:"\/story-viewer",params:\{userId:user\.id\}\}\)\}/);
 assert.match(profile,/onPress=\{\(\)=>router\.push\("\/story-create"\)\}/);
 assert.match(profile,/accessibilityLabel="Ver mis historias"/);assert.match(profile,/accessibilityLabel="Añadir historia"/);
 assert.match(profile,/onPress=\{\(\)=>router\.push\("\/edit-profile"\)\}/);
 assert.match(profile,/onPress=\{\(\)=>router\.push\("\/user-tools"\)\}/);
});
test("A1 keeps scroll pin and six-slot layout; overlays only appear while pinned",()=>{
 assert.match(profile,/stickyHeaderIndices=\{\[1\]\}/);
 assert.match(profile,/stickySlot:\{width:"100%",height:39/);
 assert.match(profile,/width:width\/6,flex:0/);
 assert.match(profile,/\{filtersPinned&&<>[\s\S]*stickyTopShade[\s\S]*stickyBottomShade/);
 assert.match(profile,/stickyTopShade:\{position:"absolute",top:0/);
 assert.match(profile,/stickyBottomShade:\{position:"absolute",bottom:0/);
 assert.match(profile,/scrollOffsetRef\.current=Math\.max\(0,event\.nativeEvent\.contentOffset\.y\)/);
});
test("A1 grid is 3 full-width tiles with measurable guard against Android rounding",()=>{
 assert.match(profile,/tileWidth=Math\.max\(1,\(Math\.floor\(width\)-8\)\/3\)/);
 assert.equal((profile.match(/<View style=\{\[styles\.grid,\{width\}\]\}>/g)||[]).length,3);
 assert.match(profile,/onPress=\{\(\) => router\.push\(\x60\/saved-feed\?startIndex=/);
 assert.match(profile,/onPress=\{\(\) => router\.push\(\x60\/liked-feed\?startIndex=/);
});
test("A2b approved vectors and protected user tools",()=>{
 assert.match(icons,/type ProfileIconName = "videos" \| "stories" \| "shared"/);
 assert.match(icons,/<Rect x=\{3\.5\}/);
 assert.match(icons,/<Circle cx=\{28\}/);
 assert.match(icons,/<Path d="M17 20 H28/);
 assert.match(profile,/\{key:"shared",icon:"share-2",label:"Compartidos"\}/);
 assert.match(profile,/item\.key==="more"\?router\.push\("\/user-tools"\)/);
 assert.match(profile,/name=\{item\.key\} size=\{22\} color=\{tab===item\.key\?v\.ink:v\.inactive\}/);
});
test("A1 story illustration preserves image/video selection and existing gallery action",()=>{
 assert.match(story,/<TokvidProfileIcon name="stories" size=\{56\}/);
 assert.match(story,/asset\.mediaType === "video" \? "video" : "image"/);
 assert.match(story,/onPress=\{pickStory\}/);
 assert.match(profile,/Comparte tu primera\\nfoto o video/);
});

test("A2b third tab loads shared items rather than own gallery",()=>{
 assert.match(profile,/useMySharedVideos\(user\?\.id,tab==="shared"\)/);
 assert.match(profile,/\{key:"shared",icon:"share-2",label:"Compartidos"\}/);
 assert.match(profile,/tab === "shared" \?/);
 assert.match(profile,/shared\.items\.map\(item=>/);
 assert.match(profile,/shared\.hasMore/);
 assert.match(profile,/onPress=\{\(\)=>void shared\.refresh\(\)\}/);
 assert.match(profile,/onPress=\{\(\)=>void shared\.loadMore\(\)\}/);
 assert.doesNotMatch(profile,/mediaType==="image"/);
 assert.match(profile,/item\.key==="more"\?router\.push\("\/user-tools"\)/);
});
