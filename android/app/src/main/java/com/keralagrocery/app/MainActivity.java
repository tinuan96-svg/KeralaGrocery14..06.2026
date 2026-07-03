package com.keralagrocery.app;

import android.os.Bundle;
import android.os.Message;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // 1. Enable popup support
            settings.setSupportMultipleWindows(true);
            settings.setJavaScriptEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setDomStorageEnabled(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            
            // 2. Add a WebChromeClient to handle the popup request
            // Without this, setSupportMultipleWindows(true) does nothing.
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    // Create a temporary WebView to host the popup content
                    WebView newWebView = new WebView(MainActivity.this);
                    newWebView.getSettings().setJavaScriptEnabled(true);
                    newWebView.getSettings().setSupportMultipleWindows(true);
                    newWebView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
                    
                    // Crucial: The new window must also have a ChromeClient to handle its own close/redirect
                    newWebView.setWebChromeClient(new WebChromeClient() {
                        @Override
                        public void onCloseWindow(WebView window) {
                            super.onCloseWindow(window);
                        }
                    });

                    // Tell the system to use our original WebView to load the new URL 
                    // instead of a popup, or handle it as a proper popup.
                    // For payment gateways, it's often best to let the main WebView handle the redirect.
                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(view);
                    resultMsg.sendToTarget();
                    return true;
                }
            });
        }
    }
}
