const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '../../artifacts/mobile');
const element = (type, props, ...children) => ({type, props: {...props, ...(children.length ? {children} : {})}});
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const flat = value => Array.isArray(value) ? Object.assign({}, ...value.map(flat)) : value || {};
const json = value => JSON.parse(JSON.stringify(value));

function runtime({guest = false, route = '/', inset = 24, visited = false, loading = false, missing = false} = {}) {
  const profile = {id: 'me', username: 'Alexander', bio: 'Biografía', avatar_url: 'photo', likes_count: 2, followers_count: 3, following_count: 4};
  const calls = [], states = [], refs = [], products = [{id: 'video-one', caption: 'Video', mediaType: 'video'}];
  let cursor = 0, refCursor = 0;
  const react = {
    createElement: element, Fragment: 'Fragment', useRef(value){const i=refCursor++;if(!(i in refs))refs[i]={current:value};return refs[i];},
    useCallback: fn => fn, useMemo: fn => fn(), useEffect(){},
    useState(initial) { const i=cursor++; if (!(i in states)) states[i] = visited && i===0 ? (missing ? null : {...profile,id:'other'}) : visited && i===1 ? loading : initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
  };
  const Tabs = 'Tabs', Stack = 'Stack';
  const modules = {
    react,
    'react-native': {Platform:{OS:'android'}, PanResponder:{create:config=>({panHandlers:config})}, StyleSheet:{create:s=>s,flatten:flat,absoluteFill:{position:'absolute'},hairlineWidth:0.5},
      useWindowDimensions:()=>({width:360,height:800,fontScale:1.4}), Alert:{alert:(...args)=>calls.push(['alert',args])},
      ...Object.fromEntries(['View','Text','ScrollView','TouchableOpacity','Pressable','Image','ActivityIndicator','Modal','RefreshControl'].map(x=>[x,x]))},
    'expo-router': {Tabs, Stack, Redirect:'Redirect', usePathname:()=>route, useLocalSearchParams:()=>({userId:'other'}), useFocusEffect(){},
      router:{push:value=>calls.push(['push',json(value)]),dismissTo:value=>calls.push(['dismiss',value]),back:()=>calls.push(['back'])}},
    'react-native-safe-area-context': {useSafeAreaInsets:()=>({top:24,bottom:inset,left:0,right:0}),SafeAreaProvider:'SafeAreaProvider'},
    '@expo/vector-icons': {Feather:'Feather'}, 'expo-linear-gradient': {LinearGradient:'Gradient'},
    'expo-blur':{BlurView:'Blur'}, 'expo-glass-effect':{isLiquidGlassAvailable:()=>false},
    'expo-router/unstable-native-tabs': {NativeTabs:'NativeTabs',Icon:'Icon',Label:'Label'},
    'expo-symbols': {SymbolView:'Symbol'}, 'expo-status-bar':{StatusBar:'StatusBar'},
    '@expo-google-fonts/inter': {useFonts(){},Inter_300Light:'Inter300'},
    '@tanstack/react-query':{QueryClient:class{},QueryClientProvider:'QueryClientProvider'},
    'react-native-gesture-handler':{GestureHandlerRootView:'GestureHandlerRootView'},
    'react-native-keyboard-controller':{KeyboardProvider:'KeyboardProvider'},
  };
  function load(file, extra = '') {
    const exp={};
    const source=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8')+extra,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(source,{exports:exp, require(name){
      if(name.includes('jsx-runtime')) return {jsx:(t,p)=>element(t,p),jsxs:(t,p)=>element(t,p),Fragment:'Fragment'};
      if(name in modules) return modules[name];
      if(name.endsWith('/referenceVisual')) return load('constants/referenceVisual.ts');
      if(name.endsWith('/palette')) return load('constants/palette.ts');
      if(name.endsWith('/ownProfileSwipe')) return load('lib/features/profile/ownProfileSwipe.ts');
      if(name.endsWith('/AuthContext')) return {useAuth:()=>({user:guest?null:{id:'me'},profile,loading:false,refreshProfile(){}})};
      if(name.endsWith('/FollowContext')) return {useFollow:()=>({followedIds:new Set(),loadingIds:new Set(),isFollowing:()=>false})};
      if(name.endsWith('/NotificationsContext')) return {useNotifications:()=>({unreadCount:7})};
      if(name.endsWith('/RegistrationContext')) return {useRegistration:()=>({setTabBarHeight:n=>calls.push(['height',n])})};
      if(name.endsWith('/useSystemNavigation')) return {useSystemNavigation:(...args)=>calls.push(['system',...args])};
      if(name.endsWith('/useMyConnections')) return {useMyConnections:()=>({loading:false,following:[],followers:[],refresh:async()=>{calls.push(['refresh-connections']);}})};
      if(name.endsWith('/usePublishedMedia')) return {usePublishedMedia:()=>({items:products,loading:false,refresh:async()=>{calls.push(['refresh-publications']);}})};
      if(name.endsWith('/useMySharedVideos')) return {useMySharedVideos:()=>({items:products,loading:false,error:null,hasMore:false,refresh:async()=>{calls.push(['refresh-shared']);},loadMore:async()=>{calls.push(['more-shared']);}})};
      if(name.endsWith('/useProfileLikedHistory')) return {useProfileLikedHistory:()=>({items:[],loading:false,hasMore:false,refresh:async()=>{calls.push(['refresh-liked-history']);},loadMore:async()=>{calls.push(['more-liked-history']);}}),mergeLikedProfileItems:(real,legacy)=>[...real,...legacy.filter(v=>!v.isReal)]};
      if(name.endsWith('/useLocalPublicationDrafts')) return {useLocalPublicationDrafts:()=>({items:[{id:'draft-1',userId:'me',kind:'video',uri:'file:///draft.mp4',caption:'Un video propio'}],loading:false,error:null,refresh:async()=>{calls.push(['refresh-drafts']);},remove:async id=>{calls.push(['delete-draft',id]);}})};
      if(name.endsWith('/useSavedVideos')) return {useSavedVideos:()=>({savedVideos:products,refresh:async()=>{calls.push(['refresh-saved']);}})};
      if(name.endsWith('/useVideoFeed')) return {useVideoFeed:()=>({likedVideos:products,refreshLikes:async()=>{calls.push(['refresh-liked']);}})};
      if(name.endsWith('/usePublicationGrid')) return {usePublicationGrid:()=>({onLayout(){},tile:{width:100}})};
      if(name.endsWith('/registrationBridge')) return {requestRegistration:value=>calls.push(['register',json(value)])};
      if(name.endsWith('/private-messages')) return {openPrivateConversation:async id=>{calls.push(['chat',id]);return 'conversation';}};
      if(name.endsWith('/usePushNotifications')) return {usePushNotifications(){}};
      if(name.includes('/components/')) return {__esModule:true,default:path.basename(name),[path.basename(name)]:path.basename(name)};
      if(name.endsWith('/visibility')) return {readProfileVisibility:async()=>({show_likes:false,show_shares:false}),readProfileActivity:async()=>({items:products,hasMore:false})};
       if(name.endsWith('/supabase')) return {supabase:{from:()=>({select:()=>({eq:()=>({single:async()=>({data:{...profile,id:'other'},error:null})})})})}};
       if(name.endsWith('/model')) return {};
      throw Error('Unmocked '+name);
    }});
    return exp;
  }
  return {load,calls,render(Component,props={}){cursor=0;refCursor=0;return Component(props);},set:(i,v)=>{states[i]=v;}};
}

