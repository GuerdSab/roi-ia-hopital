/* ============================================================
   À propos (méthode, aide, glossaire, auteurs) · PWA · démarrage
   ============================================================ */
function renderAbout() {
  const el = $('aboutFams'); if (el && !el.dataset.built) {
    el.dataset.built = '1';
    const fams = famsForNature('medical', 'ght');
    el.innerHTML = fams.map((f, i) => '<div class="fam-item"><span class="fi">' + f.emoji + '</span><div><strong>' + (i + 1) + '. ' + esc(f.name) + (i === 0 || f.id === 'cadre' ? ' <span class="small">(adaptée à la nature du projet)</span>' : '') + '</strong>' + esc(dimHelp(f)) + '</div></div>').join('');
  }
  const pl = $('aboutProfiles'); if (pl && !pl.dataset.built) { pl.dataset.built = '1'; pl.innerHTML = D.PROFILES.map((p) => '<div class="fam-item"><span class="fi">' + p.emoji + '</span><div><strong>' + esc(p.label) + '</strong>' + esc(p.desc) + '</div></div>').join(''); }
  renderGlossary('');
  renderStats();
}
function renderGlossary(q) {
  const el = $('glossList'); if (!el) return;
  q = (q || '').trim().toLowerCase();
  const terms = Object.keys(D.TOOLTIPS).sort((a, b) => a.localeCompare(b, 'fr')).filter((t) => !q || t.toLowerCase().indexOf(q) >= 0 || D.TOOLTIPS[t].toLowerCase().indexOf(q) >= 0);
  el.innerHTML = terms.length ? terms.map((t) => '<div class="gloss-item"><span class="gloss-term">' + esc(t) + '</span>' + esc(D.TOOLTIPS[t]) + '</div>').join('') : '<div class="small">Aucun terme ne correspond.</div>';
}
function openHelp() { renderAbout(); showScreen('about'); const h = $('aboutHelp'); if (h) { h.open = true; setTimeout(() => h.scrollIntoView({behavior: 'smooth', block: 'start'}), 50); } }

/* ---------- PWA ---------- */
(function pwa() {
  let installEvt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
  function showBanner() { if (isStandalone() || prefs().pwaDismissed) return; const b = $('pwaBanner'); if (b) setTimeout(() => b.classList.add('show'), 2500); }
  window.dismissPWA = function () { const b = $('pwaBanner'); if (b) b.classList.remove('show'); setPref('pwaDismissed', 1); };
  window.installPWA = function () {
    if (installEvt) { installEvt.prompt(); installEvt.userChoice.then((r) => { if (r.outcome === 'accepted') window.dismissPWA(); installEvt = null; }); return; }
    window.dismissPWA();
    toast(isIOS() ? 'Safari : bouton Partager ⬆ puis « Sur l’écran d’accueil »' : 'Menu du navigateur ⋮ puis « Installer l’application »', 6000);
  };
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; showBanner(); });
  window.addEventListener('appinstalled', () => window.dismissPWA());
  window.maybeShowInstall = function () { if (isIOS() && !isStandalone()) showBanner(); };
  const off = $('offline'); const upd = () => { if (off) off.classList.toggle('show', !navigator.onLine); };
  window.addEventListener('online', upd); window.addEventListener('offline', upd); upd();
})();

