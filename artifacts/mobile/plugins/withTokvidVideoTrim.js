const {withAppBuildGradle,withMainApplication,withDangerousMod}=require("@expo/config-plugins");
const fs=require("fs"),path=require("path");
module.exports=function withTokvidVideoTrim(config){
 config=withAppBuildGradle(config,c=>{
  if(!c.modResults.contents.includes("androidx.media3:media3-transformer:1.7.1"))
   c.modResults.contents+='\ndependencies { implementation "androidx.media3:media3-transformer:1.7.1" }\n';
  return c;
 });
 config=withMainApplication(config,c=>{
  const token="add(com.tokvid.editor.VideoTrimPackage())";
  if(!c.modResults.contents.includes(token)){
   const re=/PackageList\(this\)\.packages\.apply\s*\{/;
   if(!re.test(c.modResults.contents))throw Error("Cannot register editor module");
   c.modResults.contents=c.modResults.contents.replace(re,match=>match+"\n              "+token);
  }
  return c;
 });
 return withDangerousMod(config,["android",async c=>{
  const dir=path.join(c.modRequest.platformProjectRoot,"app/src/main/java/com/tokvid/editor");
  fs.mkdirSync(dir,{recursive:true});
  for(const f of ["VideoTrimModule.kt","VideoTrimPackage.kt"])
   fs.copyFileSync(path.join(c.modRequest.projectRoot,"plugins/video-trim-native",f),path.join(dir,f));
  return c;
 }]);
};
