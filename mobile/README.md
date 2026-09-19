# App Android (APK) — widget de tela de início + lembretes offline

Esta pasta empacota o **mesmo** `index.html` da raiz num app Android de verdade, via
[Capacitor](https://capacitorjs.com/). O que só existe aqui e não dá pra ter na PWA:

- **Widget na tela de início** (`Hoje`) com o resumo e os próximos itens do dia.
- **Lembretes agendados no próprio Android** — chegam com o app fechado, sem
  internet e sem servidor nenhum. No APK o motor de notificação do navegador
  desliga sozinho e quem agenda é o sistema.
- Ícone, splash e canal de notificação nativos.

> O código web é o mesmo. `index.html` detecta onde está rodando
> (`window.Capacitor.isNativePlatform()`) e troca o motor de lembretes.

## Pré-requisitos

- **Node 18+** (já usado aqui)
- **[Android Studio](https://developer.android.com/studio)** — traz o JDK e o SDK.
  Sem ele não dá pra compilar; nada aqui na pasta gera APK sozinho.

## Build

```bash
cd mobile
npm install
node sync-www.mjs        # copia index.html, icons/, classes/… para mobile/www
npx cap sync android     # joga www dentro do projeto Android e atualiza plugins
npx cap open android     # abre no Android Studio
```

No Android Studio: **Run ▶** com o celular plugado (Depuração USB ligada), ou
**Build → Build Bundle(s)/APK(s) → Build APK(s)** para gerar o arquivo e instalar
à mão.

Toda vez que mexer no `index.html` da raiz, repita:

```bash
node sync-www.mjs && npx cap sync android
```

## Instalar o widget

Segure um espaço vazio na tela de início → **Widgets** → **Segundo Cérebro** →
arraste o widget **Hoje** ou **Pendências**.

O widget lê um JSON guardado em `SharedPreferences`. Quem escreve é o app web:

```
index.html  →  widgetPayload(st)  →  WidgetBridge.update({payload})
                                          ↓ SharedPreferences("sc_widget")
                                     HojeWidget.java  →  desenha o card
```

Ele se redesenha na hora sempre que o app está aberto e alguma coisa muda, e
sozinho a cada 30 min (limite do Android para `updatePeriodMillis`). Tocar no
widget abre o app.

## O que fica onde

| Arquivo | Papel |
|---|---|
| `capacitor.config.json` | id do app, nome, `webDir`, ícone de notificação |
| `sync-www.mjs` | copia o app web da raiz para `www/` |
| `android/app/src/main/java/.../HojeWidget.java` | o widget (desenha o card) |
| `android/app/src/main/java/.../PendenciasWidget.java` | o atalho das pendências abertas |
| `android/app/src/main/java/.../WidgetBridgePlugin.java` | ponte JS → widget |
| `android/app/src/main/res/layout/widget_hoje.xml` | layout do widget |
| `android/app/src/main/res/xml/widget_hoje_info.xml` | tamanho, preview, refresh |

`www/` e `android/app/src/main/assets/public/` são **gerados** — estão no
`.gitignore`. Rode `sync-www.mjs` + `cap sync` depois de clonar.

## Limitações que você precisa saber

- **Login com Google (aba ☁️ Sync) provavelmente não funciona dentro do APK.**
  O Google bloqueia OAuth em WebView (`disallowed_useragent`), e é isso que o
  Capacitor usa. Os dados locais funcionam normal; a sincronização entre
  aparelhos, não. Duas saídas:
  1. Usar a **PWA instalada** (Chrome → Instalar app) quando quiser sync, e o APK
     pelo widget. Ambos leem o mesmo `localStorage`? **Não** — são origens
     diferentes, cada um tem seu próprio banco.
  2. Adicionar o plugin `@capacitor-firebase/authentication`, que faz o login com
     a conta nativa do Android e devolve a credencial pro SDK JS. Exige
     `google-services.json` e cadastrar a impressão digital SHA-1 no Firebase.

  Enquanto isso não for feito, trate o APK como um app **local** (com widget e
  lembretes offline) e use `Config → 💾 Dados → Exportar/Importar` pra mover o
  estado entre ele e a PWA.
- **Push (o robô do GitHub) não vale aqui** — e nem precisa: os lembretes já são
  agendados no sistema, o que é mais confiável que push.
- **Play Store:** publicar exige conta de desenvolvedor (US$ 25, uma vez) e
  assinatura de release. Para uso pessoal, instalar o APK direto resolve.
- **Não foi possível compilar aqui:** esta máquina não tem JDK/Android SDK, então
  o projeto foi montado e revisado, mas o `gradle build` ainda não rodou nenhuma
  vez. Se o Android Studio reclamar de algo na primeira build, é aí que vai
  aparecer.