/* ---------- statistiques d'usage (compteur anonyme, fonction Netlify /api/compteur) ---------- */
const STATS_URL = '/api/compteur';
let STATS = undefined; // undefined : pas encore chargé · null : indisponible · objet : données
function statsEnabled() { return (location.protocol === 'https:' || location.hostname === 'localhost') && !prefs().statsOff; }
function statsHit(ev, key, meta) {
  if (!statsEnabled()) return;
  try { if (key && sessionStorage.getItem(key)) return; if (key) sessionStorage.setItem(key, '1'); } catch (e) {}
  const body = Object.assign({ev: ev}, meta || {});
  try { fetch(STATS_URL, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), keepalive: true}).then((r) => { if (r.ok) STATS = undefined; }).catch(() => {}); } catch (e) {}
}
function statsLoad(cb) {
  if (STATS !== undefined) { cb(STATS); return; }
  if (!statsEnabled()) { STATS = null; cb(null); return; }
  fetch(STATS_URL, {cache: 'no-store'}).then((r) => r.ok ? r.json() : null).then((j) => { STATS = (j && j.total) ? j : null; cb(STATS); }).catch(() => { STATS = null; cb(null); });
}
const fmtN = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
function statsBars(serie) {
  const w = 300, h = 54, n = serie.length, bw = w / n, max = Math.max(1, ...serie.map((d) => Math.max(d.visite, d.evaluation)));
  let out = '<div class="stats-chart"><svg class="stats-bars" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Visites et évaluations par jour sur 30 jours">';
  serie.forEach((d, i) => {
    const hv = Math.round(d.visite / max * h), he = Math.round(d.evaluation / max * h);
    const t = '<title>' + esc(fmtDate(d.d)) + ' : ' + d.visite + ' visite(s), ' + d.evaluation + ' évaluation(s)</title>';
    out += '<rect x="' + (i * bw + 1).toFixed(1) + '" y="' + (h - hv) + '" width="' + (bw - 2).toFixed(1) + '" height="' + hv + '" fill="rgba(0,174,239,.35)">' + t + '</rect>';
    if (he) out += '<rect x="' + (i * bw + 1).toFixed(1) + '" y="' + (h - he) + '" width="' + (bw - 2).toFixed(1) + '" height="' + he + '" fill="var(--navy)">' + t + '</rect>';
  });
  out += '</svg><div class="stats-axis"><span>' + esc(fmtDate(serie[0].d)) + '</span><span>max. ' + max + ' / jour</span><span>' + esc(fmtDate(serie[n - 1].d)) + '</span></div></div>';
  return out;
}
function statsHtml(s) {
  if (!s && prefs().statsOff) return '<p class="small">Comptage désactivé sur cet appareil. <a href="#" onclick="toggleStatsOptOut();return false">Réactiver</a></p>';
  if (!s) return '<p class="small">Statistiques indisponibles (hors ligne, version autonome ou fonction non déployée). Le compteur est servi par <code>/api/compteur</code> sur le site publié.</p>';
  const t = s.total || {}, t30 = s.trenteJours || {};
  const rep = (obj, lab) => { const ks = Object.keys(obj || {}).sort((a, b) => obj[b] - obj[a]); const tot = ks.reduce((a, k) => a + obj[k], 0) || 1; return ks.length ? ks.map((k) => '<div class="m-bar-lbl"><span>' + esc(lab(k)) + '</span><strong>' + fmtN(obj[k]) + '</strong></div><div class="m-bar"><div class="fill" style="width:' + Math.round(obj[k] / tot * 100) + '%;background:var(--cyan)"></div></div>').join('') : '<div class="small">Aucune évaluation comptée pour l’instant.</div>'; };
  return '<div class="kpis stats-kpis"><div class="kpi"><small>Visites</small><strong>' + fmtN(t.visite) + '</strong></div><div class="kpi"><small>Évaluations réalisées</small><strong>' + fmtN(t.evaluation) + '</strong></div><div class="kpi"><small>Installations (PWA)</small><strong>' + fmtN(t.installation) + '</strong></div><div class="kpi"><small>Visites · 30 jours</small><strong>' + fmtN(t30.visite) + '</strong></div><div class="kpi"><small>Évaluations · 30 jours</small><strong>' + fmtN(t30.evaluation) + '</strong></div></div>' +
    '<div class="h3">Trente derniers jours</div><div class="small" style="margin-top:-4px">Visites (bleu clair) et évaluations (bleu marine) par jour.</div>' + (s.jours30 && s.jours30.length ? statsBars(s.jours30) : '') +
    '<div class="grid grid-2" style="margin-top:10px"><div><div class="h3" style="margin-top:4px">Évaluations par profil d’établissement</div>' + rep(s.parProfil, profileLabel) + '</div><div><div class="h3" style="margin-top:4px">Évaluations par nature de projet</div>' + rep(s.parNature, natureLabel) + '</div></div>' +
    '<p class="small" style="margin-top:10px">Compteur anonyme : aucune adresse IP, aucun identifiant ni cookie n’est conservé ; seuls des totaux agrégés sont stockés (une visite par session de navigation, une évaluation par résultat affiché). Depuis le ' + esc(fmtDate(s.depuis)) + ' · mis à jour le ' + esc(fmtDate(s.maj)) + '. <a href="#" onclick="toggleStatsOptOut();return false">' + (prefs().statsOff ? 'Réactiver le comptage sur cet appareil' : 'Ne pas compter mes visites sur cet appareil') + '</a></p>';
}
function toggleStatsOptOut() { setPref('statsOff', prefs().statsOff ? 0 : 1); toast(prefs().statsOff ? 'Vos visites ne sont plus comptées sur cet appareil' : 'Comptage réactivé'); renderStats(); }
function renderStats() {
  const el = $('statsWrap'); if (!el) return;
  el.innerHTML = '<p class="small">Chargement…</p>';
  STATS = undefined; statsLoad((s) => { el.innerHTML = statsHtml(s); });
}
function renderHomeStats() {
  const el = $('homeStats'); if (!el) return;
  statsLoad((s) => { if (s && s.total && s.total.evaluation > 0) { el.innerHTML = '<span class="pill pill-cyan" title="Compteur anonyme, voir À propos">📈 ' + fmtN(s.total.evaluation) + ' évaluation' + (s.total.evaluation > 1 ? 's' : '') + ' réalisée' + (s.total.evaluation > 1 ? 's' : '') + ' · ' + fmtN(s.total.visite) + ' visite' + (s.total.visite > 1 ? 's' : '') + '</span>'; el.style.display = ''; } else { el.style.display = 'none'; } });
}
window.addEventListener('appinstalled', () => statsHit('installation'));

/* ---------- démarrage ---------- */
(function init() {
  statsHit('visite', 'roiia.hit.visite');
  const setTop = () => { const tb = document.querySelector('.topbar'); if (tb) document.documentElement.style.setProperty('--top-h', tb.offsetHeight + 'px'); };
  window.addEventListener('resize', setTop); setTimeout(setTop, 0);
  document.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => showScreen(b.getAttribute('data-nav'))));
  document.querySelectorAll('[data-version]').forEach((e) => { e.textContent = D.versionLabel; });
  updateLibBadge();
  const params = new URLSearchParams(location.search);
  if (params.get('eval')) {
    try { const s = decodeSnap(params.get('eval')); loadSnapshot(s); if (!state.evalId) state.evalId = uid(); state.step = 2; history.replaceState(null, '', location.pathname + '#eval'); showScreen('eval', {noHash: true}); return; } catch (e) { toast('Lien de sauvegarde non reconnu'); }
  }
  const h = location.hash.replace('#', '');
  showScreen(SCREENS.indexOf(h) >= 0 ? h : 'home', {noHash: true});
})();
