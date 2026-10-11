package com.tokvid.chat
import com.facebook.react.bridge.*
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.translate.*
import com.google.mlkit.common.model.DownloadConditions
class ChatToolsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
 override fun getName() = "TokVidChatTools"
 @ReactMethod fun translate(text: String, target: String, promise: Promise) {
  val targetLanguage = TranslateLanguage.fromLanguageTag(target)
  if (text.isBlank() || text.length > 1000 || targetLanguage == null) { promise.reject("INVALID", "Texto o idioma no válido"); return }
  val identifier = LanguageIdentification.getClient()
  identifier.identifyLanguage(text).addOnSuccessListener { tag ->
   identifier.close()
   val source = TranslateLanguage.fromLanguageTag(tag)
   if (source == null) { promise.reject("LANGUAGE", "No se pudo identificar el idioma de este mensaje") }
   else if (source == targetLanguage) { promise.resolve(text) }
   else {
    val translator = Translation.getClient(TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage(targetLanguage).build())
    translator.downloadModelIfNeeded(DownloadConditions.Builder().build()).addOnSuccessListener {
     translator.translate(text).addOnSuccessListener { result -> promise.resolve(result); translator.close() }
       .addOnFailureListener { e -> promise.reject("TRANSLATION", "No se pudo traducir", e); translator.close() }
    }.addOnFailureListener { e -> promise.reject("MODEL", "Conéctate a Internet para descargar el idioma", e); translator.close() }
   }
  }.addOnFailureListener { e -> identifier.close(); promise.reject("LANGUAGE", "No se pudo identificar el idioma", e) }
 }
}
