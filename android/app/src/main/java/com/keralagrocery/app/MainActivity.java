package com.keralagrocery.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Modern Back Button Handling for Capacitor/WebView
        // This ensures the hardware back button navigates through the website history
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // No history in WebView, minimize or exit app
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }

    @Override
    public void onStart() {
        super.onStart();
        final WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // Use standard UA to force mobile web view features and show bottom menus
            settings.setUserAgentString("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36");
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);

            // CSS Injection to force show the bottom navigation menu hidden by the site on Android
            final String js = "(function() {" +
                        "var css = 'html.is-native.is-android .kg-mobile-nav { display: grid !important; opacity: 1 !important; visibility: visible !important; } " +
                        "html.is-native.is-android .kg-web-header { display: block !important; }';" +
                        "var style = document.createElement('style');" +
                        "style.innerHTML = css;" +
                        "document.head.appendChild(style);" +
                        "})();";
            
            // Inject after a short delay to ensure DOM is ready
            webView.postDelayed(() -> webView.evaluateJavascript(js, null), 1500);
            webView.postDelayed(() -> webView.evaluateJavascript(js, null), 4000);
        }
    }
}
