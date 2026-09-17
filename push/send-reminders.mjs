/**
 * Robô de lembretes do Segundo Cérebro.
 *
 * Roda no GitHub Actions de 15 em 15 minutos: lê o estado de cada usuário no
 * Firestore (coleção `cerebro`), recalcula a agenda do dia no fuso do próprio
 * usuário e dispara Web Push para os aparelhos inscritos (`push/{uid}/subs`).
 *
 * Espelha a lógica de `notifPlan()` do index.html — se mudar lá, mude aqui.
 */
import admin from 'firebase-admin';
import webpush from 'web-push';
import { pathToFileURL } from 'node:url';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
|| 'BLeil436bCq8Zww8ErlzPhiYGlRkKNDucR9qf4s-PskFRbVdiQpbmVswO6TOfEeYOAWGtOIYGQEHMXC_-CDbswWk';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:arthursferreira52@gmail.com';
// Janela de atraso tolerada: o cron do GitHub costuma atrasar alguns minutos.
const LOOKBACK_MIN = Number(process.env.LOOKBACK_MIN || 25);
const DRY_RUN = process.env.DRY_RUN === '1';

function boot() {
  if (!VAPID_PRIVATE) {
    console.error('Falta o secret VAPID_PRIVATE_KEY.');
    process.exit(1);
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('Falta o secret FIREBASE_SERVICE_ACCOUNT.');
    process.exit(1);
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
  return admin.firestore();
}

// ── helpers ────────────────────────────────────────────────────────────────

const NOTIF_DEF = {
  on: false,
  manha: { on: true, hora: '07:30' },
  noite: { on: true, hora: '21:00' },
  tarefas: { on: true },
  eventos: { on: true, lead: 15 },
  fired: {},
};

function notifCfg(state) {
  const n = (state && state.notif) || {};
  return {
    ...NOTIF_DEF, ...n,
    manha: { ...NOTIF_DEF.manha, ...(n.manha || {}) },
    noite: { ...NOTIF_DEF.noite, ...(n.noite || {}) },
    tarefas: { ...NOTIF_DEF.tarefas, ...(n.tarefas || {}) },
    eventos: { ...NOTIF_DEF.eventos, ...(n.eventos || {}) },
    fired: n.fired || {},
  };
}

/** Data (YYYY-MM-DD) e minutos desde a meia-noite no fuso do usuário. */
function localNow(tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((a, p) => (a[p.type] = p.value, a), {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

function habitDayStats(state, ds) {
  const hs = (state.habits || []).filter((h) => h.active);
  const log = (state.habitLog || {})[ds] || {};
  const done = hs.filter((h) => log[h.id]).length;
  return { tot: hs.length, done };
}

function pendingToday(state, ds) {
  const tasks = (state.tasks || []).filter((t) => t.date === ds && !t.done).length;
  const h = habitDayStats(state, ds);
  const habits = Math.max(0, h.tot - h.done);
  return { tasks, habits, total: tasks + habits };
}

/** Mesma agenda do app, em minutos do dia. */
function plan(state, c, ds) {
  const out = [];
  const tasks = (state.tasks || []).filter((t) => t.date === ds);
  const evs = (state.eventos || []).filter((e) => e.date === ds);
  const h = habitDayStats(state, ds);
  const pend = tasks.filter((t) => !t.done).length;

  if (c.manha.on) {
    const p = [];
    if (pend) p.push(`${pend} tarefa${pend > 1 ? 's' : ''}`);
    if (evs.length) p.push(`${evs.length} evento${evs.length > 1 ? 's' : ''}`);
    if (h.tot) p.push(`${h.tot} hábito${h.tot > 1 ? 's' : ''}`);
    out.push({
      key: 'manha', min: toMin(c.manha.hora),
      title: `☀️ Bom dia${state.user && state.user.name ? ', ' + state.user.name : ''}!`,
      body: p.length ? 'Hoje você tem ' + p.join(' · ') : 'Nada agendado — dia livre pra atacar as metas.',
      tab: 'tarefas',
    });
  }

  if (c.noite.on) {
    const falta = Math.max(0, h.tot - h.done);
    let body;
    if (!falta && !pend) body = 'Dia fechado 100%. Descansa, guerreiro. 👑';
    else {
      const p = [];
      if (pend) p.push(`${pend} tarefa${pend > 1 ? 's' : ''}`);
      if (falta) p.push(`${falta} hábito${falta > 1 ? 's' : ''}`);
      body = `Ainda dá tempo: ${p.join(' e ')} pendente${(pend + falta) > 1 ? 's' : ''}.`;
    }
    out.push({ key: 'noite', min: toMin(c.noite.hora), title: '🌙 Fechamento do dia', body, tab: 'tarefas' });
  }

  if (c.tarefas.on) {
    for (const t of tasks) {
      if (!t.time || t.done) continue;
      out.push({
        key: 't:' + t.id, min: toMin(t.time), title: '✅ ' + t.title,
        body: t.time + (t.prio === 'alta' ? ' · prioridade alta' : ' · na sua agenda de hoje'),
        tab: 'tarefas',
      });
    }
  }

  if (c.eventos.on) {
    const lead = Math.max(0, c.eventos.lead || 0);
    for (const e of evs) {
      if (!e.time) continue;
      const min = toMin(e.time) - lead;
      if (min < 0) continue; // cairia no dia anterior — deixa pro app avisar
      out.push({
        key: 'e:' + e.id, min,
        title: (e.emoji || '📌') + ' ' + e.title,
        body: (lead ? `Começa em ${lead} min` : 'Começa agora') + ` (${e.time})` + (e.local ? ' · ' + e.local : ''),
        tab: 'tarefas',
      });
    }
  }

  return out;
}

// ── execução ───────────────────────────────────────────────────────────────

async function run() {
  const db = boot();
  const parents = await db.collection('push').listDocuments();
  console.log(`[push] ${parents.length} usuário(s) inscrito(s)`);
  let enviados = 0;

  for (const ref of parents) {
    const uid = ref.id;
    try {
      const [metaSnap, subsSnap, stateSnap] = await Promise.all([
        ref.get(),
        ref.collection('subs').get(),
        db.collection('cerebro').doc(uid).get(),
      ]);
      if (subsSnap.empty) { console.log(`[${uid}] sem aparelhos inscritos`); continue; }
      if (!stateSnap.exists) { console.log(`[${uid}] sem estado no Firestore`); continue; }

      let state;
      try { state = JSON.parse(stateSnap.data().data); }
      catch { console.log(`[${uid}] estado ilegível`); continue; }

      const c = notifCfg(state);
      if (!c.on) { console.log(`[${uid}] lembretes desligados no app`); continue; }

      const meta = metaSnap.exists ? (metaSnap.data() || {}) : {};
      const tz = meta.tz || 'America/Sao_Paulo';
      const { date, minutes } = localNow(tz);
      const sent = meta.sent || {};
      const fired = c.fired || {};

      const due = plan(state, c, date).filter((p) => {
        const k = `${date}|${p.key}`;
        if (sent[k] || fired[k]) return false;               // já avisado pelo robô ou pelo app
        return p.min <= minutes && minutes - p.min < LOOKBACK_MIN;
      });

      if (!due.length) { console.log(`[${uid}] ${date} ${minutes}min · nada vencido`); continue; }

      const badge = pendingToday(state, date).total;
      const subs = subsSnap.docs;

      for (const p of due) {
        const payload = JSON.stringify({ title: p.title, body: p.body, tab: p.tab, tag: 'sc-' + p.key, badge });
        for (const d of subs) {
          const s = d.data();
          if (DRY_RUN) { console.log(`[${uid}] (dry) ${p.key} → ${d.id}`); continue; }
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload);
            enviados++;
          } catch (err) {
            const code = err && err.statusCode;
            if (code === 404 || code === 410) {
              console.log(`[${uid}] inscrição morta (${code}) — removendo ${d.id}`);
              await d.ref.delete();
            } else {
              console.log(`[${uid}] falha ao enviar ${p.key} → ${d.id}: ${code || err.message}`);
            }
          }
        }
      }

      if (!DRY_RUN) {
        // guarda só as marcas de hoje (limpa dias antigos de quebra)
        const novo = {};
        for (const k of Object.keys(sent)) if (k.startsWith(date + '|')) novo[k] = true;
        for (const p of due) novo[`${date}|${p.key}`] = true;
        await ref.set({ sent: novo, lastRun: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }

      console.log(`[${uid}] ${due.length} lembrete(s) × ${subs.length} aparelho(s)`);
    } catch (err) {
      console.error(`[${uid}] erro:`, err.message);
    }
  }

  console.log(`[push] ${enviados} notificação(ões) entregue(s)`);
}

export { plan, localNow, notifCfg, pendingToday, habitDayStats };

// só executa quando chamado direto (permite importar as funções em testes)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
