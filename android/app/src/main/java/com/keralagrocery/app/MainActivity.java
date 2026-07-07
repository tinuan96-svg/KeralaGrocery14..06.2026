package com.keralagrocery.app;

import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }

    @Override
    public void onStart() {
        super.onStart();
        final WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setUserAgentString("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36");
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);

            // Injection Fix: The website has CSS that explicitly hides the bottom menu on Android.
            // We force it to show by injecting an override style.
            final String js = "(function() {" +
                        "var css = 'html.is-native.is-android .kg-mobile-nav { display: grid !important; opacity: 1 !important; visibility: visible !important; } " +
                        "html.is-native.is-android .kg-web-header { display: block !important; }';" +
                        "var style = document.createElement('style');" +
                        "style.innerHTML = css;" +
                        "document.head.appendChild(style);" +
                        "})();";
            
            // Inject multiple times to handle initial load and client-side navigation
            webView.postDelayed(() -> webView.evaluateJavascript(js, null), 1000);
            webView.postDelayed(() -> webView.evaluateJavascript(js, null), 3000);
            webView.postDelayed(() -> webView.evaluateJavascript(js, null), 5000);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && keyCode == KeyEvent.KEYCODE_BACK) {
            WebView webView = getBridge().getWebView();
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }
}
