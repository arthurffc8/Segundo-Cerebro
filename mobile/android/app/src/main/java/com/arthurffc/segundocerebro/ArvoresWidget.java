package com.arthurffc.segundocerebro;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget "Árvores de talento": nível/classe do jogador com a barra até o próximo
 * nível e o progresso de cada área (níveis subidos / níveis possíveis), na cor da
 * própria árvore. Lê o bloco `arvores` do payload de widgetPayload(st).
 */
public class ArvoresWidget extends AppWidgetProvider {

    private static final int MAX_ROWS = 5;

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, ArvoresWidget.class));
        for (int id : ids) render(context, manager, id);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) render(context, manager, id);
    }

    private static void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_arvores);
        int[] rowIds = { R.id.arvore_row_0, R.id.arvore_row_1, R.id.arvore_row_2, R.id.arvore_row_3, R.id.arvore_row_4 };
        int[] nomeIds = { R.id.arvore_nome_0, R.id.arvore_nome_1, R.id.arvore_nome_2, R.id.arvore_nome_3, R.id.arvore_nome_4 };
        int[] valorIds = { R.id.arvore_valor_0, R.id.arvore_valor_1, R.id.arvore_valor_2, R.id.arvore_valor_3, R.id.arvore_valor_4 };
        int[] barIds = { R.id.arvore_bar_0, R.id.arvore_bar_1, R.id.arvore_bar_2, R.id.arvore_bar_3, R.id.arvore_bar_4 };
        String resumo = context.getString(R.string.widget_carregando);
        String vazio = context.getString(R.string.widget_sem_dados);
        int pctNivel = 0;
        int shown = 0;

        SharedPreferences prefs = context.getSharedPreferences(HojeWidget.PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(HojeWidget.KEY_PAYLOAD, null);
        if (raw != null) {
            try {
                JSONObject bloco = new JSONObject(raw).optJSONObject("arvores");
                if (bloco != null) {
                    resumo = bloco.optString("resumo", resumo);
                    pctNivel = bloco.optInt("pctNivel", 0);
                    JSONArray arvores = bloco.optJSONArray("arvores");
                    int total = arvores == null ? 0 : arvores.length();
                    vazio = total == 0 ? context.getString(R.string.widget_arvores_vazio) : "";
                    for (int i = 0; i < Math.min(total, MAX_ROWS); i++) {
                        JSONObject a = arvores.optJSONObject(i);
                        if (a == null) continue;
                        int cor = parseCor(a.optString("cor", ""));
                        views.setTextViewText(nomeIds[i], a.optString("emoji", "🌳") + "  " + a.optString("nome", "Área"));
                        views.setTextColor(nomeIds[i], cor);
                        views.setTextViewText(valorIds[i], a.optInt("nivel", 0) + "/" + a.optInt("max", 0) + "  ·  " + a.optInt("pct", 0) + "%");
                        views.setProgressBar(barIds[i], 100, a.optInt("pct", 0), false);
                        views.setViewVisibility(rowIds[i], View.VISIBLE);
                        shown++;
                    }
                }
            } catch (Exception e) {
                resumo = context.getString(R.string.widget_sem_dados);
            }
        }

        for (int i = shown; i < MAX_ROWS; i++) views.setViewVisibility(rowIds[i], View.GONE);
        views.setTextViewText(R.id.arvore_resumo, resumo);
        views.setProgressBar(R.id.arvore_nivel_bar, 100, pctNivel, false);
        views.setTextViewText(R.id.arvore_empty, vazio);
        views.setViewVisibility(R.id.arvore_empty, vazio.isEmpty() ? View.GONE : View.VISIBLE);

        Intent open = new Intent(context, MainActivity.class);
        open.setAction("com.arthurffc.segundocerebro.OPEN_SKILLTREE");
        open.putExtra("sc_open_tab", "skilltree");
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 3, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.arvore_root, pending);
        manager.updateAppWidget(widgetId, views);
    }

    private static int parseCor(String hex) {
        try {
            return Color.parseColor(hex);
        } catch (Exception e) {
            return 0xFFF5D98C;
        }
    }
}
