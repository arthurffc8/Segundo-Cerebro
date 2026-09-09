package com.arthurffc.segundocerebro;

import android.content.Context;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte entre o app web e o widget da tela de início.
 *
 * No JS:
 *   Capacitor.Plugins.WidgetBridge.update({ payload: JSON.stringify(widgetPayload(st)) })
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String payload = call.getString("payload", "{}");
        Context context = getContext();
        context.getSharedPreferences(HojeWidget.PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(HojeWidget.KEY_PAYLOAD, payload)
                .apply();
        HojeWidget.refreshAll(context);
        call.resolve();
    }
}