test('every Android tab uses 50dp plus measured inset, with full-width labels and unchanged five routes',()=>{
  for(const guest of [false,true]) for(const route of ['/','/profile','/friends','/inbox','/create','/discover']) for(const inset of [0,16,24,48]) {
    const r=runtime({guest,route,inset});const App=r.load('app/(tabs)/_layout.tsx').default;
    const wrapper=r.render(App),tabs=r.render(wrapper.type),o=tabs.props.screenOptions;
    assert.equal(o.tabBarStyle.height,50+inset);assert.equal(o.tabBarStyle.paddingBottom,inset);
    assert.equal(o.tabBarStyle.backgroundColor,route==='/'?'#000000':'#FFFFFF');
    assert.ok(o.tabBarItemStyle.minHeight-2*o.tabBarItemStyle.paddingVertical>=48);
    assert.equal(o.tabBarLabelStyle.width,'100%');assert.equal(o.tabBarLabelStyle.fontSize,10);
    const screens=nodes(tabs).filter(n=>n.props.name&&n.props.options?.href!==null);
    assert.deepEqual(screens.map(n=>n.props.name),['index','friends','create','inbox','profile']);
    for(const screen of screens){
      if(guest){const e=screen.props.options.tabBarButton();const button=r.render(e.type,e.props);button.props.onPress();assert.equal(flat(button.props.style).flex,1);assert.ok(flat(button.props.style).minHeight>=48);}
      else assert.equal(screen.props.options.tabBarButton,undefined);
    }
    if(guest) assert.equal(r.calls.filter(c=>c[0]==='register').length,5);
    const create=nodes(screens[2].props.options.tabBarIcon({color:'red'}));
    assert.ok(create.some(n=>flat(n.props.style).width===49&&flat(n.props.style).height===30));
    assert.ok(create.some(n=>n.props.name==='plus'&&n.props.size===24));
    assert.equal(create.filter(n=>n.type==='Gradient').length,2);
    for(const n of [screens[0],screens[1],screens[3],screens[4]]) assert.ok(nodes(n.props.options.tabBarIcon({color:'red'})).some(x=>x.props.size===21));
    o.tabBarBackground().props.onLayout({nativeEvent:{layout:{height:50+inset}}});assert.deepEqual(r.calls.at(-1),['height',50+inset]);
  }
});

