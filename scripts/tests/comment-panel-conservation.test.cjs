const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, flatten } = require('./helpers/comments-panel-harness.cjs');
const findLabel = (h, label) => h.nodes().find(n => n.props?.accessibilityLabel === label);
const tick = async () => { await new Promise(resolve => setImmediate(resolve)); };
const own = { id: 'own', video_id: 'video', user_id: 'me', username: 'Alexander', text: 'Original', created_at: '2026-10-18T00:00:00Z', parent_id: null, root_id: null, likes_count: 2, reply_count: 0, deleted_at: null };

test('closed/open native editor retains draft and quick emojis; confirmed send clears and dismisses', async () => {
  const h = harness(); h.render();
  h.input().props.onChangeText('Hola'); h.render();
  h.openKeyboard();
  assert.equal(h.input().props.value, 'Hola');
  findLabel(h, 'Añadir emoji ❤️ al comentario').props.onPress(); h.render();
  assert.equal(h.input().props.value, 'Hola❤️');
  h.openKeyboard(400);
  assert.equal(h.input().props.value, 'Hola❤️');
  assert.equal(h.nodes().filter(n => n.type === 'TextInput').length, 1);
  findLabel(h, 'Publicar comentario').props.onPress(); await tick(); h.render();
  assert.deepEqual(h.calls.publish.map(a => Array.from(a).slice(0,2)), [['Hola❤️', null]]);
  assert.equal(h.input().props.value, ''); assert.equal(h.calls.blur, 1); assert.equal(h.calls.dismiss, 1);
});
test('failed send restores draft after immediate keyboard dismissal; disabled submit remains disabled for whitespace', async () => {
  const h = harness(); h.render(); h.openKeyboard();
  h.comments.publish = async () => false;
  h.input().props.onChangeText('No perder'); h.render();
  findLabel(h, 'Publicar comentario').props.onPress(); await tick(); h.render();
  assert.equal(h.input().props.value, 'No perder'); assert.equal(h.calls.blur, 1); assert.equal(h.calls.dismiss, 1);
  h.input().props.onChangeText('  '); h.render(); assert.equal(findLabel(h, 'Publicar comentario').props.disabled, true);
});
test('existing own/foreign menus, cancellation, likes and restore remain connected', async () => {
  const h = harness({ roots: [own, { ...own, id: 'foreign', user_id: 'other' }], hidden: true }); h.render();
  findLabel(h, 'Mostrar mensajes ocultos').props.onPress(); assert.equal(h.calls.restore, 1);
  h.rowNodes().find(n => n.props.accessibilityLabel === 'Me gusta').props.onPress(); assert.deepEqual(h.calls.like, ['own']);
  h.rowNodes().find(n => n.props.accessibilityLabel === 'Opciones del comentario').props.onPress({ stopPropagation() {} }); h.render();
  let actions = h.nodes().find(n => n.type === 'Popover').props.actions;
  assert.deepEqual(Array.from(actions, a => a.title), ['Editar', 'Eliminar', 'Eliminar para todos', 'Ocultar mensajes', 'Copiar', 'Responder con video', 'Guardar']);
  actions.find(a => a.key === 'edit').onPress(); h.render(); h.openKeyboard();
  assert.equal(h.input().props.value, 'Original');
  assert.equal(findLabel(h, 'Cancelar edición'), undefined);
  assert.equal(h.nodes().filter(n => n.props.accessibilityLabel?.startsWith('Añadir emoji')).length, 7);
  findLabel(h, 'Cerrar comentarios').props.onPress(); h.render();
  assert.equal(h.input().props.value, '');
  h.rowNodes(1).find(n => n.props.accessibilityLabel === 'Opciones del comentario').props.onPress({ stopPropagation() {} }); h.render();
  actions = h.nodes().find(n => n.type === 'Popover').props.actions;
  assert.deepEqual(Array.from(actions, a => a.title), ['Ocultar mensajes', 'Copiar', 'Responder con video', 'Guardar']);
});
test('reference UI positions preserve short field, touch target and readable list spacing', () => {
  const h = harness(); h.render();
  assert.equal(h.styles.headerGlass.height, 56);
  const closed = h.nodes().find(n => flatten(n.props.style).width === 265);
  assert.ok(closed); assert.equal(flatten(closed.props.style).height, 38);
  assert.equal(h.styles.close.width, 40); assert.equal(h.styles.close.height, 40);
  h.openKeyboard();
  const emojiRow = h.nodes().find(n => flatten(n.props.style).width === 300);
  assert.equal(flatten(emojiRow.props.style).height, 18);
  assert.equal(flatten(emojiRow.props.style).marginTop, 6);
  assert.equal(flatten(emojiRow.props.style).marginLeft, 44);
  const field = h.nodes().find(n => flatten(n.props.style).width === 334);
  assert.equal(flatten(field.props.style).height, 36);
  assert.equal(h.styles.sendKeyboard.height, 24);
  assert.equal(h.nodes().filter(n => n.props.accessibilityState?.disabled === true).length, 4);
});
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const list = h => h.nodes().find(n => n.type === 'FlatList');
test('sending empties immediately, shows a pending row, rejects double tap and restores on failure', async () => {
  const h=harness(); h.render(); h.openKeyboard(); const wait=deferred(); let writes=0;
  h.comments.publish=() => { writes++; return wait.promise; };
  h.input().props.onChangeText('Importante'); h.render();
  const submit=findLabel(h,'Publicar comentario').props.onPress;
  submit(); submit(); h.render();
  assert.equal(writes,1); assert.equal(h.input().props.value,'');
  assert.equal(h.calls.blur,1); assert.equal(h.calls.dismiss,1);
  assert.equal(list(h).props.data[0].kind,'pending');
  assert.equal(list(h).props.refreshing,false);
  assert.equal(h.rowNodes().some(n=>n.props.accessibilityLabel==='Opciones del comentario'),false);
  wait.resolve(null); await tick(); h.render();
  assert.equal(h.input().props.value,'Importante'); assert.equal(list(h).props.data.length,0);
  assert.ok(h.nodes().some(n=>n.props.accessibilityRole==='alert'));
});
test('confirmed observer replaces the pending row while refresh is still waiting', async () => {
  const h=harness(); h.render(); const wait=deferred(); let committed;
  h.comments.publish=(_text,_parent,observer) => { committed=observer; return wait.promise; };
  h.input().props.onChangeText('Guardado'); h.render(); findLabel(h,'Publicar comentario').props.onPress(); h.render();
  h.comments.roots=[{...own,id:'saved',text:'Guardado'}]; committed(h.comments.roots[0]); h.render();
  assert.deepEqual(Array.from(list(h).props.data,r=>r.comment.id),['saved']);
  wait.resolve(h.comments.roots[0]); await tick(); h.render(); assert.equal(h.input().props.value,'');
});
test('late failure from another video never replaces the current draft', async () => {
  const h=harness(); h.render(); const wait=deferred(); h.comments.publish=()=>wait.promise;
  h.input().props.onChangeText('Anterior'); h.render(); findLabel(h,'Publicar comentario').props.onPress(); h.render();
  h.props.videoId='other-video'; h.render(); h.input().props.onChangeText('Actual'); h.render();
  wait.reject(Error('offline')); await tick(); h.render();
  assert.equal(h.input().props.value,'Actual'); assert.equal(list(h).props.data.length,0);
});
test('native Unicode emoji insertion updates quick reactions without duplicate or deletion promotion', () => {
  const h=harness(); h.render(); h.openKeyboard(); h.input().props.onChangeText('Hola 👩🏽‍💻'); h.render();
  let labels=h.nodes().filter(n=>n.props.accessibilityLabel?.startsWith('Añadir emoji')).map(n=>n.props.accessibilityLabel);
  assert.equal(labels.length,8); assert.equal(labels[0],'Añadir emoji 👩🏽‍💻 al comentario');
  h.input().props.onChangeText('Hola '); h.render();
  assert.equal(h.nodes().find(n=>n.props.accessibilityLabel?.startsWith('Añadir emoji')).props.accessibilityLabel,labels[0]);
});
test('360dp reference controls scale to the recording width, while input identity survives IME changes', () => {
  const width=720/1.75, h=harness({width}); h.render();
  let input=h.input(), field=h.nodes().find(n=>Math.abs(flatten(n.props.style).width-265*width/360)<.001);
  assert.ok(field); assert.equal(input.props.placeholder,'Agregar comentarios');
  const editorRef=input.props.ref; h.openKeyboard(); input=h.input(); assert.equal(input.props.ref,editorRef);
  assert.equal(flatten(input.props.style).paddingVertical,8*width/360);
  const at=h.nodes().find(n=>n.props.name==='at-sign'); assert.ok(Math.abs(at.props.size-20*width/360)<.0001);
  h.closeKeyboard(); assert.equal(h.input().props.ref,editorRef);
});
test('failed reply restores its target and successful edit restores the pre-edit draft', async()=>{
 const h=harness({roots:[own]}); h.render(); h.input().props.onChangeText('Borrador previo'); h.render();
 h.rowNodes().find(n=>n.props.accessibilityLabel==='Opciones del comentario').props.onPress({stopPropagation(){}}); h.render();
 h.nodes().find(n=>n.type==='Popover').props.actions.find(a=>a.key==='edit').onPress(); h.render();
 h.input().props.onChangeText('Editado'); h.render(); findLabel(h,'Guardar cambios').props.onPress(); h.render();
 assert.equal(h.input().props.value,''); await tick(); h.render(); assert.equal(h.input().props.value,'Borrador previo');
 h.rowNodes().find(n=>n.props.accessibilityLabel==='Opciones del comentario').props.onPress({stopPropagation(){}}); h.render();
 h.nodes().find(n=>n.type==='Popover').props.onClose(); h.render();
 h.rowNodes().find(n=>n.props.accessibilityLabel==='Responder a @Alexander').props.onPress({stopPropagation(){}}); h.render();
 h.comments.publish=async()=>null; findLabel(h,'Publicar comentario').props.onPress(); await tick(); h.render();
 assert.ok(findLabel(h,'Cancelar respuesta')); assert.equal(h.input().props.value,'Borrador previo');
});

