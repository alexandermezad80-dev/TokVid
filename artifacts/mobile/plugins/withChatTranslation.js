const {withAppBuildGradle,withMainApplication,withDangerousMod}=require('@expo/config-plugins');
const fs=require('fs');
const path=require('path');
module.exports=function withChatTranslation(config){
 config=withAppBuildGradle(config,c=>{c.modResults.contents+='\ndependencies {\n implementation "com.google.mlkit:translate:17.0.3"\n implementation "com.google.mlkit:language-id:17.0.6"\n}\n';return c;});
 config=withMainApplication(config,c=>{const pattern=/PackageList\(this\)\.packages\.apply\s*\{/;if(!pattern.test(c.modResults.contents))throw new Error('Cannot register private chat translation');c.modResults.contents=c.modResults.contents.replace(pattern,match=>match+'\n              add(com.tokvid.chat.ChatToolsPackage())');return c;});
 return withDangerousMod(config,['android',async c=>{const dir=path.join(c.modRequest.platformProjectRoot,'app/src/main/java/com/tokvid/chat');fs.mkdirSync(dir,{recursive:true});for(const name of ['ChatToolsModule.kt','ChatToolsPackage.kt'])fs.copyFileSync(path.join(c.modRequest.projectRoot,'plugins/chat-native',name),path.join(dir,name));return c;}]);
};
