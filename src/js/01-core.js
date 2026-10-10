/* ============================================================
   ROI IA Hospitalière v8 — noyau : données, état, utilitaires,
   navigation, stockage local, liens de sauvegarde
   ============================================================ */
'use strict';

const D = JSON.parse(document.getElementById('app-data').textContent);
const APP_VERSION = D.version;
const LS_KEY = 'roiia.evals.v1';
const LS_PREFS = 'roiia.prefs.v1';

/* ---------- utilitaires ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt1 = (n) => (n == null || isNaN(n)) ? '—' : (Math.round(n * 10) / 10).toFixed(1);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const uid = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => { if (!iso) return ''; const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')); return isNaN(d) ? iso : d.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', year: 'numeric'}); };
const scoreColor = (s) => s == null ? '#5A6880' : s >= 4 ? '#0F6E56' : s >= 3 ? '#BA7517' : '#A32D2D';
const scoreCls = (s) => s == null ? 'ns' : s >= 4 ? 'ok' : s >= 3 ? 'warn' : 'risk';

function toast(msg, ms) {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms || 2200);
}
function fmtEur(n) {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n), sign = n < 0 ? '−' : '';
  if (a >= 1e6) return sign + (a / 1e6).toFixed(2).replace('.', ',') + ' M€';
  if (a >= 1e3) return sign + Math.round(a / 1e3) + ' k€';
  return sign + Math.round(a) + ' €';
}

/* ---------- état ---------- */
function freshState() {
  return {
    evalId: null, pn: '', dom: '', prof: '', stage: D.STAGES[0], si: '', rh: '', ch: '',
    nature: 'medical', scores: {}, weights: {}, wCustom: false, calc: {}, er: null,
    dt: todayISO(), step: 0, rmDone: {}, clDone: {}
  };
}
let state = freshState();

/* ---------- profils et familles ---------- */
const PROFILE_BY_ID = {}; D.PROFILES.forEach((p) => { PROFILE_BY_ID[p.id] = p; });
const NATURE_BY_ID = {}; D.NATURES.forEach((n) => { NATURE_BY_ID[n.id] = n; });
function profileLabel(id) { const p = PROFILE_BY_ID[id]; return p ? p.label : (id || '—'); }
function natureLabel(id) { return D.NATURE_LABELS[id] || id || '—'; }

function famsForNature(nat, prof) {
  const spec = D.FAM_SPECIFIC[nat] || D.FAM_SPECIFIC.medical;
  const univ = D.FAM_UNIVERSAL.filter((f) => f.id !== 'financier');
  let fin = D.FAM_UNIVERSAL.find((f) => f.id === 'financier');
  const p = PROFILE_BY_ID[prof];
  if (p && p.mutualisation) fin = Object.assign({}, fin, {criteria: fin.criteria.concat([D.FIN_MUTUALISATION])});
  return [spec.f1, D.FAM_OPERATIONNEL].concat(univ, [spec.f7, fin, D.FAM_ENV]);
}
function getFamilies() { return famsForNature(state.nature, state.prof); }
function famById(id, fams) { return (fams || getFamilies()).find((f) => f.id === id); }
function radarLabel(f) { return D.RADAR_LABELS[f.id] || f.name; }
function dimHelp(f) { if (D.DIM_HELP[f.id]) return D.DIM_HELP[f.id]; if (f.id.indexOf('cadre') === 0) return D.DIM_HELP.cadre; return ''; }
function f1Id(nat) { return (D.FAM_SPECIFIC[nat] || D.FAM_SPECIFIC.medical).f1.id; }
function f7Id(nat) { return (D.FAM_SPECIFIC[nat] || D.FAM_SPECIFIC.medical).f7.id; }

