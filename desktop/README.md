# App de PC (.exe) — wrapper Tauri

Empacota o **mesmo** `index.html` da raiz num aplicativo de desktop com instalador
próprio. Diferente da PWA instalada pelo Edge/Chrome, aqui você ganha:

- **Instalador `.exe` (NSIS) e `.msi`** — o app aparece em *Adicionar ou remover
  programas*, sem depender de navegador nenhum.
- **Ícone na bandeja**: fechar a janela **esconde** em vez de encerrar, então os
  lembretes continuam saindo com o app "fechado".
- **Iniciar com o Windows** (plugin autostart já incluído).
- Notificações pelo sistema, via `tauri-plugin-notification` — o `index.html`
  detecta o Tauri e troca o caminho de envio sozinho.

## Pré-requisitos (Windows)

1. **Rust** — https://rustup.rs (instala `cargo`).
2. **Microsoft C++ Build Tools** — o instalador do Rust avisa e linka; escolha a
   carga de trabalho *Desktop development with C++*.
3. **WebView2** — já vem no Windows 10/11 atualizado.
4. Node 18+.

## Build

```bash
cd desktop
npm install
npm run dev      # abre a janela em modo desenvolvimento
npm run build    # gera o instalador
```

O instalador sai em:

```
desktop/src-tauri/target/release/bundle/nsis/Segundo Cérebro_1.0.0_x64-setup.exe
desktop/src-tauri/target/release/bundle/msi/Segundo Cérebro_1.0.0_x64_en-US.msi
```

Mexeu no `index.html` da raiz? `npm run dev` e `npm run build` já rodam o
`sync-dist.mjs` antes — não precisa copiar nada à mão.

> A primeira compilação baixa e compila o Tauri inteiro: espere de 5 a 15 minutos.
> As seguintes são rápidas.

## Ligar o "iniciar com o Windows"

O plugin está registrado, mas quem decide é você. No console do app (ou numa
futura opção em Config):

```js
await window.__TAURI__.core.invoke('plugin:autostart|enable')
```

Para desligar, `plugin:autostart|disable`.

## Detalhes

- **Sem service worker.** O Tauri serve os arquivos por um protocolo próprio, que
  não suporta SW. Por isso `sync-dist.mjs` nem copia o `sw.js`, e o `index.html`
  pula o registro quando detecta o Tauri. Consequência prática: o **push** do
  robô do GitHub não vale aqui — e nem faz falta, já que o app fica na bandeja.
- **Dados são separados.** O `localStorage` do app de PC é outro banco, diferente
  do navegador. Para levar seus dados: `Config → 💾 Dados → Exportar` no
  navegador, `Importar` no app — ou entre com o Google em `☁️ Sync` nos dois
  (aqui o login funciona: o WebView2 não é bloqueado como a WebView do Android).
- **macOS / Linux:** o código é o mesmo; troque `bundle.targets` em
  `tauri.conf.json` para `["dmg"]` ou `["deb", "appimage"]` e gere um
  `icons/icon.icns` (o `.ico` só serve pro Windows).
- **Não foi possível compilar aqui:** esta máquina não tem Rust instalado, então
  o projeto foi escrito e revisado, mas o `cargo build` ainda não rodou. Se algo
  quebrar, será na primeira compilação.
