package com.safenode.mobile;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "SafenodeWebAuthn";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION)) {
            Log.w(TAG, "WebView Credential Manager support is unavailable; recovery unlock remains available.");
            return;
        }

        WebSettingsCompat.setWebAuthenticationSupport(
            webView.getSettings(),
            WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP
        );
        Log.i(TAG, "WebView Credential Manager support enabled.");
    }
}
