package com.keralagrocery.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Force UI refresh on new intent (like deep link return)
        injectUIFixes();
    }

    @Override
    public void onResume() {
        super.onResume();
        injectUIFixes();
    }

    private void injectUIFixes() {
        final WebView webView = getBridge().getWebView();
        if (webView == null) return;

        // Reset User Agent to include our app identifier
        webView.getSettings().setUserAgentString("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36 KeralaGroceryApp/1.0.0");

        // Force Bottom Bar Visibility and 5-column layout exactly like the reference image
        final String js = "(function() {" +
            "function applyFix() {" +
            "  var nav = document.querySelector('.kg-mobile-nav');" +
            "  if (!nav) return;" +
            "  nav.style.setProperty('display', 'flex', 'important');" +
            "  nav.style.setProperty('height', '76px', 'important');" +
            "  nav.style.setProperty('padding-bottom', 'max(env(safe-area-inset-bottom), 16px)', 'important');" +
            "  nav.style.setProperty('background', '#ffffff', 'important');" +
            "  nav.style.setProperty('visibility', 'visible', 'important');" +
            "  nav.style.setProperty('opacity', '1', 'important');" +
            "  " +
            "  var container = nav.querySelector('.grid, .flex');" +
            "  if (container) {" +
            "    container.style.setProperty('display', 'flex', 'important');" +
            "    container.style.setProperty('width', '100%', 'important');" +
            "    container.style.setProperty('height', '100%', 'important');" +
            "    container.style.setProperty('justify-content', 'space-around', 'important');" +
            "  }" +
            "  " +
            "  var items = nav.querySelectorAll('a');" +
            "  items.forEach(function(a) {" +
            "    a.style.setProperty('display', 'flex', 'important');" +
            "    a.style.setProperty('flex', '1', 'important');" +
            "    a.style.setProperty('max-width', '20%', 'important');" +
            "    a.style.setProperty('flex-direction', 'column', 'important');" +
            "    a.style.setProperty('align-items', 'center', 'important');" +
            "    a.style.setProperty('justify-content', 'center', 'important');" +
            "    " +
            "    var svg = a.querySelector('svg');" +
            "    if (svg) {" +
            "      svg.style.setProperty('width', '26px', 'important');" +
            "      svg.style.setProperty('height', '26px', 'important');" +
            "    }" +
            "    " +
            "    var span = a.querySelector('span');" +
            "    if (span) {" +
            "      span.style.setProperty('font-size', '11px', 'important');" +
            "      span.style.setProperty('font-weight', '700', 'important');" +
            "    }" +
            "  });" +
            "}" +
            "applyFix();" +
            "if (!window.kgObserver) {" +
            "  window.kgObserver = new MutationObserver(applyFix);" +
            "  window.kgObserver.observe(document.body, { childList: true, subtree: true });" +
            "}" +
            "})();";

        webView.postDelayed(() -> webView.evaluateJavascript(js, null), 1000);
    }

    @Override
    public void onStart() {
        super.onStart();
        injectUIFixes();
    }
}