test('visited-profile footer retains all five exit actions, Create gradients and measured safe area',()=>{
  for(const inset of [0,16,48]) {
    const r=runtime({inset}),tree=r.render(r.load('components/ProfileTabBar.tsx').default),all=nodes(tree);
    assert.equal(flat(tree.props.style).paddingBottom,inset);assert.ok(all.some(n=>flat(n.props.style).height===50));
    const createVisual=all.find(n=>n.type==='View'&&flat(n.props.style).width===49&&flat(n.props.style).height===30);
    assert.ok(createVisual,'Visitor Create visual exists');
    assert.equal(flat(createVisual.props.style).transform[0].translateY,-5);
    assert.equal(flat(createVisual.props.style).marginBottom,4);
    const buttons=all.filter(n=>n.type==='Pressable');assert.equal(buttons.length,5);
    buttons.forEach(b=>{assert.equal(flat(b.props.style).flex,1);b.props.onPress();});
    assert.deepEqual(r.calls.map(c=>c[1]),['/(tabs)','/(tabs)/friends','/(tabs)/create','/(tabs)/inbox','/(tabs)/profile']);
  }
});

test('Android strip matches each tab, with media playback remaining black',()=>{
  for(const route of ['/','/profile','/friends','/inbox','/create','/user-profile','/publication','/saved-feed','/liked-feed','/tag']) {
    const r=runtime({route}),mod=r.load('app/_layout.tsx','\nexport { RootLayoutNav };');r.render(mod.RootLayoutNav);
    const dark=['/','/publication','/saved-feed','/liked-feed','/tag'].includes(route);
    assert.deepEqual(r.calls[0],['system',dark?'#000000':'#FFFFFF',!dark]);
  }
});

