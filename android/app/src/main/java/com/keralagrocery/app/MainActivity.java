package com.keralagrocery.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import java.io.IOException;
import java.io.InputStream;
import java.util.Scanner;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        
        // Match status bar to brand color instead of WHITE
        getWindow().setStatusBarColor(Color.parseColor(getString(R.string.status_bar_color)));
        View decorView = getWindow().getDecorView();
        // Use light status bar icons for the dark background
        WindowCompat.getInsetsController(getWindow(), decorView).setAppearanceLightStatusBars(false);

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

        // Append our app identifier to the default User Agent instead of hardcoding a fixed string
        String defaultUA = webView.getSettings().getUserAgentString();
        if (!defaultUA.contains(getString(R.string.user_agent_keyword))) {
            webView.getSettings().setUserAgentString(defaultUA + getString(R.string.user_agent_suffix));
        }

        // Force Bottom Bar Visibility and 5-column layout exactly like the reference image
        try {
            InputStream is = getAssets().open("ui_fixes.js");
            Scanner s = new Scanner(is).useDelimiter("\\A");
            String js = s.hasNext() ? s.next() : "";
            is.close();
            webView.postDelayed(() -> webView.evaluateJavascript(js, null), 1000);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        injectUIFixes();
    }
}
