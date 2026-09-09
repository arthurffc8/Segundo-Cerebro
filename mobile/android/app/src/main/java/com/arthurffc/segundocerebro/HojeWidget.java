package com.arthurffc.segundocerebro;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget "Hoje" da tela de início.
 *
 * Os dados vêm do app web: o JS chama WidgetBridge.update({payload}) e o payload
 * (o mesmo JSON que alimenta o widget do Windows) fica guardado em SharedPreferences.
 * O widget só lê e desenha — não sabe nada sobre o estado completo do app.
 */
public class HojeWidget extends AppWidgetProvider {

    public static final String PREFS = "sc_widget";
    public static final String KEY_PAYLOAD = "payload";

    /** Quantas linhas cabem no layout (ids widget_row_0..3). */
    private static final int MAX_ROWS = 4;

    /** Redesenha todas as instâncias do widget. Chamado pelo plugin do Capacitor. */
    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, HojeWidget.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            render(context, manager, id);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            render(context, manager, id);
        }
    }

    private static void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_hoje);
        int[] rowIds = { R.id.widget_row_0, R.id.widget_row_1, R.id.widget_row_2, R.id.widget_row_3 };

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_PAYLOAD, null);

        String resumo = context.getString(R.string.widget_carregando);
        String vazio = context.getString(R.string.widget_sem_dados);
        int shown = 0;

        if (raw != null) {
            try {
                JSONObject payload = new JSONObject(raw);
                resumo = payload.optString("resumo", resumo);
                vazio = payload.optString("vazio", "");
                JSONArray itens = payload.optJSONArray("itens");
                if (itens != null) {
                    int total = Math.min(itens.length(), MAX_ROWS);
                    for (int i = 0; i < total; i++) {
                        JSONObject item = itens.optJSONObject(i);
                        if (item == null) continue;
                        String hora = item.optString("hora", "--:--");
                        String titulo = item.optString("titulo", "");
                        views.setTextViewText(rowIds[i], hora + "  " + titulo);
                        views.setViewVisibility(rowIds[i], View.VISIBLE);
                        shown++;
                    }
                    int restantes = itens.length() - total;
                    if (restantes > 0 && shown == MAX_ROWS) {
                        views.setTextViewText(rowIds[MAX_ROWS - 1],
                                context.getString(R.string.widget_mais, restantes + 1));
                    }
                }
            } catch (Exception e) {
                resumo = context.getString(R.string.widget_sem_dados);
            }
        }

        for (int i = shown; i < MAX_ROWS; i++) {
            views.setViewVisibility(rowIds[i], View.GONE);
        }
        views.setTextViewText(R.id.widget_resumo, resumo);
        views.setTextViewText(R.id.widget_empty, vazio);
        views.setViewVisibility(R.id.widget_empty,
                vazio == null || vazio.isEmpty() ? View.GONE : View.VISIBLE);

        // Tocar em qualquer lugar abre o app na agenda
        Intent open = new Intent(context, MainActivity.class);
        open.setAction(Intent.ACTION_MAIN);
        open.addCategory(Intent.CATEGORY_LAUNCHER);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        manager.updateAppWidget(widgetId, views);
    }
}