function baseWeightsFor(prof, nat) {
  const p = PROFILE_BY_ID[prof] || D.PROFILES[0];
  const w = {};
  famsForNature(nat, prof).forEach((f) => {
    const key = f.id === f1Id(nat) ? 'f1' : f.id === f7Id(nat) ? 'f7' : f.id;
    w[f.id] = p.weights[key] != null ? p.weights[key] : 3;
  });
  return w;
}
function applyAutoWeights() {
  state.weights = baseWeightsFor(state.prof, state.nature);
  state.wCustom = false;
  if (state.si === 'fragile' || state.si === 'moyen') state.weights.dettes = clamp((state.weights.dettes || 3) + 1, 1, 5);
  if (state.rh === 'forte') state.weights.acceptabilite = clamp((state.weights.acceptabilite || 3) + 1, 1, 5);
  if (state.ch === 'faible') state.weights.dettes = clamp((state.weights.dettes || 3) + 1, 1, 5);
}
function ensureWeights() {
  const base = baseWeightsFor(state.prof, state.nature);
  if (!state.weights || !Object.keys(state.weights).length) { applyAutoWeights(); return; }
  Object.keys(base).forEach((k) => { if (state.weights[k] == null) state.weights[k] = base[k]; });
}

/* ---------- migrations (liens v6 / v7) ---------- */
function migrateScores(sc) {
  const out = Object.assign({}, sc || {});
  if (out.fi3 != null && out.e1 == null) out.e1 = out.fi3;
  if (out.a4 != null && out.e3 == null) out.e3 = out.a4;
  delete out.fi3; delete out.a4;
  return out;
}

/* ---------- calcul ---------- */
function computeFor(scores, weights, nat, prof) {
  const fams = famsForNature(nat, prof);
  const dims = {}, cov = {rated: 0, total: 0, na: 0};
  let sumW = 0, total = 0;
  fams.forEach((f) => {
    let s = 0, n = 0;
    f.criteria.forEach((c) => {
      cov.total++;
      const v = scores[c[0]];
      if (v === 0 || v === null) { cov.na++; return; }
      if (v >= 1) { s += v; n++; cov.rated++; }
    });
    const avg = n ? Math.round((s / n) * 10) / 10 : null;
    dims[f.id] = avg;
    if (avg != null) { const w = weights[f.id] || 3; sumW += w; total += avg * w; }
  });
  return {dims, global: sumW ? Math.round((total / sumW) * 10) / 10 : null, coverage: cov, fams};
}
function compute() { return computeFor(state.scores, state.weights, state.nature, state.prof); }
function verdictInfo(s) {
  if (s == null) return {text: 'Évaluation incomplète', color: '#5A6880', cls: 'ns'};
  if (s >= 4.2) return {text: "Conditions favorables à l'investissement", color: '#0F6E56', cls: 'ok'};
  if (s >= 3.5) return {text: 'Investissement envisageable avec précautions', color: '#BA7517', cls: 'warn'};
  if (s >= 2.8) return {text: 'Risques notables, analyse approfondie requise', color: '#D85A30', cls: 'warn'};
  if (s >= 2.0) return {text: 'Risques significatifs, diagnostic complet requis', color: '#A32D2D', cls: 'risk'};
  return {text: 'Conditions défavorables, projet à réexaminer', color: '#A32D2D', cls: 'risk'};
}

/* ---------- effort / récompense ---------- */
function erRatio(er) {
  if (!er || !er.e || !er.r) return null;
  const e = er.e.reduce((a, b) => a + (b || 0), 0), r = er.r.reduce((a, b) => a + (b || 0), 0);
  if (e === 0 && r === 0) return null;
  if (r === 0) return 3;
  return Math.round((e / r) * 100) / 100;
}
function erBand(ratio) {
  if (ratio == null) return null;
  for (const b of D.ER.bands) if (ratio <= b[0]) return {label: b[1], cls: b[2]};
  return {label: 'Déséquilibre marqué', cls: 'red'};
}

