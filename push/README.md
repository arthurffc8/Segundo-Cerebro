# Push — lembretes com o app fechado

O app sozinho só consegue avisar enquanto está aberto (nem que seja em segundo plano).
Pra receber com ele **totalmente fechado**, quem avisa é este robô: um workflow do
GitHub Actions que roda de 15 em 15 minutos, lê seu estado no Firestore e dispara
**Web Push** para os aparelhos inscritos.

```
app (index.html) ──inscrição──▶ Firestore: push/{uid}/subs/{aparelho}
app ──estado (3s debounce)───▶ Firestore: cerebro/{uid}
                                      │
GitHub Actions (*/15 min) ────────────┘
   └─ recalcula a agenda do dia no seu fuso
   └─ manda o push ──▶ celular / PC ──▶ sw.js mostra a notificação
```

## Ligar (uma vez só)

### 1. Conta de serviço do Firebase

1. [Console do Firebase](https://console.firebase.google.com/) → seu projeto →
   ⚙️ **Configurações do projeto** → aba **Contas de serviço**.
2. **Gerar nova chave privada** → baixa um `.json`.
3. No GitHub: repositório → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**:
   - Nome: `FIREBASE_SERVICE_ACCOUNT`
   - Valor: o **conteúdo inteiro** do `.json` (abre no bloco de notas, copia tudo).

### 2. Chave privada VAPID

O par de chaves já foi gerado e está em **`push/VAPID.local.txt`** (esse arquivo está
no `.gitignore` — não é publicado). A pública já está embutida no `index.html`.

Crie mais um secret:
- Nome: `VAPID_PRIVATE_KEY`
- Valor: a linha da chave privada que está nesse arquivo.

Opcionais (o script tem padrão pra ambos):
- `VAPID_PUBLIC_KEY`
- `VAPID_SUBJECT` — um `mailto:` seu.

> Se algum dia você perder o `VAPID.local.txt`, gere um par novo com
> `npx web-push generate-vapid-keys` e troque **as duas** pontas (a pública no
> `index.html`, a privada no secret). Trocar só uma quebra todas as inscrições.

### 3. Regras do Firestore

A coleção nova `push` precisa ser gravável pelo dono. No console → Firestore →
**Regras**, garanta algo como:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cerebro/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /push/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /subs/{device} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

A conta de serviço do robô ignora essas regras (usa o Admin SDK) — elas existem só
pra proteger o acesso pelo navegador.

### 4. No app

**Config → 🔔 Alertas**:
1. Entre com o Google em **☁️ Sync** (o push precisa de um `uid`).
2. Ligue os **lembretes**.
3. Em **📡 Push (app fechado)**, toque em **Ativar push neste dispositivo**.

Repita o passo 3 em cada aparelho — celular e PC se inscrevem separado.

## Testar sem esperar o cron

GitHub → aba **Actions** → **Lembretes push** → **Run workflow**.
Marque *Só simular* para ver no log o que ele mandaria, sem enviar nada.

Localmente:

```bash
cd push
npm install
FIREBASE_SERVICE_ACCOUNT="$(cat ../serviceAccount.json)" VAPID_PRIVATE_KEY="..." DRY_RUN=1 node send-reminders.mjs
```

## Detalhes que importam

- **O cron do GitHub atrasa.** `*/15` é o alvo; na prática costuma sair entre 0 e 10
  minutos depois. Para *resumo da manhã*, *fechamento da noite* e *tarefa das 14:30*
  isso é irrelevante. Se um dia você quiser precisão de minuto, o mesmo script roda
  igual num Cron Trigger do Cloudflare Workers.
- **Janela de recuperação:** o robô considera vencido o que caiu nos últimos
  `LOOKBACK_MIN` minutos (25 por padrão), então um atraso do runner não perde o aviso.
- **Sem duplicata:** cada lembrete guarda `AAAA-MM-DD|chave` em `push/{uid}.sent`, e o
  robô também respeita o que o app já marcou em `notif.fired`. Com push ligado, o app
  reduz sua própria janela de atraso de 90 para 5 minutos.
- **Inscrição morta** (navegador desinstalado, permissão revogada): o servidor recebe
  404/410 e apaga o aparelho sozinho.
- **iPhone:** Web Push exige iOS 16.4+ **e** o app adicionado à Tela de Início.
- **Custo:** zero. GitHub Actions é gratuito em repositório público; Firestore fica
  muito abaixo da cota gratuita com uma leitura a cada 15 minutos.
