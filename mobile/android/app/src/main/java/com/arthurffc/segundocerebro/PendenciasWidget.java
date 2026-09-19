package com.arthurffc.segundocerebro;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

public class PendenciasWidget extends AppWidgetProvider {

    private static final int MAX_ROWS = 4;

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new android.content.ComponentName(context, PendenciasWidget.class));
        for (int id : ids) render(context, manager, id);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) render(context, manager, id);
    }

    private static void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_pendencias);
        int[] rowIds = { R.id.pendencia_row_0, R.id.pendencia_row_1, R.id.pendencia_row_2, R.id.pendencia_row_3 };
        int shown = 0;
        String resumo = context.getString(R.string.widget_carregando);
        String vazio = context.getString(R.string.widget_sem_dados);

        SharedPreferences prefs = context.getSharedPreferences(HojeWidget.PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(HojeWidget.KEY_PAYLOAD, null);
        if (raw != null) {
            try {
                JSONObject payload = new JSONObject(raw);
                JSONArray pendencias = payload.optJSONArray("pendencias");
                int total = pendencias == null ? 0 : Math.min(pendencias.length(), MAX_ROWS);
                resumo = total == 1 ? "1 pendência aberta" : (pendencias == null ? "0 pendências abertas" : pendencias.length() + " pendências abertas");
                vazio = total == 0 ? context.getString(R.string.widget_pendencias_vazio) : "";
                for (int i = 0; i < total; i++) {
                    JSONObject item = pendencias.optJSONObject(i);
                    if (item == null) continue;
                    views.setTextViewText(rowIds[i], "• " + item.optString("titulo", "Pendência"));
                    views.setViewVisibility(rowIds[i], View.VISIBLE);
                    shown++;
                }
                if (pendencias != null && pendencias.length() > MAX_ROWS && shown == MAX_ROWS) {
                    views.setTextViewText(rowIds[MAX_ROWS - 1], context.getString(R.string.widget_mais, pendencias.length() - MAX_ROWS + 1));
                }
            } catch (Exception e) {
                resumo = context.getString(R.string.widget_sem_dados);
            }
        }

        for (int i = shown; i < MAX_ROWS; i++) views.setViewVisibility(rowIds[i], View.GONE);
        views.setTextViewText(R.id.pendencia_resumo, resumo);
        views.setTextViewText(R.id.pendencia_empty, vazio);
        views.setViewVisibility(R.id.pendencia_empty, vazio.isEmpty() ? View.GONE : View.VISIBLE);

        Intent open = new Intent(context, MainActivity.class);
        open.setAction("com.arthurffc.segundocerebro.OPEN_PENDENCIAS");
        open.putExtra("sc_open_tab", "tarefas");
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.pendencia_root, pending);
        manager.updateAppWidget(widgetId, views);
    }
}
