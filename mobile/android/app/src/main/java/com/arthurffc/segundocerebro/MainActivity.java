package com.arthurffc.segundocerebro;

import android.os.Bundle;
import android.content.Intent;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openRequestedTab(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        openRequestedTab(getIntent());
    }

    private void openRequestedTab(Intent intent) {
        if (intent == null || !intent.hasExtra("sc_open_tab") || getBridge() == null) return;
        String tab = intent.getStringExtra("sc_open_tab");
        if (tab == null) return;
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('sc-open-tab',{detail:'" + tab + "'}));", null));
        intent.removeExtra("sc_open_tab");
    }
}
