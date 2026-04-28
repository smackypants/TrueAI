# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# --- Capacitor / WebView bridge ---------------------------------------------
# Capacitor reflects on @CapacitorPlugin-annotated classes at runtime; if
# R8 strips or renames them the JS layer can no longer call into native.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod *;
}

# Cordova plugins (loaded reflectively via plugin.xml).
-keep class org.apache.cordova.** { *; }

# Preserve JavascriptInterface methods used by the Capacitor WebView.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- AndroidX / support libs -------------------------------------------------
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**

# Newer kotlinx-coroutines reference an internal helper that may be absent
# from the runtime classpath; suppress R8 missing-class warnings rather
# than fail the release build.
-dontwarn kotlin.coroutines.jvm.internal.SpillingKt

# Keep crash-stack line numbers usable.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