test('own profile scrolls its existing details while keeping filters sticky and thumbnail actions intact',()=>{
  const r=runtime(),Profile=r.load('app/(tabs)/profile.tsx').default;let tree=r.render(Profile);
  const scroll=nodes(tree).find(n=>n.type==='ScrollView');assert.deepEqual(Array.from(scroll.props.stickyHeaderIndices),[1]);
  const children=scroll.props.children.flat().filter(Boolean),bar=children[1];assert.equal(flat(bar.props.style).height,39);
  assert.equal(flat(bar.props.style).backgroundColor,'#FFFFFF');assert.equal(flat(bar.props.style).borderTopWidth,undefined);
  assert.equal(flat(bar.props.style).width,360);
  assert.deepEqual(nodes(bar).filter(n=>n.type==='TouchableOpacity').map(n=>flat(n.props.style).width),[60,60,60,60,60,60]);
  assert.equal(flat(bar.props.style).shadowOpacity,0);
  scroll.props.onLayout({nativeEvent:{layout:{height:600}}});
  children[0].props.onLayout({nativeEvent:{layout:{height:210}}});
  tree=r.render(Profile);
  assert.equal(nodes(tree).find(n=>n.type==='ScrollView').props.contentContainerStyle.minHeight,810);
  const sc=nodes(tree).find(n=>n.type==='ScrollView');
  sc.props.onScroll({nativeEvent:{contentOffset:{y:210}}});tree=r.render(Profile);
  const scPinned=nodes(tree).find(n=>n.type==='ScrollView');
  assert.equal(flat(scPinned.props.children.flat().filter(Boolean)[1].props.style).shadowOpacity,0.05);
  assert.ok(nodes(tree).some(n=>n.type==='ProfilePullRefresh'));
  scPinned.props.onScroll({nativeEvent:{contentOffset:{y:0}}});tree=r.render(Profile);
  assert.equal(flat(nodes(tree).find(n=>n.type==='ScrollView').props.children.flat().filter(Boolean)[1].props.style).shadowOpacity,0);
  assert.ok(!nodes(scroll).some(n=>n.type==='ReferenceHeader'));
  assert.ok(nodes(children[0]).some(n=>n.type==='BrandAvatar'));
  nodes(tree).find(n=>n.props.accessibilityLabel==='Abrir publicación: Video').props.onPress();assert.deepEqual(r.calls.at(-1),['push',{pathname:'/publication',params:{id:'video-one'}}]);
  nodes(tree).find(n=>n.props.accessibilityLabel==='Compartidos').props.onPress();tree=r.render(Profile);
  const sharedThumb=nodes(tree).find(n=>n.props.accessibilityLabel==='Abrir video compartido: Video');
  assert.ok(sharedThumb);sharedThumb.props.onPress();assert.deepEqual(r.calls.at(-1),['push',{pathname:'/publication',params:{id:'video-one'}}]);
  nodes(tree).find(n=>n.props.accessibilityLabel==='Borradores').props.onPress();tree=r.render(Profile);
  nodes(tree).find(n=>n.props.accessibilityLabel==='Continuar borrador: Un video propio').props.onPress();
  assert.deepEqual(r.calls.at(-1),['push',{pathname:'/(tabs)/create',params:{draftId:'draft-1'}}]);
  nodes(tree).find(n=>n.props.accessibilityLabel==='Eliminar borrador: Un video propio').props.onPress();
  const dialog=r.calls.find(c=>c[0]==='alert'&&c[1][0]==='Eliminar borrador');
  assert.ok(dialog); assert.equal(dialog[1][2].find(x=>x.text==='Eliminar').style,'destructive');
  nodes(tree).find(n=>n.props.accessibilityLabel==='Guardados').props.onPress();tree=r.render(Profile);
  const saved=nodes(tree).find(n=>n.type==='TouchableOpacity'&&nodes(n).some(c=>c.type==='PublicationThumbnail'));
  saved.props.onPress();assert.deepEqual(r.calls.at(-1),['push','/saved-feed?startIndex=0&videoId=video-one']);
  nodes(tree).find(n=>n.props.accessibilityLabel==='Me gusta').props.onPress();tree=r.render(Profile);
  nodes(tree).find(n=>n.type==='TouchableOpacity'&&nodes(n).some(c=>c.type==='PublicationThumbnail')).props.onPress();assert.deepEqual(r.calls.at(-1),['push','/liked-feed?startIndex=0&videoId=video-one']);
});