/* ---------- maturité ---------- */
function computeMaturity() {
  const si = {mature: 5, moyen: 3, fragile: 1}[state.si] || 3;
  const rh = {faible: 5, moyenne: 3, forte: 1}[state.rh] || 3;
  const ch = {forte: 5, moyenne: 3, faible: 1}[state.ch] || 3;
  const bonus = (PROFILE_BY_ID[state.prof] || {}).maturityBonus || 0;
  const score = clamp(Math.round(((si + rh + ch) / 3 + bonus) * 10) / 10, 1, 5);
  const v = score >= 4 ? {text: 'Établissement prêt au déploiement', color: '#0F6E56', cls: 'green'}
    : score >= 3 ? {text: 'Maturité suffisante avec accompagnement', color: '#BA7517', cls: 'amber'}
    : score >= 2 ? {text: 'Prérequis organisationnels à renforcer avant déploiement', color: '#D85A30', cls: 'amber'}
    : {text: 'Maturité insuffisante : plan de transformation préalable nécessaire', color: '#A32D2D', cls: 'red'};
  return {score, si, rh, ch, verdict: v};
}

/* ---------- sérialisation (lien) ---------- */
function snapshot() {
  return {
    v: APP_VERSION, id: state.evalId, pn: state.pn, dom: state.dom, prof: state.prof, stage: state.stage,
    si: state.si, rh: state.rh, ch: state.ch, nat: state.nature, sc: state.scores, wt: state.weights,
    wc: state.wCustom ? 1 : 0, ca: state.calc || {}, er: state.er || null, dt: state.dt || todayISO()
  };
}
function encodeSnap(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
function decodeSnap(enc) {
  enc = String(enc || '').trim();
  const m = enc.match(/[?&]eval=([^&#\s]+)/); if (m) enc = decodeURIComponent(m[1]);
  enc = enc.replace(/ /g, '+');
  return JSON.parse(decodeURIComponent(escape(atob(enc))));
}
function stateToUrl() { return location.href.split('?')[0].split('#')[0] + '?eval=' + encodeURIComponent(encodeSnap(snapshot())); }
function snapToState(ctx) {
  const s = freshState();
  s.evalId = ctx.id || null; s.pn = ctx.pn || ''; s.dom = ctx.dom || ''; s.prof = ctx.prof || '';
  s.stage = ctx.stage || D.STAGES[0]; s.si = ctx.si || ''; s.rh = ctx.rh || ''; s.ch = ctx.ch || '';
  s.nature = ctx.nat || 'medical'; s.scores = migrateScores(ctx.sc); s.weights = Object.assign({}, ctx.wt || {});
  s.wCustom = !!ctx.wc; s.calc = ctx.ca || {}; s.er = ctx.er || null; s.dt = ctx.dt || todayISO();
  return s;
}
function loadSnapshot(ctx, keepId) {
  state = snapToState(ctx);
  if (!keepId) state.evalId = ctx.id || null;
  if (!state.evalId) { const twin = lsGet().find((x) => x.snap && x.snap.pn === state.pn && x.snap.dt === state.dt && x.snap.nat === state.nature && x.snap.prof === state.prof); if (twin) state.evalId = twin.id; }
  ensureWeights();
}
/* évaluation à partir d'un snapshot quelconque (comparateurs) */
function evalFromSnap(ctx) {
  const s = snapToState(ctx);
  const base = baseWeightsFor(s.prof, s.nature);
  Object.keys(base).forEach((k) => { if (s.weights[k] == null) s.weights[k] = base[k]; });
  const r = computeFor(s.scores, s.weights, s.nature, s.prof);
  return {snap: ctx, st: s, r, name: s.pn || 'Sans nom', label: (s.pn || 'Sans nom'), dt: s.dt, nature: s.nature, prof: s.prof};
}

/* ---------- bibliothèque locale ---------- */
function lsGet() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; } }
function lsSet(arr) { try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); return true; } catch (e) { return false; } }
function libAll() { return lsGet().sort((a, b) => (b.updated || '').localeCompare(a.updated || '')); }
function libSaveCurrent(silent) {
  if (!state.evalId) state.evalId = uid();
  const r = compute();
  const item = {id: state.evalId, name: state.pn || 'Évaluation sans nom', dom: state.dom, prof: state.prof, nat: state.nature,
    dt: state.dt, updated: new Date().toISOString(), global: r.global, snap: snapshot(), done: {rm: state.rmDone, cl: state.clDone}};
  const arr = lsGet(); const i = arr.findIndex((x) => x.id === item.id);
  if (i >= 0) arr[i] = item; else arr.push(item);
  if (!lsSet(arr) && !silent) toast('Stockage local indisponible : utilisez le lien de sauvegarde');
  else if (!silent) toast('Évaluation enregistrée dans Mes évaluations');
  updateLibBadge();
  return item;
}
function libGet(id) { return lsGet().find((x) => x.id === id); }
function libDelete(id) { lsSet(lsGet().filter((x) => x.id !== id)); updateLibBadge(); }
function libRename(id, name) { const arr = lsGet(); const it = arr.find((x) => x.id === id); if (it) { it.name = name; it.snap.pn = name; it.updated = new Date().toISOString(); lsSet(arr); } }
function updateLibBadge() { const n = lsGet().length; const b = $('libBadge'); if (b) { b.textContent = n; b.style.display = n ? 'flex' : 'none'; } }
function prefs() { try { return JSON.parse(localStorage.getItem(LS_PREFS) || '{}'); } catch (e) { return {}; } }
function setPref(k, v) { const p = prefs(); p[k] = v; try { localStorage.setItem(LS_PREFS, JSON.stringify(p)); } catch (e) {} }

