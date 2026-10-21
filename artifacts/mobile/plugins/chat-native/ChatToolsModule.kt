package com.tokvid.chat
import com.facebook.react.bridge.*
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.provider.Telephony
import android.util.Base64
import java.io.ByteArrayOutputStream
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.translate.*
import com.google.mlkit.common.model.DownloadConditions
class ChatToolsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
 @ReactMethod fun setNavigationAppearance(color: String, darkIcons: Boolean) {
  val activity = reactApplicationContext.currentActivity ?: return
  activity.runOnUiThread {
   val parsed = android.graphics.Color.parseColor(color)
   applyNavigationAppearance(activity.window, parsed, darkIcons)
   applyModalNavigation(activity.window.decorView, parsed, darkIcons)
  }
 }
 @Suppress("DEPRECATION")
 private fun applyNavigationAppearance(window: android.view.Window, color: Int, darkIcons: Boolean) {
  window.navigationBarColor = color
  if (android.os.Build.VERSION.SDK_INT >= 28) window.navigationBarDividerColor = color
  if (android.os.Build.VERSION.SDK_INT >= 29) window.isNavigationBarContrastEnforced = false
  androidx.core.view.WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightNavigationBars = darkIcons
 }
 private fun applyModalNavigation(view: android.view.View, color: Int, darkIcons: Boolean) {
  if (view is com.facebook.react.views.modal.ReactModalHostView) {
   view.dialog?.takeIf { it.isShowing }?.window?.let { applyNavigationAppearance(it, color, darkIcons) }
  }
  if (view is android.view.ViewGroup) {
   for (index in 0 until view.childCount) view.getChildAt(index)?.let { applyModalNavigation(it, color, darkIcons) }
  }
 }
 private var commentRecognizer: android.speech.SpeechRecognizer? = null
 private var commentToken: String? = null
 private fun clearCommentRecognizer() {
  val recognizer = commentRecognizer
  commentRecognizer = null; commentToken = null
  recognizer?.cancel(); recognizer?.destroy()
 }
 private fun dictationEvent(token: String, text: String?, error: String?, final: Boolean) {
  if (token != commentToken) return
  val event = Arguments.createMap()
  event.putString("token", token); event.putString("text", text); event.putString("error", error); event.putBoolean("final", final)
  reactApplicationContext.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("TokVidCommentDictation", event)
  if (final) clearCommentRecognizer()
 }
 @ReactMethod fun startCommentDictation(token: String, promise: Promise) {
  UiThreadUtil.runOnUiThread {
   if (commentRecognizer != null) { promise.reject("DICTATION_BUSY", "Espera a que termine el dictado actual."); return@runOnUiThread }
   if (androidx.core.content.ContextCompat.checkSelfPermission(reactApplicationContext, android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
    promise.reject("DICTATION_PERMISSION", "Permite el micrófono para dictar."); return@runOnUiThread
   }
   if (!android.speech.SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)) { promise.reject("DICTATION_UNAVAILABLE", "Este teléfono no tiene un servicio de dictado disponible."); return@runOnUiThread }
   try {
    val recognizer = android.speech.SpeechRecognizer.createSpeechRecognizer(reactApplicationContext)
    commentRecognizer = recognizer; commentToken = token
    recognizer.setRecognitionListener(object : android.speech.RecognitionListener {
     override fun onReadyForSpeech(params: android.os.Bundle?) {}
     override fun onBeginningOfSpeech() {}
     override fun onRmsChanged(rmsdB: Float) {}
     override fun onBufferReceived(buffer: ByteArray?) {}
     override fun onEndOfSpeech() {}
     override fun onEvent(eventType: Int, params: android.os.Bundle?) {}
     override fun onPartialResults(results: android.os.Bundle?) {
      dictationEvent(token, results?.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull(), null, false)
     }
     override fun onResults(results: android.os.Bundle?) {
      dictationEvent(token, results?.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull(), null, true)
     }
     override fun onError(error: Int) {
      val message = when(error) {
       android.speech.SpeechRecognizer.ERROR_NO_MATCH, android.speech.SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> null
       android.speech.SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Permite el micrófono para dictar."
       android.speech.SpeechRecognizer.ERROR_NETWORK, android.speech.SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "No se pudo conectar el dictado. Revisa tu conexión."
       else -> "No se pudo completar el dictado. Puedes volver a intentarlo."
      }
      dictationEvent(token, null, message, true)
     }
    })
    val intent = Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
     .putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
     .putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, java.util.Locale.getDefault().toLanguageTag())
     .putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
     .putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 1)
    recognizer.startListening(intent)
    promise.resolve(true)
   } catch(e: Exception) { clearCommentRecognizer(); promise.reject("DICTATION_START", "No se pudo iniciar el dictado.", e) }
  }
 }
 @ReactMethod fun stopCommentDictation(token: String) { UiThreadUtil.runOnUiThread { if (token == commentToken) commentRecognizer?.stopListening() } }
 @ReactMethod fun cancelCommentDictation(token: String) { UiThreadUtil.runOnUiThread { if (token == commentToken) clearCommentRecognizer() } }
 override fun invalidate() { UiThreadUtil.runOnUiThread { clearCommentRecognizer() }; super.invalidate() }
 override fun getName() = "TokVidChatTools"
 private fun packages(): List<String> = listOf("com.whatsapp", "com.whatsapp.w4b", "jp.naver.line.android", "com.facebook.katana", "com.facebook.orca") + listOfNotNull(Telephony.Sms.getDefaultSmsPackage(reactApplicationContext))
 private fun shareIntent(packageName: String, text: String): Intent {
  val sms = packageName == Telephony.Sms.getDefaultSmsPackage(reactApplicationContext)
  return (if (sms) Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:")).putExtra("sms_body", text)
   else Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text))
   .setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
 }
 @ReactMethod fun getShareTargets(promise: Promise) {
  try {
   val manager = reactApplicationContext.packageManager
   val result = Arguments.createArray()
   for (pkg in packages().distinct()) {
    try {
     if (shareIntent(pkg, "").resolveActivity(manager) == null) continue
     val info = manager.getApplicationInfo(pkg, 0)
     val drawable = manager.getApplicationIcon(info)
     val bitmap = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
     drawable.setBounds(0, 0, 96, 96); drawable.draw(Canvas(bitmap))
     val bytes = ByteArrayOutputStream(); bitmap.compress(Bitmap.CompressFormat.PNG, 100, bytes); bitmap.recycle()
     val item = Arguments.createMap()
     item.putString("packageName", pkg)
     item.putString("name", manager.getApplicationLabel(info).toString())
     item.putString("icon", "data:image/png;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP))
     result.pushMap(item)
    } catch (_: android.content.pm.PackageManager.NameNotFoundException) { }
   }
   promise.resolve(result)
  } catch (e: Exception) { promise.reject("SHARE_TARGETS", "No se pudieron consultar las aplicaciones", e) }
 }
 @ReactMethod fun shareToPackage(packageName: String, text: String, promise: Promise) {
  if (!packages().contains(packageName) || text.isBlank()) { promise.reject("SHARE_TARGET", "Aplicación no disponible"); return }
  try {
   val intent = shareIntent(packageName, text)
   if (intent.resolveActivity(reactApplicationContext.packageManager) == null) { promise.reject("SHARE_UNAVAILABLE", "Esta aplicación no está instalada o no admite este contenido"); return }
   reactApplicationContext.startActivity(intent)
   promise.resolve(true)
  } catch (e: Exception) { promise.reject("SHARE_FAILED", "No se pudo abrir esta aplicación", e) }
 }
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
