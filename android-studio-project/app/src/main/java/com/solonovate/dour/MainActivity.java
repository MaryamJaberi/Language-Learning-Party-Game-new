package com.solonovate.dour;

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
import android.view.WindowManager;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import android.annotation.TargetApi;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final String APP_URL = BuildConfig.APP_URL;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hardware acceleration & clean window flags
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
                if (failingUrl != null && (failingUrl.equals(APP_URL))) {
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