test('visited profile keeps its footer below a flexible body during loading, failure and content',async()=>{
  for(const state of [{loading:true},{missing:true},{}]) {
    const r=runtime({visited:true,...state}),tree=r.render(r.load('app/user-profile.tsx').default),all=nodes(tree);
    const body=all.find(n=>n.props.testID==='visited-profile-body');assert.equal(flat(body.props.style).flex,1);
    assert.ok(all.some(n=>n.type==='ProfileTabBar'));const scroll=all.find(n=>n.type==='ScrollView');
    if(state.loading||state.missing){assert.equal(scroll,undefined);continue;}
    assert.deepEqual(Array.from(scroll.props.stickyHeaderIndices),[1]);assert.ok(!nodes(scroll).some(n=>n.type==='ReferenceHeader'));
    assert.equal(flat(scroll.props.children.flat().filter(Boolean)[1].props.style).height,39);
    assert.equal(flat(scroll.props.children.flat().filter(Boolean)[1].props.style).width,360);
    assert.deepEqual(nodes(scroll.props.children.flat().filter(Boolean)[1]).filter(n=>n.type==='TouchableOpacity').map(n=>flat(n.props.style).width),[120]);
    assert.ok(nodes(scroll.props.children.flat().filter(Boolean)[1]).some(n=>n.type==='TokvidProfileIcon'&&n.props.name==='videos'));
    scroll.props.onLayout({nativeEvent:{layout:{height:580}}});
    scroll.props.children.flat().filter(Boolean)[0].props.onLayout({nativeEvent:{layout:{height:180}}});
    const rerendered=r.render(r.load('app/user-profile.tsx').default);
    assert.equal(nodes(rerendered).find(n=>n.type==='ScrollView').props.contentContainerStyle.minHeight,760);
    const sc=nodes(rerendered).find(n=>n.type==='ScrollView');
    sc.props.onScroll({nativeEvent:{contentOffset:{y:180}}});
    const scPinned=nodes(r.render(r.load('app/user-profile.tsx').default)).find(n=>n.type==='ScrollView');
    assert.equal(flat(scPinned.props.children.flat().filter(Boolean)[1].props.style).shadowOpacity,0.05);
    assert.ok(nodes(r.render(r.load('app/user-profile.tsx').default)).some(n=>n.type==='ProfilePullRefresh'));
    all.find(n=>n.type==='TouchableOpacity'&&nodes(n).some(c=>c.type==='PublicationThumbnail')).props.onPress();assert.deepEqual(r.calls.at(-1),['push',{pathname:'/publication',params:{id:'video-one'}}]);
    all.find(n=>n.type==='TouchableOpacity'&&nodes(n).some(c=>c.type==='Text'&&[c.props.children].flat().includes('Mensajes'))).props.onPress();
    await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(r.calls.at(-1),['push','/chat?conversationId=conversation&otherUserId=other&otherUsername=Alexander&otherAvatar=photo']);
  }
});

test('white shared headers retain dimensions, safe top and children without translucent overlays',()=>{
  const r=runtime(),Header=r.load('components/reference/ReferenceHeader.tsx').default;
  const v=r.load('constants/referenceVisual.ts');
  for(const variant of Object.keys(v.referenceHeaders)){
    const child=element('Control',{onPress(){}}),tree=r.render(Header,{variant,children:child}),all=nodes(tree);
    assert.equal(flat(tree.props.style).backgroundColor,'#FFFFFF');assert.ok(flat(tree.props.style).paddingTop>=32);
    assert.ok(all.some(n=>flat(n.props.style).height===v.referenceHeaders[variant].height));
    assert.ok(all.includes(child));assert.ok(!all.some(n=>n.type==='Gradient'));
  }
  const Surface=r.load('components/reference/HeaderSurface.tsx').default;
  const tree=r.render(Surface,{safeTop:true,style:{height:76,paddingTop:8},children:'Title'});
  assert.equal(flat(tree.props.style).paddingTop,32);assert.equal(flat(tree.props.style).height,76);assert.equal(flat(tree.props.style).backgroundColor,'#FFFFFF');
});

