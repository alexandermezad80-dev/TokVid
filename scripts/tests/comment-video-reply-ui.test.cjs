const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../../artifacts/mobile');
const el=(type,props)=>({type,props});const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const tick=()=>new Promise(r=>setImmediate(r));
function harness(replyCommentId){
 const slots=[];let cursor=0,effects=[],dirty=false,output;const calls={picked:[],published:[],target:[]};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const hooks={useState:v=>{const i=cursor++;slots[i]??={value:v};return[slots[i].value,v=>{if(!Object.is(v,slots[i].value)){slots[i].value=typeof v==='function'?v(slots[i].value):v;dirty=true;}}];},useRef:v=>slots[cursor++]??={current:v},useCallback:(fn)=>fn,useEffect:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps)){slots[i]={deps};effects.push(fn);}}};
 const player={pause(){},play(){}};const user={id:'me'};const native=Object.fromEntries(['ActivityIndicator','Alert','Image','KeyboardAvoidingView','Pressable','ScrollView','Text','TextInput','View'].map(x=>[x,x]));native.StyleSheet={create:x=>x};native.Platform={OS:'android'};
 const modules={react:{...hooks,default:{createElement:el}},'react-native':native,'@expo/vector-icons':{Feather:'Icon'},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:24,bottom:24})},'expo-camera':{CameraView:'Camera',useCameraPermissions:()=>[{},()=>{}],useMicrophonePermissions:()=>[{},()=>{}]},'expo-image-picker':{launchImageLibraryAsync:async options=>{calls.picked.push(options);return{canceled:false,assets:[{uri:'file:///clip.mp4',type:'video',duration:1000}]};}},'expo-image-manipulator':{},'expo-file-system/legacy':{getInfoAsync:async()=>({exists:true,size:2000})},'expo-linear-gradient':{LinearGradient:'Gradient'},'expo-router':{router:{replace(){},push(){}},useFocusEffect(){}},'expo-video':{useVideoPlayer:()=>player,VideoView:'Video'},'../../context/AuthContext':{useAuth:()=>({user,profile:{username:'Me'},requireAuth:async()=>user})},'../../constants/palette':{palette:{}},'../../components/reference/HeaderSurface':{__esModule:true,default:'Header'},'../../lib/supabase':{supabase:{}},'../../lib/videoTags':{saveVideoTags:async()=>{}},'../../lib/features/publishing/model':{publicationId:()=> 'new-post',validateMedia:()=>({kind:'video',contentType:'video/mp4',extension:'mp4',size:2000})},'../../lib/features/publishing/service':{publishDraft:async(_client,draft)=>{calls.published.push(draft);return draft.id;}},'../../lib/features/publishing/nativeUpload':{},'../../lib/features/comments/videoReply':{readVideoReplyTarget:async(_client,id)=>{calls.target.push(id);return{id,username:'Marian',video_id:'original',text:'Pregunta'};}}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'app/(tabs)/create.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n.includes('jsx-runtime')?{jsx:el,jsxs:el}:modules[n]});
 function render(){for(let i=0;i<6;i++){cursor=0;effects=[];dirty=false;output=exports.PublicationComposer({replyCommentId});effects.forEach(f=>f());if(!dirty)return output;}return output;}
 return{calls,render,nodes:()=>nodes(output)};
}
test('video reply creation selects only video and publishes the selected original comment id',async()=>{
 const h=harness('original-comment');h.render();await tick();h.render();
 const gallery=h.nodes().find(n=>n.props.accessibilityLabel==='Elegir video de galería');assert.equal(gallery.props.disabled,false);gallery.props.onPress();await tick();h.render();
 assert.deepEqual(Array.from(h.calls.picked[0].mediaTypes),['videos']);assert.deepEqual(h.calls.target,['original-comment']);
 h.nodes().find(n=>n.props.accessibilityLabel==='Publicar').props.onPress();await tick();h.render();assert.equal(h.calls.published[0].replyCommentId,'original-comment');
});
test('ordinary creation keeps photos and videos without reading or linking a comment',async()=>{
 const h=harness();h.render();await tick();h.render();h.nodes().find(n=>n.props.accessibilityLabel==='Elegir foto o video de galería').props.onPress();await tick();h.render();
 assert.deepEqual(Array.from(h.calls.picked[0].mediaTypes),['videos','images']);h.nodes().find(n=>n.props.accessibilityLabel==='Publicar').props.onPress();await tick();
 assert.equal(h.calls.published[0].replyCommentId,undefined);assert.equal(h.calls.target.length,0);
});