test('K4 opaque white surfaces and pill colors retain existing header and row dimensions',()=>{
 const h=harness();h.render();assert.equal(h.styles.headerGlass.backgroundColor,'#FFFFFF');
 assert.equal(h.styles.countBadge.backgroundColor,'#F0EFEC'); assert.equal(h.styles.countBadge.borderColor,'#DCDCDC');
 assert.equal(h.styles.title.color,'#131313');assert.equal(h.styles.handle.backgroundColor,'#1C1C1E');
 assert.equal(h.styles.comment.paddingVertical,7);assert.equal(h.styles.commentText.fontSize,15);
 h.openKeyboard();const tools=h.nodes().find(n=>flatten(n.props.style).paddingLeft===44);
 assert.equal(flatten(tools.props.style).marginTop,14); assert.equal(flatten(tools.props.style).paddingRight,16);
 assert.equal(h.input().props.placeholderTextColor,'#6B6B66');
});
test('quick row never inserts half a composite emoji at the 300 character limit',()=>{
 const h=harness();h.render();h.openKeyboard();h.input().props.onChangeText('x'.repeat(299));h.render();
 h.nodes().find(n=>n.type==='EmojiStrip').props.onSelect('👩🏽‍💻');h.render();assert.equal(h.input().props.value,'x'.repeat(299));
});

