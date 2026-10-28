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
 * Widget "Tarefas": as tarefas de hoje com o que já foi feito, barra de progresso
 * e quantas ficaram atrasadas. Lê o bloco `tarefas` do payload de widgetPayload(st).
 */
public class TarefasWidget extends AppWidgetProvider {

    private static final int MAX_ROWS = 5;
    private static final int COR_ABERTA = 0xFFE8E8E8;
    private static final int COR_ALTA = 0xFFFF6B00;
    private static final int COR_FEITA = 0xFF6E6E6E;

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TarefasWidget.class));
        for (int id : ids) render(context, manager, id);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) render(context, manager, id);
    }

    private static void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tarefas);
        int[] rowIds = { R.id.tarefa_row_0, R.id.tarefa_row_1, R.id.tarefa_row_2, R.id.tarefa_row_3, R.id.tarefa_row_4 };
        String resumo = context.getString(R.string.widget_carregando);
        String vazio = context.getString(R.string.widget_sem_dados);
        String atrasadas = "";
        int pct = 0;
        int shown = 0;

        SharedPreferences prefs = context.getSharedPreferences(HojeWidget.PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(HojeWidget.KEY_PAYLOAD, null);
        if (raw != null) {
            try {
                JSONObject tarefas = new JSONObject(raw).optJSONObject("tarefas");
                if (tarefas != null) {
                    resumo = tarefas.optString("resumo", resumo);
                    pct = tarefas.optInt("pct", 0);
                    int nAtrasadas = tarefas.optInt("atrasadas", 0);
                    if (nAtrasadas > 0) {
                        atrasadas = nAtrasadas == 1 ? "⚠ 1 atrasada" : "⚠ " + nAtrasadas + " atrasadas";
                    }
                    JSONArray itens = tarefas.optJSONArray("itens");
                    int total = itens == null ? 0 : itens.length();
                    vazio = total == 0 ? context.getString(R.string.widget_tarefas_vazio) : "";
                    for (int i = 0; i < Math.min(total, MAX_ROWS); i++) {
                        JSONObject item = itens.optJSONObject(i);
                        if (item == null) continue;
                        boolean feita = item.optBoolean("feita", false);
                        String hora = item.optString("hora", "");
                        String linha = (feita ? "✓  " : "○  ") + (hora.isEmpty() ? "" : hora + "  ")
                                + item.optString("titulo", "Tarefa");
                        views.setTextViewText(rowIds[i], linha);
                        views.setTextColor(rowIds[i], feita ? COR_FEITA : (item.optBoolean("alta", false) ? COR_ALTA : COR_ABERTA));
                        views.setViewVisibility(rowIds[i], View.VISIBLE);
                        shown++;
                    }
                    if (total > MAX_ROWS && shown == MAX_ROWS) {
                        views.setTextViewText(rowIds[MAX_ROWS - 1], context.getString(R.string.widget_mais, total - MAX_ROWS + 1));
                        views.setTextColor(rowIds[MAX_ROWS - 1], COR_FEITA);
                    }
                }
            } catch (Exception e) {
                resumo = context.getString(R.string.widget_sem_dados);
            }
        }

        for (int i = shown; i < MAX_ROWS; i++) views.setViewVisibility(rowIds[i], View.GONE);
        views.setTextViewText(R.id.tarefa_resumo, resumo);
        views.setProgressBar(R.id.tarefa_progress, 100, pct, false);
        views.setTextViewText(R.id.tarefa_atrasadas, atrasadas);
        views.setViewVisibility(R.id.tarefa_atrasadas, atrasadas.isEmpty() ? View.GONE : View.VISIBLE);
        views.setTextViewText(R.id.tarefa_empty, vazio);
        views.setViewVisibility(R.id.tarefa_empty, vazio.isEmpty() ? View.GONE : View.VISIBLE);

        Intent open = new Intent(context, MainActivity.class);
        open.setAction("com.arthurffc.segundocerebro.OPEN_TAREFAS");
        open.putExtra("sc_open_tab", "tarefas");
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 2, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.tarefa_root, pending);
        manager.updateAppWidget(widgetId, views);
    }
}
