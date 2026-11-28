package com.solonovate.dour;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import android.annotation.TargetApi;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private WebView webView;
    private PermissionRequest pendingWebPermissionRequest;
    private TextToSpeech textToSpeech;
    private volatile boolean ttsReady = false;
    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final String APP_URL = BuildConfig.APP_URL;

    private String getAppHost() {
        try {
            Uri uri = Uri.parse(APP_URL);
            return uri.getHost() != null ? uri.getHost().toLowerCase() : "maryamjaberi.github.io";
        } catch (Exception e) {
            return "maryamjaberi.github.io";
        }
    }

    private boolean isAllowedInAppUrl(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
            return false;
        }
        String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        String appHost = getAppHost();
        if (host.equals(appHost)) {
            return true;
        }
        if (host.endsWith(".firebaseapp.com") || host.endsWith(".web.app")) {
            return true;
        }
        return false;
    }

    private void openExternally(Uri uri) {
        if (uri == null) return;
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (Exception ignored) {
            // No handler installed for this URI scheme
        }
    }

    private class AndroidTTSBridge {
        @JavascriptInterface
        public boolean isAvailable() {
            return textToSpeech != null && ttsReady;
        }

        @JavascriptInterface
        public boolean speak(final String text, final String bcp47, final float rate) {
            if (textToSpeech == null || !ttsReady || text == null || text.trim().isEmpty()) {
                return false;
            }
            try {
                String tag = (bcp47 != null && !bcp47.trim().isEmpty()) ? bcp47.trim() : "en-US";
                Locale locale = Locale.forLanguageTag(tag);
                int langResult = textToSpeech.setLanguage(locale);
                if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                    String langOnly = tag.split("[-_]")[0];
                    textToSpeech.setLanguage(new Locale(langOnly));
                }
                float clampedRate = Math.max(0.5f, Math.min(1.5f, rate > 0 ? rate : 0.9f));
                textToSpeech.setSpeechRate(clampedRate);
                String utteranceId = "dour_tts_" + System.currentTimeMillis();
                int res = textToSpeech.speak(text.trim(), TextToSpeech.QUEUE_FLUSH, null, utteranceId);
                return res == TextToSpeech.SUCCESS;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void stop() {
            try {
                if (textToSpeech != null) {
                    textToSpeech.stop();
                }
            } catch (Exception ignored) {}
        }
    }

    private void initNativeTts() {
        try {
            textToSpeech = new TextToSpeech(getApplicationContext(), new TextToSpeech.OnInitListener() {
                @Override
                public void onInit(int status) {
                    ttsReady = (status == TextToSpeech.SUCCESS);
                    if (ttsReady && textToSpeech != null) {
                        textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                            @Override
                            public void onStart(String utteranceId) {}

                            @Override
                            public void onDone(String utteranceId) {
                                notifyJsTtsDone();
                            }

                            @Override
                            public void onError(String utteranceId) {
                                notifyJsTtsDone();
                            }
                        });
                    }
                }
            });
        } catch (Exception ignored) {
            ttsReady = false;
        }
    }

    private void notifyJsTtsDone() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    try {
                        webView.evaluateJavascript("window.__dourOnAndroidTtsDone && window.__dourOnAndroidTtsDone()", null);
                    } catch (Exception ignored) {}
                }
            }
        });
    }

    private void pauseAudioAndWebView() {
        try {
            if (textToSpeech != null) {
                textToSpeech.stop();
            }
        } catch (Exception ignored) {}
        if (webView != null) {
            try {
                webView.evaluateJavascript("window.__dourOnAppPause && window.__dourOnAppPause()", null);
            } catch (Exception ignored) {}
            webView.onPause();
            webView.pauseTimers();
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);

        initNativeTts();

        webView = new WebView(this);
        setContentView(webView);

        // Android 15/16 (targetSdk 36) edge-to-edge WindowInsets support so system bars & IME never clip UI
        webView.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                    v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                } else {
                    v.setPadding(
                        insets.getSystemWindowInsetLeft(),
                        insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(),
                        insets.getSystemWindowInsetBottom()
                    );
                }
                return insets;
            }
        });
        webView.requestApplyInsets();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setSupportMultipleWindows(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Expose native Android TextToSpeech bridge to the web app
        webView.addJavascriptInterface(new AndroidTTSBridge(), "AndroidTTS");

        // On-demand microphone permission for pronunciation practice (origin-validated)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Uri origin = request.getOrigin();
                        String originHost = origin != null && origin.getHost() != null
                            ? origin.getHost().toLowerCase()
                            : "";
                        if (!originHost.equals(getAppHost())) {
                            request.deny();
                            return;
                        }

                        List<String> allowedResources = new ArrayList<>();
                        boolean needsAudio = false;
                        for (String res : request.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                                allowedResources.add(res);
                                needsAudio = true;
                            }
                        }

                        if (allowedResources.isEmpty()) {
                            request.deny();
                            return;
                        }

                        if (needsAudio && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                            checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                            if (pendingWebPermissionRequest != null) {
                                pendingWebPermissionRequest.deny();
                            }
                            pendingWebPermissionRequest = request;
                            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSION_REQUEST_CODE);
                            return;
                        }

                        request.grant(allowedResources.toArray(new String[0]));
                    }
                });
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                WebView.HitTestResult result = view.getHitTestResult();
                String data = result != null ? result.getExtra() : null;
                if (data != null && !data.isEmpty()) {
                    openExternally(Uri.parse(data));
                    return false;
                }
                // Handle window.open(url, '_blank') by capturing the URL via a temporary WebView
                WebView transportView = new WebView(MainActivity.this);
                transportView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                        openExternally(req.getUrl());
                        v.destroy();
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(transportView);
                resultMsg.sendToTarget();
                return true;
            }
        });

        // Delegate file downloads (e.g. Admin AAB/APK releases) to the system browser/downloader
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                openExternally(Uri.parse(url));
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @TargetApi(Build.VERSION_CODES.N)
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request != null ? request.getUrl() : null;
                if (isAllowedInAppUrl(uri)) {
                    return false;
                }
                openExternally(uri);
                return true;
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = url != null ? Uri.parse(url) : null;
                if (isAllowedInAppUrl(uri)) {
                    return false;
                }
                openExternally(uri);
                return true;
            }

            @SuppressWarnings("deprecation")
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (failingUrl != null && failingUrl.equals(APP_URL)) {
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

        // Load remote production PWA (enables Service Worker, Cache Storage & cloud sync)
        webView.loadUrl(APP_URL);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE && pendingWebPermissionRequest != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                pendingWebPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                pendingWebPermissionRequest.deny();
            }
            pendingWebPermissionRequest = null;
        }
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
            + "  body { background: #0E1530; color: #FFFFFF; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; }"
            + "  .card { background: #182348; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 32px 24px; max-width: 400px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.45); }"
            + "  .icon { font-size: 56px; margin-bottom: 16px; }"
            + "  h1 { font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #93C5FD; }"
            + "  p { font-size: 14px; line-height: 1.7; color: #D1D5DB; margin-bottom: 24px; }"
            + "  .btn { display: inline-block; width: 100%; padding: 14px 20px; background: #2648B8; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; }"
            + "  .btn:active { background: #1D3A9A; transform: scale(0.98); }"
            + "  .sub { font-size: 12px; color: #9CA3AF; margin-top: 16px; direction: ltr; }"
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
            webView.resumeTimers();
            webView.onResume();
            try {
                webView.evaluateJavascript("window.__dourOnAppResume && window.__dourOnAppResume()", null);
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void onPause() {
        pauseAudioAndWebView();
        super.onPause();
    }

    @Override
    protected void onStop() {
        pauseAudioAndWebView();
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        if (pendingWebPermissionRequest != null) {
            pendingWebPermissionRequest.deny();
            pendingWebPermissionRequest = null;
        }
        if (textToSpeech != null) {
            try {
                textToSpeech.stop();
                textToSpeech.shutdown();
            } catch (Exception ignored) {}
            textToSpeech = null;
            ttsReady = false;
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