test('editing uses the existing input and removes the intrusive edit/cancel heading',()=>{
 const h=harness({roots:[own]});h.render();
 assert.equal(h.styles.composerLabel.color,'#131313');
 assert.equal(h.styles.replyBubble,undefined);
 h.rowNodes().find(n=>n.props.accessibilityLabel==='Opciones del comentario').props.onPress({stopPropagation(){}});h.render();
 h.nodes().find(n=>n.type==='Popover').props.actions.find(a=>a.key==='edit').onPress();h.render();
 assert.equal(findLabel(h,'Cancelar edición'),undefined);
 assert.equal(h.input().props.value,'Original');
 assert.ok(findLabel(h,'Guardar cambios'));
});


test('bottom actions copy the exact comment, save the host video and open a linked video reply',async()=>{
 const h=harness({roots:[{...own,text:'Hola 👩🏽‍💻\n❤️'}]});h.render();
 const open=()=>{h.rowNodes().find(n=>n.props.accessibilityLabel==='Opciones del comentario').props.onPress({stopPropagation(){}});h.render();return h.nodes().find(n=>n.type==='Popover');};
 let menu=open();assert.equal(menu.props.placement,undefined);assert.equal(menu.props.safeBottom,24);
 menu.props.actions.find(a=>a.key==='copy').onPress();await tick();h.render();assert.deepEqual(h.calls.copy,['Hola 👩🏽‍💻\n❤️']);assert.equal(h.nodes().some(n=>n.type==='Popover'),false);
 open().props.actions.find(a=>a.key==='save').onPress();assert.equal(h.calls.save,1);
 h.props.isVideoSaved=true;h.render();assert.equal(open().props.actions.find(a=>a.key==='save').title,'Quitar de favoritos');
 open().props.actions.find(a=>a.key==='video-reply').onPress();assert.equal(h.calls.close,1);assert.equal(h.calls.routes[0].pathname,'/comment-video-reply');assert.equal(h.calls.routes[0].params.commentId,'own');
});
test('reply target appears inside the existing editor; cancelling keeps the draft and sends a root comment',async()=>{
 const h=harness({roots:[own]});h.render();
 h.rowNodes().find(n=>n.props.accessibilityLabel==='Responder a @Alexander').props.onPress({stopPropagation(){}});h.render();
 assert.equal(h.input().props.accessibilityLabel,'Responder a @Alexander');assert.ok(h.nodes().some(n=>n.type==='Text' && n.props.children?.flat?.().join('')==='Responder a @Alexander'));assert.equal(h.nodes().some(n=>n.type==='Text' && n.props.children?.includes?.('Respondiendo')),false);
 h.openKeyboard();assert.equal(h.input().props.accessibilityLabel,'Responder a @Alexander');assert.ok(h.nodes().some(n=>n.type==='Text' && n.props.children?.flat?.().join('')==='Responder a @Alexander'));
 h.input().props.onChangeText('Mi respuesta');h.render();findLabel(h,'Cancelar respuesta').props.onPress();h.render();
 assert.equal(h.input().props.value,'Mi respuesta');findLabel(h,'Publicar comentario').props.onPress();await tick();assert.equal(h.calls.publish[0][1],null);
});

