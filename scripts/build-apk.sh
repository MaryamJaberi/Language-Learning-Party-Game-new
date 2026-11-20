#!/bin/bash
set -e

# Normalize Windows paths if under Cygwin / MSYS / Git Bash
if command -v cygpath >/dev/null 2>&1; then
  [ -n "$LOCALAPPDATA" ] && LOCALAPPDATA="$(cygpath -u "$LOCALAPPDATA")"
  [ -n "$ANDROID_HOME" ] && ANDROID_HOME="$(cygpath -u "$ANDROID_HOME")"
  [ -n "$ANDROID_SDK_ROOT" ] && ANDROID_SDK_ROOT="$(cygpath -u "$ANDROID_SDK_ROOT")"
  [ -n "$KEYSTORE_PATH" ] && KEYSTORE_PATH="$(cygpath -u "$KEYSTORE_PATH")"
fi

echo "=== 1. Preparing Directories ==="
mkdir -p android/src/com/dour/languagegame
mkdir -p android/res/values
mkdir -p android/res/mipmap-hdpi
mkdir -p android/res/mipmap-mdpi
mkdir -p android/res/mipmap-xhdpi
mkdir -p android/res/mipmap-xxhdpi
mkdir -p android/res/mipmap-xxxhdpi
mkdir -p android/assets
mkdir -p android/obj
mkdir -p android/bin
mkdir -p public/downloads
mkdir -p public/.well-known
mkdir -p dist/.well-known

echo "=== 2. Configuring Release Keystore ==="
# Read keystore location and password from environment variables; keep keystore outside repo
KEYSTORE_PATH="${KEYSTORE_PATH:-$HOME/.android/dor-zaban-release.keystore}"
KEY_ALIAS="${KEY_ALIAS:-dor-release}"

if [ -z "$KEYSTORE_PASSWORD" ]; then
  echo "ERROR: KEYSTORE_PASSWORD environment variable is not set." >&2
  echo "Please set it before building: export KEYSTORE_PASSWORD='...'" >&2
  exit 1
fi

if [ ! -f "$KEYSTORE_PATH" ]; then
  echo "Generating new release keystore at: $KEYSTORE_PATH"
  mkdir -p "$(dirname "$KEYSTORE_PATH")"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEYSTORE_PASSWORD" \
    -dname "CN=Dor Zaban, OU=Mobile, O=Turn Game, L=Tehran, ST=Tehran, C=IR"
  echo "Keystore created successfully."
fi

# Extract SHA-256 fingerprint
SHA256_FINGERPRINT=$(keytool -list -v -keystore "$KEYSTORE_PATH" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" | grep -i "SHA256:" | head -n 1 | awk '{print $2}')
echo "Certificate SHA-256: $SHA256_FINGERPRINT"

# Write assetlinks.json
if [ -n "$SHA256_FINGERPRINT" ]; then
  cat <<EOF > public/.well-known/assetlinks.json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.dour.languagegame",
      "sha256_cert_fingerprints": [
        "$SHA256_FINGERPRINT"
      ]
    }
  }
]
EOF
  cp public/.well-known/assetlinks.json dist/.well-known/assetlinks.json 2>/dev/null || true
fi

