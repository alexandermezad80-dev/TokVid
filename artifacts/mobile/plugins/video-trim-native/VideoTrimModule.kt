package com.tokvid.editor
import android.media.MediaMetadataRetriever
import android.net.Uri
import com.facebook.react.bridge.*
import androidx.media3.common.MediaItem
import androidx.media3.transformer.*
import java.io.File
import java.util.UUID
import kotlin.math.roundToLong

class VideoTrimModule(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
 override fun getName()="TokvidVideoTrimmer"
 private var running:Transformer?=null
 private var waiting:Promise?=null
 private var file:File?=null
 private fun length(uri:String):Long {
   val r=MediaMetadataRetriever()
   try{r.setDataSource(reactApplicationContext,Uri.parse(uri));return r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()?:0}
   finally{r.release()}
 }
 @ReactMethod fun inspect(uri:String,promise:Promise) {
   try {
     if(!uri.startsWith("file://"))throw IllegalArgumentException("Archivo no local")
     val ms=length(uri)
     if(ms<=0||ms>180000)throw IllegalArgumentException("Duración no válida")
     val result=Arguments.createMap();result.putDouble("durationMs",ms.toDouble());promise.resolve(result)
   }catch(e:Exception){promise.reject("TRIM_INSPECT","No pudimos leer este video.",e)}
 }
 private fun finish(error:Throwable?=null){
   val p=waiting;val output=file
   waiting=null;running=null;file=null
   if(error!=null){output?.delete();p?.reject("TRIM_EXPORT","No se pudo recortar el video. Conservamos el original.",error);return}
   try{
     if(output==null||!output.isFile||output.length()<=0||output.length()>250L*1024*1024)throw IllegalStateException("Archivo inválido")
     val duration=length(Uri.fromFile(output).toString())
     if(duration<=0||duration>180000)throw IllegalStateException("Duración inválida")
     val result=Arguments.createMap()
     result.putString("uri",Uri.fromFile(output).toString())
     result.putDouble("size",output.length().toDouble())
     result.putDouble("durationMs",duration.toDouble())
     p?.resolve(result)
   }catch(e:Exception){output?.delete();p?.reject("TRIM_VALIDATE","No pudimos validar el recorte.",e)}
 }
 @ReactMethod fun trim(uri:String,fromMs:Double,toMs:Double,promise:Promise){
   UiThreadUtil.runOnUiThread{
     if(waiting!=null){promise.reject("TRIM_BUSY","Ya hay una exportación.");return@runOnUiThread}
     try{
       if(!uri.startsWith("file://")||!fromMs.isFinite()||!toMs.isFinite())throw IllegalArgumentException("Entrada inválida")
       val duration=length(uri);val begin=fromMs.roundToLong();val end=toMs.roundToLong()
       if(duration<=0||duration>180000||begin<0||end>duration||end-begin<500)throw IllegalArgumentException("Selecciona al menos 0.5 segundos.")
       val dir=File(reactApplicationContext.cacheDir,"tokvid-trim")
       if(!dir.exists()&&!dir.mkdirs())throw IllegalStateException("Almacenamiento no disponible")
       val out=File(dir,UUID.randomUUID().toString()+".mp4")
       val input=MediaItem.Builder().setUri(uri).setClippingConfiguration(MediaItem.ClippingConfiguration.Builder().setStartPositionMs(begin).setEndPositionMs(end).build()).build()
       val clip=EditedMediaItem.Builder(input).build()
       val listener=object:Transformer.Listener{
         override fun onCompleted(composition:Composition,exportResult:ExportResult){finish()}
         override fun onError(composition:Composition,exportResult:ExportResult,exception:ExportException){finish(exception)}
       }
       val job=Transformer.Builder(reactApplicationContext).addListener(listener).build()
       waiting=promise;file=out;running=job
       job.start(clip,out.absolutePath)
     }catch(e:Exception){file?.delete();file=null;running=null;waiting=null;promise.reject("TRIM_START","No se pudo iniciar el recorte.",e)}
   }
 }
 @ReactMethod fun cancelTrim(){
   UiThreadUtil.runOnUiThread{
     val job=running?:return@runOnUiThread
     val p=waiting;val out=file
     running=null;waiting=null;file=null
     job.cancel();out?.delete();p?.reject("TRIM_CANCEL","Exportación cancelada.")
   }
 }
 override fun invalidate(){cancelTrim();super.invalidate()}
}