test('personal and global removal use different confirmed actions for own roots and replies',async()=>{
 for(const parent of [null,'root']){
  const h=harness({roots:[{...own,parent_id:parent,root_id:parent}]});h.render();
  const open=()=>{h.rowNodes().find(n=>n.props.accessibilityLabel==='Opciones del comentario').props.onPress({stopPropagation(){}});h.render();return h.nodes().find(n=>n.type==='Popover').props.actions;};
  open().find(a=>a.key==='delete').onPress();await tick();h.render();assert.deepEqual(h.calls.removeForMe,['own']);assert.deepEqual(h.calls.remove,[]);
  open().find(a=>a.key==='delete-everyone').onPress();await tick();h.render();assert.deepEqual(h.calls.remove,['own']);
 }
});
test('personal root removal filters its thread; personal reply removal preserves siblings and Show cannot restore it',()=>{
 const h=harness({roots:[own,{...own,id:'other'}],hidden:true});
 h.comments.expanded.add('own');h.comments.threads.own={rows:[{...own,id:'reply',root_id:'own',parent_id:'own'},{...own,id:'foreign',user_id:'other',root_id:'own',parent_id:'reply'}],hasMore:false};
 h.comments.dismissedComments.add('reply');h.render();
 const ids=()=>Array.from(list(h).props.data).filter(r=>r.kind==='comment').map(r=>r.comment.id);
 assert.deepEqual(ids(),['own','foreign','other']);findLabel(h,'Mostrar mensajes ocultos').props.onPress();h.render();assert.deepEqual(ids(),['own','foreign','other']);
 h.comments.dismissedComments.add('own');h.comments.dismissedComments=new Set(h.comments.dismissedComments);h.render();assert.deepEqual(ids(),['other']);
});
