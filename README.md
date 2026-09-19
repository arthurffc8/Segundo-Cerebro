# Segundo Cérebro

Sistema de organização pessoal gamificado: tarefas, agenda, hábitos, metas,
finanças, skill tree e RPG — tudo num `index.html` só (React 18 + Babel no
navegador, Firebase para sync, `localStorage` para o resto).

Publicado em **https://arthurffc8.github.io/Segundo-Cerebro/**

## As quatro formas de rodar

| | Como instalar | Lembretes | Widget |
|---|---|---|---|
| **Navegador** | é só abrir o link | com o app aberto | — |
| **PWA instalada** | menu do navegador → *Instalar app* | app aberto/segundo plano, + **push** com ele fechado | painel de widgets do Windows 11 |
| **APK Android** | [`mobile/`](mobile/README.md) | agendados no sistema, offline | **tela de início** |
| **App de PC** | [`desktop/`](desktop/README.md) | app na bandeja | — |

Todos rodam o **mesmo** `index.html`. Ele detecta onde está
(`Capacitor.isNativePlatform()`, `window.__TAURI__`) e troca o motor de lembretes.

## Estrutura

```
index.html          o app inteiro
sw.js               service worker: cache, notificações, push, widget do Windows
manifest.json       PWA: ícones, atalhos, share target, widget
icons/              conjunto PNG (any, maskable, monochrome, badge)
widgets/            cards dos widgets do Windows 11 e Android
classes/            arte das classes de RPG (trocar o arquivo troca a arte)
push/               robô de lembretes → veja push/README.md
mobile/             projeto Capacitor (APK + widget) → mobile/README.md
desktop/            projeto Tauri (.exe) → desktop/README.md
.github/workflows/  cron que dispara os lembretes push
```

## Notificações — quem avisa em cada caso

- **App aberto (qualquer plataforma):** o próprio `index.html` confere a agenda a
  cada 30 s e dispara. Reabriu depois da hora? Um lembrete atrasado em até 90 min
  ainda sai.
- **PWA fechada:** o [robô do GitHub Actions](push/README.md) lê seu estado no
  Firestore de 15 em 15 min e manda Web Push.
- **APK fechado:** os lembretes já estão agendados no Android — não depende de
  servidor nem de internet.
- **App de PC fechado:** a janela some para a bandeja, mas o processo continua
  rodando e avisando.

Tudo se configura em **Config → 🔔 Alertas**.
