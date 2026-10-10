// Fonction Netlify « compteur » — statistiques d'usage anonymes de l'outil ROI IA.
// Stockage : Netlify Blobs (store « compteur », clé « stats »). Aucune donnée personnelle :
// ni adresse IP, ni identifiant, ni cookie ; seuls des compteurs agrégés sont conservés.
//   GET  /api/compteur            → statistiques publiques (totaux, 30 derniers jours, répartitions)
//   POST /api/compteur {ev,...}   → incrémente un compteur (ev : visite | evaluation | installation)
import { getStore } from './netlify-blobs-src/main.ts';

export const config = { path: '/api/compteur' };

export const EVENTS = ['visite', 'evaluation', 'installation'];
const KEEP_DAYS = 400;
const ID_RE = /^[a-z0-9_-]{1,24}$/;

export function todayParis(d = new Date()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function fresh(today) {
  return { depuis: today, maj: today, total: { visite: 0, evaluation: 0, installation: 0 }, jours: {}, parProfil: {}, parNature: {} };
}
function clean(v) { return typeof v === 'string' && ID_RE.test(v) ? v : null; }

export function applyEvent(s, ev, meta, today) {
  if (!EVENTS.includes(ev)) return false;
  s.total = s.total || {}; s.jours = s.jours || {}; s.parProfil = s.parProfil || {}; s.parNature = s.parNature || {};
  s.total[ev] = (s.total[ev] || 0) + 1;
  const d = s.jours[today] || (s.jours[today] = { visite: 0, evaluation: 0, installation: 0 });
  d[ev] = (d[ev] || 0) + 1;
  if (ev === 'evaluation' && meta) {
    const p = clean(meta.prof), n = clean(meta.nat);
    if (p) s.parProfil[p] = (s.parProfil[p] || 0) + 1;
    if (n) s.parNature[n] = (s.parNature[n] || 0) + 1;
  }
  s.maj = today;
  const keys = Object.keys(s.jours).sort();
  while (keys.length > KEEP_DAYS) delete s.jours[keys.shift()];
  return true;
}

export function publicView(s, today) {
  const days = Object.keys(s.jours || {}).sort();
  // 30 derniers jours calendaires, jours vides inclus
  const serie = [];
  const end = new Date(today + 'T12:00:00Z');
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10);
    const j = (s.jours || {})[dt] || {};
    serie.push({ d: dt, visite: j.visite || 0, evaluation: j.evaluation || 0, installation: j.installation || 0 });
  }
  const sum = (k, from) => days.filter((d) => d >= from).reduce((a, d) => a + ((s.jours[d] || {})[k] || 0), 0);
  const d30 = serie[0].d;
  return {
    depuis: s.depuis, maj: s.maj, total: s.total || {},
    trenteJours: { visite: sum('visite', d30), evaluation: sum('evaluation', d30), installation: sum('installation', d30) },
    jours30: serie, parProfil: s.parProfil || {}, parNature: s.parNature || {},
  };
}

export default async (req) => {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  const today = todayParis();
  let store;
  try { store = getStore({ name: 'compteur', consistency: 'strong' }); }
  catch (e) { return new Response(JSON.stringify({ ok: false, erreur: 'stockage indisponible' }), { status: 503, headers }); }

  if (req.method === 'GET') {
    const s = (await store.get('stats', { type: 'json' })) || fresh(today);
    return new Response(JSON.stringify(publicView(s, today)), { headers });
  }
  if (req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const s = (await store.get('stats', { type: 'json' })) || fresh(today);
    if (!applyEvent(s, body && body.ev, body, today)) {
      return new Response(JSON.stringify({ ok: false, erreur: 'événement inconnu' }), { status: 400, headers });
    }
    await store.setJSON('stats', s);
    return new Response(JSON.stringify({ ok: true, total: s.total }), { headers });
  }
  return new Response('', { status: 405, headers: { Allow: 'GET, POST' } });
};
