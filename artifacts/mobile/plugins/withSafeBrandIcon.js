const {withDangerousMod}=require('@expo/config-plugins');
const fs=require('fs');const path=require('path');
module.exports=config=>withDangerousMod(config,['android',async c=>{
 const res=path.join(c.modRequest.platformProjectRoot,'app/src/main/res');
 const drawable=path.join(res,'drawable');fs.mkdirSync(drawable,{recursive:true});
 for(const dir of fs.readdirSync(res).filter(d=>d.startsWith('mipmap-anydpi'))){
  for(const filename of fs.readdirSync(path.join(res,dir)).filter(f=>/^ic_launcher.*\.xml$/.test(f))){
   const file=path.join(res,dir,filename);let xml=fs.readFileSync(file,'utf8');
   xml=xml.replace(/<(foreground|monochrome) android:drawable="([^\"]+)"\s*\/>/g,(match,tag,source)=>{
    if(source.startsWith('@drawable/tokvid_safe_'))return match;
    const name='tokvid_safe_'+tag;
    fs.writeFileSync(path.join(drawable,name+'.xml'),`<?xml version="1.0" encoding="utf-8"?>\n<inset xmlns:android="http://schemas.android.com/apk/res/android" android:inset="18dp"><bitmap android:src="${source}" android:gravity="fill" /></inset>\n`);
    return `<${tag} android:drawable="@drawable/${name}" />`;
   });fs.writeFileSync(file,xml);
  }
 }
 return c;
}]);