test('pull-to-refresh updates own real sources without changing tabs or navigation',async()=>{
  const r=runtime(),Profile=r.load('app/(tabs)/profile.tsx').default;
  let tree=r.render(Profile),scroll=nodes(tree).find(n=>n.type==='ScrollView');
  assert.equal(nodes(tree).find(n=>n.type==='ProfilePullRefresh').props.refreshing,false);
  await nodes(tree).find(n=>n.type==='ProfilePullRefresh').props.onRefresh();
  assert.ok(r.calls.some(c=>c[0]==='refresh-connections'));
  assert.ok(r.calls.some(c=>c[0]==='refresh-publications'));
  nodes(tree).find(n=>n.props.accessibilityLabel==='Guardados').props.onPress();
  tree=r.render(Profile);scroll=nodes(tree).find(n=>n.type==='ScrollView');
  await nodes(tree).find(n=>n.type==='ProfilePullRefresh').props.onRefresh();
  assert.ok(r.calls.some(c=>c[0]==='refresh-saved'));
  nodes(tree).find(n=>n.props.accessibilityLabel==='Me gusta').props.onPress();
  tree=r.render(Profile);scroll=nodes(tree).find(n=>n.type==='ScrollView');
  await nodes(tree).find(n=>n.type==='ProfilePullRefresh').props.onRefresh();
  assert.ok(r.calls.some(c=>c[0]==='refresh-liked'));
});
test('pull-to-refresh in visited profile preserves its sticky row and footer',async()=>{
  const r=runtime({visited:true}),Profile=r.load('app/user-profile.tsx').default;
  let tree=r.render(Profile),scroll=nodes(tree).find(n=>n.type==='ScrollView');
  await nodes(tree).find(n=>n.type==='ProfilePullRefresh').props.onRefresh();
  tree=r.render(Profile);
  scroll=nodes(tree).find(n=>n.type==='ScrollView');
  assert.deepEqual(Array.from(scroll.props.stickyHeaderIndices),[1]);
  assert.equal(nodes(tree).filter(n=>n.type==='ProfileTabBar').length,1);
  assert.equal(nodes(tree).find(n=>n.type==='ProfilePullRefresh').props.refreshing,false);
  assert.ok(r.calls.some(c=>c[0]==='refresh-publications'));
});

test('B1 owner-profile horizontal gestures change six tabs; vertical gestures and taps remain separate',()=>{
 const r=runtime(),Profile=r.load('app/(tabs)/profile.tsx').default;
 const sections=['Videos','Historias','Compartidos','Me gusta','Guardados','Borradores'];
 for(let index=0;index<sections.length;index++){
  let tree=r.render(Profile);
  const selected=nodes(tree).filter(n=>n.props.accessibilityState?.selected===true);
  assert.equal(selected.length,1);assert.equal(selected[0].props.accessibilityLabel,sections[index]);
  assert.deepEqual(Array.from(nodes(tree).find(n=>n.type==='ScrollView').props.stickyHeaderIndices),[1]);
  const gesture=nodes(tree).find(n=>typeof n.props.onMoveShouldSetPanResponder==='function');
  assert.ok(gesture);
  assert.equal(gesture.props.onMoveShouldSetPanResponder({}, {dx:-9,dy:0}),false);
  assert.equal(gesture.props.onMoveShouldSetPanResponder({}, {dx:-55,dy:70}),false);
  assert.equal(gesture.props.onMoveShouldSetPanResponder({}, {dx:-85,dy:3}),true);
  gesture.props.onPanResponderRelease({}, {dx:-85,dy:3});
 }
 let tree=r.render(Profile);
 assert.equal(nodes(tree).filter(n=>n.props.accessibilityState?.selected===true)[0].props.accessibilityLabel,'Borradores');
 let gesture=nodes(tree).find(n=>typeof n.props.onMoveShouldSetPanResponder==='function');
 gesture.props.onPanResponderRelease({}, {dx:-85,dy:3});
 tree=r.render(Profile);
 assert.equal(nodes(tree).filter(n=>n.props.accessibilityState?.selected===true)[0].props.accessibilityLabel,'Borradores');
 gesture=nodes(tree).find(n=>typeof n.props.onMoveShouldSetPanResponder==='function');
 gesture.props.onPanResponderRelease({}, {dx:85,dy:0});
 tree=r.render(Profile);
 assert.equal(nodes(tree).filter(n=>n.props.accessibilityState?.selected===true)[0].props.accessibilityLabel,'Guardados');
 nodes(tree).find(n=>n.props.accessibilityLabel==='Compartidos').props.onPress();
 tree=r.render(Profile);
 assert.equal(nodes(tree).filter(n=>n.props.accessibilityState?.selected===true)[0].props.accessibilityLabel,'Compartidos');
});