/* ---------- navigation ---------- */
const SCREENS = ['home', 'eval', 'compare', 'library', 'about'];
let currentScreen = 'home';
function showScreen(name, opts) {
  if (SCREENS.indexOf(name) < 0) name = 'home';
  currentScreen = name;
  SCREENS.forEach((s) => { const el = $('scr-' + s); if (el) el.classList.toggle('active', s === name); });
  document.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-nav') === name));
  if (location.hash !== '#' + name && !(opts && opts.noHash)) history.replaceState(null, '', '#' + name);
  if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
  if (name === 'home') renderHome();
  if (name === 'eval') renderEval();
  if (name === 'compare') renderCompare();
  if (name === 'library') renderLibrary();
  if (name === 'about') renderAbout();
}
window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (SCREENS.indexOf(h) >= 0 && h !== currentScreen) showScreen(h, {noHash: true}); });

/* ---------- modales ---------- */
function openModal(id) { const o = $(id); if (!o) return; o.classList.add('show'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { const o = $(id); if (!o) return; o.classList.remove('show'); document.body.style.overflow = ''; }
document.addEventListener('click', (e) => {
  const ov = e.target.classList && e.target.classList.contains('overlay') ? e.target : null;
  if (ov) closeModal(ov.id);
  const tip = e.target.closest && e.target.closest('.tip');
  document.querySelectorAll('.tip.open').forEach((t) => { if (t !== tip) t.classList.remove('open'); });
  if (tip) tip.classList.toggle('open');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.overlay.show').forEach((o) => closeModal(o.id)); });

/* ---------- glossaire / infobulles ---------- */
let TIP_TERMS = null;
function makeTip(term) { const d = D.TOOLTIPS[term]; return d ? '<span class="tip" role="button" tabindex="0" aria-label="' + esc(term) + '">?<span class="tip-box"><strong>' + esc(term) + '</strong><br>' + esc(d) + '</span></span>' : ''; }
function tipify(text) {
  if (!text) return text;
  if (!TIP_TERMS) TIP_TERMS = Object.keys(D.TOOLTIPS).sort((a, b) => b.length - a.length);
  let out = esc(text); const used = {};
  TIP_TERMS.forEach((term) => {
    if (used[term.toLowerCase()]) return;
    const re = new RegExp('(^|[^\\w\\p{L}])(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=$|[^\\w\\p{L}])', 'u');
    const m = out.match(re);
    if (m) { used[term.toLowerCase()] = 1; out = out.replace(re, (all, pre, t) => pre + t + makeTip(term)); }
  });
  return out;
}

/* ---------- copie ---------- */
function copyText(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(() => true).catch(() => fallbackCopy(txt));
  return Promise.resolve(fallbackCopy(txt));
}
function fallbackCopy(txt) {
  const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta); return ok;
}