echo "=== 3. Preparing Light Web Assets ==="
# اپ سبک: دارایی‌های حجیم وب درون بسته قرار نمی‌گیرند تا حجم APK زیر ۵ مگابایت بماند.
# اپ مستقیماً نسخهٔ PWA را از دامنهٔ رسمی بارگذاری می‌کند تا Cache Storage و Service Worker به درستی کار کنند.
rm -rf android/assets/*
cat << 'EOF' > android/assets/offline.html
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>دور: زبان</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { background: #170B2C; color: #FFFFFF; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; }
  .card { background: #241442; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px 24px; max-width: 400px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  .icon { font-size: 56px; margin-bottom: 16px; }
  h1 { font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #A78BFA; }
  p { font-size: 14px; line-height: 1.7; color: #D1D5DB; margin-bottom: 24px; }
  .btn { display: inline-block; width: 100%; padding: 14px 20px; background: #7C3AED; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; }
  .btn:active { background: #6D28D9; transform: scale(0.98); }
  .sub { font-size: 12px; color: #9CA3AF; margin-top: 16px; dir: ltr; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">🌐</div>
  <h1>اتصال اینترنت لازم است</h1>
  <p>برای اولین اجرای بازی نیاز به اتصال اینترنت دارید تا محیط بازی و محتوای ذخیره‌شده آماده شود. پس از اولین اجرا، بازی به صورت آفلاین نیز در دسترس خواهد بود.</p>
  <button class="btn" onclick="location.href='https://maryamjaberi.github.io/Language-Learning-Party-Game/'">تلاش دوباره</button>
  <div class="sub">First launch requires an active internet connection.</div>
</div>
</body>
</html>
EOF

echo "=== 4. Creating Android Resources and Manifest ==="
cat << 'EOF' > android/res/values/strings.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">دور: زبان</string>
    <string name="package_name">com.dour.languagegame</string>
</resources>
EOF

cat << 'EOF' > android/res/values/styles.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.DeviceDefault.NoActionBar">
        <item name="android:windowBackground">@android:color/white</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowFullscreen">false</item>
    </style>
</resources>
EOF

# Copy app icons to mipmap
if [ -f "public/pwa-192x192.png" ]; then
  cp public/pwa-192x192.png android/res/mipmap-hdpi/ic_launcher.png
  cp public/pwa-192x192.png android/res/mipmap-mdpi/ic_launcher.png
  cp public/pwa-192x192.png android/res/mipmap-xhdpi/ic_launcher.png
  cp public/pwa-512x512.png android/res/mipmap-xxhdpi/ic_launcher.png
  cp public/pwa-512x512.png android/res/mipmap-xxxhdpi/ic_launcher.png
fi

cat << 'EOF' > android/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.dour.languagegame"
    android:versionCode="10014"
    android:versionName="1.1.4">

    <uses-sdk
        android:minSdkVersion="24"
        android:targetSdkVersion="36" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:hardwareAccelerated="true"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

echo "=== 5. Writing MainActivity.java ==="
cat << 'EOF' > android/src/com/dour/languagegame/MainActivity.java
package com.dour.languagegame;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.PermissionRequest;
import android.view.KeyEvent;
import android.view.Window;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import android.annotation.TargetApi;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final String APP_URL = "https://maryamjaberi.github.io/Language-Learning-Party-Game/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);

        // Cache configuration for smooth offline gameplay via Service Worker & Cache Storage
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Chrome client handles microphone permission for pronunciation practice
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("https://maryamjaberi.github.io/") ||
                    url.startsWith("https://accounts.google.com/") ||
                    url.startsWith("https://*.firebaseapp.com/") ||
                    url.startsWith("http")) {
                    return false;
                }
                return false;
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (failingUrl != null && (failingUrl.contains("maryamjaberi.github.io") || failingUrl.equals(APP_URL))) {
                    loadOfflineFallback();
                }
            }

            @TargetApi(Build.VERSION_CODES.M)
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    loadOfflineFallback();
                }
            }
        });

        // Request runtime record audio permission if required
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSION_REQUEST_CODE);
            }
        }

        // Load remote production PWA (enables Service Worker, Cache Storage & cloud sync)
        webView.loadUrl(APP_URL);
    }

    private void loadOfflineFallback() {
        String offlineHtml = "<!DOCTYPE html>"
            + "<html lang=\"fa\" dir=\"rtl\">"
            + "<head>"
            + "<meta charset=\"UTF-8\">"
            + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
            + "<title>دور: زبان</title>"
            + "<style>"
            + "  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }"
            + "  body { background: #170B2C; color: #FFFFFF; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; }"
            + "  .card { background: #241442; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px 24px; max-width: 400px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }"
            + "  .icon { font-size: 56px; margin-bottom: 16px; }"
            + "  h1 { font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #A78BFA; }"
            + "  p { font-size: 14px; line-height: 1.7; color: #D1D5DB; margin-bottom: 24px; }"
            + "  .btn { display: inline-block; width: 100%; padding: 14px 20px; background: #7C3AED; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; }"
            + "  .btn:active { background: #6D28D9; transform: scale(0.98); }"
            + "  .sub { font-size: 12px; color: #9CA3AF; margin-top: 16px; dir: ltr; }"
            + "</style>"
            + "</head>"
            + "<body>"
            + "<div class=\"card\">"
            + "  <div class=\"icon\">🌐</div>"
            + "  <h1>اتصال اینترنت لازم است</h1>"
            + "  <p>برای اولین اجرای بازی نیاز به اتصال اینترنت دارید تا محیط بازی و محتوای ذخیره‌شده آماده شود. پس از اولین اجرا، بازی به صورت آفلاین نیز در دسترس خواهد بود.</p>"
            + "  <button class=\"btn\" onclick=\"location.href='" + APP_URL + "'\">تلاش دوباره</button>"
            + "  <div class=\"sub\">First launch requires an active internet connection.</div>"
            + "</div>"
            + "</body>"
            + "</html>";
        webView.loadDataWithBaseURL(APP_URL, offlineHtml, "text/html", "UTF-8", null);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
EOF

echo "=== 6. Compiling Android App ==="
# SDK Detection (supports Linux, Windows & CI)
ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$LOCALAPPDATA/Android/Sdk}}"
if [ -z "$ANDROID_SDK" ] || [ ! -d "$ANDROID_SDK" ]; then
  if [ -d "/usr/lib/android-sdk" ]; then
    ANDROID_SDK="/usr/lib/android-sdk"
  fi
fi

if [ -d "$ANDROID_SDK" ]; then
  BUILD_TOOLS_DIR=$(ls -1d "$ANDROID_SDK/build-tools/"* 2>/dev/null | sort -V | tail -n 1)
  ANDROID_JAR=$(ls -1d "$ANDROID_SDK/platforms/android-"* 2>/dev/null | sort -V | tail -n 1)/android.jar
else
  ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
fi

echo "Using Android JAR: $ANDROID_JAR"
echo "Using Build Tools: $BUILD_TOOLS_DIR"

AAPT_BIN="aapt"
if ! command -v aapt >/dev/null 2>&1 && [ -f "$BUILD_TOOLS_DIR/aapt.exe" ]; then
  AAPT_BIN="$BUILD_TOOLS_DIR/aapt.exe"
fi

ZIPALIGN_BIN="zipalign"
if ! command -v zipalign >/dev/null 2>&1 && [ -f "$BUILD_TOOLS_DIR/zipalign.exe" ]; then
  ZIPALIGN_BIN="$BUILD_TOOLS_DIR/zipalign.exe"
fi

# 6a. Generate R.java
"$AAPT_BIN" package -m -J android/src -M android/AndroidManifest.xml -S android/res -I "$ANDROID_JAR"

# 6b. Compile Java files
rm -rf android/obj/*
javac -source 1.8 -target 1.8 \
  -bootclasspath "$ANDROID_JAR" \
  -d android/obj \
  android/src/com/dour/languagegame/*.java

# 6c. Convert classes to DEX bytecode (supports d8 and dx)
rm -f android/bin/classes.dex
if [ -f "$BUILD_TOOLS_DIR/d8.bat" ]; then
  "$BUILD_TOOLS_DIR/d8.bat" --min-api 24 --lib "$ANDROID_JAR" --output android/bin/ android/obj/com/dour/languagegame/*.class
elif command -v d8 >/dev/null 2>&1; then
  d8 --min-api 24 --lib "$ANDROID_JAR" --output android/bin/ android/obj/com/dour/languagegame/*.class
elif [ -f "$BUILD_TOOLS_DIR/dx.bat" ]; then
  "$BUILD_TOOLS_DIR/dx.bat" --dex --output=android/bin/classes.dex android/obj
elif command -v dx >/dev/null 2>&1; then
  dx --dex --output=android/bin/classes.dex android/obj
else
  echo "Error: neither d8 nor dx found" >&2
  exit 1
fi

# 6d. Package resources and assets into APK
rm -f android/bin/app-unaligned.apk
"$AAPT_BIN" package -f \
  -M android/AndroidManifest.xml \
  -S android/res \
  -A android/assets \
  -I "$ANDROID_JAR" \
  -F android/bin/app-unaligned.apk

# 6e. Add classes.dex to APK
cd android/bin
"$AAPT_BIN" add app-unaligned.apk classes.dex
cd ../..

# 6f. Zipalign APK
rm -f android/bin/app-aligned.apk
"$ZIPALIGN_BIN" -f -p 4 android/bin/app-unaligned.apk android/bin/app-aligned.apk

# 6g. Sign APK with apksigner using environment variable
rm -f public/downloads/dor-zaban-v1.0.apk
if [ -f "$BUILD_TOOLS_DIR/apksigner.bat" ]; then
  "$BUILD_TOOLS_DIR/apksigner.bat" sign \
    --ks "$KEYSTORE_PATH" \
    --ks-pass "env:KEYSTORE_PASSWORD" \
    --ks-key-alias "$KEY_ALIAS" \
    --key-pass "env:KEYSTORE_PASSWORD" \
    --v1-signing-enabled true \
    --v2-signing-enabled true \
    --v3-signing-enabled true \
    --out public/downloads/dor-zaban-v1.0.apk \
    android/bin/app-aligned.apk
  echo "=== 7. Verifying Signed APK ==="
  "$BUILD_TOOLS_DIR/apksigner.bat" verify -v public/downloads/dor-zaban-v1.0.apk
else
  apksigner sign \
    --ks "$KEYSTORE_PATH" \
    --ks-pass "env:KEYSTORE_PASSWORD" \
    --ks-key-alias "$KEY_ALIAS" \
    --key-pass "env:KEYSTORE_PASSWORD" \
    --v1-signing-enabled true \
    --v2-signing-enabled true \
    --v3-signing-enabled true \
    --out public/downloads/dor-zaban-v1.0.apk \
    android/bin/app-aligned.apk
  echo "=== 7. Verifying Signed APK ==="
  apksigner verify -v public/downloads/dor-zaban-v1.0.apk
fi

echo "SUCCESS: public/downloads/dor-zaban-v1.0.apk generated successfully!"
ls -lh public/downloads/dor-zaban-v1.0.apk
