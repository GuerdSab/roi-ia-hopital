/* ============================================================
   Résultats : score, radar, alertes, effort/récompense, feuille de
   route, pondérations, calculateur, synthèse exécutive, fiche
   ============================================================ */

/* ---------- radar SVG (1 à n séries) ---------- */
const SERIES_COLORS = ['#00AEEF', '#1B3A6B', '#8DC63F', '#D85A30', '#7B4FBF', '#BA7517'];
function buildRadar(seriesList, fams, size) {
  const s = size || 320, cx = s / 2, cy = s / 2, r = s * 0.31, n = fams.length;
  const ang = fams.map((_, i) => Math.PI * 2 * i / n - Math.PI / 2);
  const px = (v, i) => cx + r * (v / 5) * Math.cos(ang[i]), py = (v, i) => cy + r * (v / 5) * Math.sin(ang[i]);
  let g = '';
  [1, 2, 3, 4, 5].forEach((k) => { g += '<polygon points="' + ang.map((a) => (cx + r * k / 5 * Math.cos(a)).toFixed(1) + ',' + (cy + r * k / 5 * Math.sin(a)).toFixed(1)).join(' ') + '" fill="none" stroke="' + (k === 5 ? '#b0cce0' : '#e3eaf3') + '" stroke-width="' + (k === 5 ? 1 : .7) + '"/>'; });
  g += ang.map((a) => '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * Math.cos(a)).toFixed(1) + '" y2="' + (cy + r * Math.sin(a)).toFixed(1) + '" stroke="#e3eaf3" stroke-width=".8"/>').join('');
  seriesList.forEach((ser, si) => {
    const col = ser.color || SERIES_COLORS[si % SERIES_COLORS.length];
    const pts = fams.map((f, i) => { const v = ser.dims[f.id]; return v == null ? null : px(v, i).toFixed(1) + ',' + py(v, i).toFixed(1); });
    const path = pts.filter(Boolean).join(' ');
    if (path) g += '<polygon points="' + path + '" fill="' + col + '" fill-opacity="' + (ser.fill != null ? ser.fill : (seriesList.length > 1 ? .08 : .12)) + '" stroke="' + col + '" stroke-width="2" stroke-opacity="' + (ser.opacity != null ? ser.opacity : 1) + '"/>';
    fams.forEach((f, i) => { const v = ser.dims[f.id]; if (v != null) g += '<circle cx="' + px(v, i).toFixed(1) + '" cy="' + py(v, i).toFixed(1) + '" r="3.5" fill="' + (seriesList.length > 1 ? col : scoreColor(v)) + '" stroke="#fff" stroke-width="1.3"/>'; });
  });
  const fs = s < 280 ? 8.5 : 10, off = s < 280 ? 18 : 24;
  fams.forEach((f, i) => {
    const lx = cx + (r + off) * Math.cos(ang[i]), ly = cy + (r + off) * Math.sin(ang[i]);
    const anchor = lx < cx - 8 ? 'end' : lx > cx + 8 ? 'start' : 'middle';
    const v = seriesList.length === 1 ? seriesList[0].dims[f.id] : null;
    g += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor + '" font-size="' + fs + '" font-family="Segoe UI,Arial,sans-serif" fill="#5A6880">' + esc(radarLabel(f)) + '</text>';
    if (seriesList.length === 1) g += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 12).toFixed(1) + '" text-anchor="' + anchor + '" font-size="' + (fs + 1) + '" font-weight="700" font-family="Segoe UI,Arial,sans-serif" fill="' + scoreColor(v) + '">' + (v == null ? 'n.é.' : fmt1(v)) + '</text>';
  });
  const padX = Math.round(s * 0.2);
  return '<svg width="' + (s + 2 * padX) + '" height="' + s + '" viewBox="' + (-padX) + ' 0 ' + (s + 2 * padX) + ' ' + s + '" style="max-width:100%;height:auto" role="img" aria-label="Radar des dimensions">' + g + '</svg>';
}

/* ---------- réglementation ---------- */
function regulationPanel() {
  if (state.nature !== 'medical' && state.nature !== 'transversal') return '';
  const now = new Date();
  const months = (d) => Math.max(0, Math.round((new Date(d) - now) / (1000 * 3600 * 24 * 30.44)));
  const rows = D.REG.milestones.map((m) => {
    const past = new Date(m.date) <= now, mm = months(m.date);
    return '<li style="margin:4px 0 4px 18px">' + (past ? '<strong>Applicable</strong> · ' : '<strong>' + fmtDate(m.date) + '</strong> (dans ' + (mm <= 1 ? 'moins de 2 mois' : mm + ' mois') + ') · ') + esc(m.label) + '</li>';
  }).join('');
  return '<div class="alert amber"><strong>⏱ Calendrier réglementaire — ' + esc(D.REG.omnibus.ref) + '</strong>, en vigueur depuis le ' + fmtDate(D.REG.omnibus.inForce) + '.<ul style="margin-top:6px">' + rows + '</ul><div style="margin-top:6px">' + esc(D.REG.note) + '</div></div>';
}

/* ---------- recommandations ---------- */
function buildRecos(r, fams) {
  const d = (k) => r.dims[k] == null ? 99 : r.dims[k];
  const f7 = f7Id(state.nature), f1 = f1Id(state.nature);
  const recos = [];
  if (d('dettes') < 3) recos.push("Chiffrer les coûts d'intégration SI, d'interfaçage et de gouvernance : demandez à votre DSN une estimation en jours·homme avant toute réunion éditeur.");
  if (d('acceptabilite') < 3) recos.push("Organiser des ateliers métiers, CME et instances avant le pilote : l'adhésion ne s'improvise pas en marge du projet technique.");
  if (d(f7) < 3) recos.push('Faire relire les clauses de responsabilité, de réversibilité et de conformité (MDR, AI Act, garantie humaine) par un juriste avant signature.');
  if (d('marche') < 3) recos.push('Demander les preuves de niveau de preuve, SLA, feuille de route et garanties de continuité ; visiter un établissement comparable déjà déployé.');
  if (d('strategique') < 3) recos.push('Formaliser la valeur stratégique attendue avec la direction et la CME avant de contractualiser.');
  if (d('operationnel') < 3) recos.push('Chiffrer les gains opérationnels attendus (ETP réaffectables, DMS, flux, T2A) et définir leur mesure avant/après dès la phase pilote.');
  if (d('financier') < 3) recos.push("Construire le coût total sur cinq ans (abonnement × 5 + intégration SI + formation et conduite du changement + coût de sortie) et le confronter au business case de l'éditeur.");
  if (d('environnement') < 3) recos.push("Exiger des mesures d'empreinte (PUE, kWh par inférence, hébergement) et instruire le bilan net avec la démarche RSE de l'établissement.");
  const ratio = erRatio(state.er);
  if (ratio != null && ratio > 1.1) recos.push("Rééquilibrer la balance effort / récompense : l'effort demandé aux équipes doit avoir des contreparties annoncées (temps rendu, reconnaissance, compétences, collectif).");
  if (state.nature === 'planning') recos.push('Impliquer les équipes dès la conception des règles métier : un algorithme opaque génère une résistance proportionnelle à son opacité.');
  if (state.nature === 'rh') recos.push("Faire auditer le modèle pour détecter les biais avant déploiement : la responsabilité employeur est engagée en cas de discrimination algorithmique.");
  if (state.nature === 'logistique') recos.push("Valider l'interopérabilité avec votre ERP et WMS avant signature : les coûts d'interfaçage sont systématiquement sous-estimés.");
  if (state.nature === 'medical' && d(f1) < 3) recos.push('Planifier la validation clinique sur votre patientèle (sensibilité, spécificité) et le monitoring de la dérive avant toute généralisation.');
  if (!recos.length) recos.push('Passer en cadrage avancé : pilote limité, indicateurs définis, clauses de sortie négociées, gouvernance de suivi en place.');
  return recos;
}

/* ---------- feuille de route ---------- */
function rulePasses(cond, r) {
  if (cond === 'always') return true;
  const d = (k) => r.dims[k] == null ? 99 : r.dims[k];
  const f1 = f1Id(state.nature), f7 = f7Id(state.nature);
  const ratio = erRatio(state.er);
  const one = (c) => {
    let m;
    if ((m = c.match(/^nature=(\w+)$/))) return state.nature === m[1];
    if ((m = c.match(/^si=(\w+)$/))) return state.si === m[1];
    if ((m = c.match(/^rh=(\w+)$/))) return state.rh === m[1];
    if ((m = c.match(/^ch=(\w+)$/))) return state.ch === m[1];
    if ((m = c.match(/^er>=([\d.]+)$/))) return ratio != null && ratio >= parseFloat(m[1]);
    if ((m = c.match(/^global>=([\d.]+)$/))) return r.global != null && r.global >= parseFloat(m[1]);
    if ((m = c.match(/^(\w+)(<=|>=)([\d.]+)$/))) { const k = m[1] === 'f1' ? f1 : m[1] === 'f7' ? f7 : m[1]; const v = d(k); if (v === 99 && m[2] === '<=') return false; return m[2] === '<=' ? v <= parseFloat(m[3]) : v >= parseFloat(m[3]); }
    return false;
  };
  return cond.split('|').some((grp) => grp.split('&').every((c) => one(c.trim())));
}
function generateRoadmap(r) {
  const out = {urgent: [], important: [], normal: []};
  D.ROADMAP_RULES.forEach((rule) => { if (rulePasses(rule[1], r)) out[rule[0]].push({text: rule[2], tag: rule[3]}); });
  const pn = D.PROFILE_NOTES[state.prof];
  if (pn) pn.roadmap.forEach((a) => out[a[0]].push({text: a[1], tag: a[2]}));
  Object.keys(out).forEach((k) => { const seen = {}; out[k] = out[k].filter((a) => !seen[a.text] && (seen[a.text] = 1)); });
  return out;
}
const RM_PHASES = [
  {key: 'urgent', label: 'Avant de signer', sub: 'Actions bloquantes, à traiter avant tout engagement contractuel', icon: '🚨'},
  {key: 'important', label: 'Avant le pilote', sub: 'Conditions nécessaires au démarrage, à planifier dans les deux premiers mois', icon: '⚠️'},
  {key: 'normal', label: 'Avant la généralisation', sub: 'Consolider les acquis du pilote avant extension', icon: '✅'}
];
function roadmapHtml(actions, prefix) {
  let total = 0, done = 0;
  RM_PHASES.forEach((p) => actions[p.key].forEach((a, i) => { total++; if (state.rmDone[p.key + i]) done++; }));
  let html = '<div class="rm-progress"><span class="small" style="font-weight:700;color:var(--navy)" id="' + prefix + 'rmLbl">' + done + ' / ' + total + ' actions réalisées</span><div class="bar"><div class="fill" id="' + prefix + 'rmFill" style="width:' + (total ? Math.round(done / total * 100) : 0) + '%;background:var(--navy)"></div></div></div>';
  if (!total) return html + '<div class="empty">Aucune action prioritaire identifiée : conditions favorables sur l’ensemble des dimensions.</div>';
  RM_PHASES.forEach((p) => {
    const list = actions[p.key]; if (!list.length) return;
    html += '<div class="rm-phase ' + p.key + '"><div class="rm-head"><div class="rm-ic">' + p.icon + '</div><div><div class="rm-title">' + p.label + '</div><div class="rm-sub">' + p.sub + '</div></div><span class="rm-count">' + list.length + ' action' + (list.length > 1 ? 's' : '') + '</span></div><div class="rm-actions">';
    list.forEach((a, i) => { const k = p.key + i; html += '<div class="rm-action' + (state.rmDone[k] ? ' done' : '') + '" data-rm="' + k + '" onclick="toggleRm(\'' + k + '\')"><div class="rm-chk"></div><div class="rm-txt">' + esc(a.text) + '</div><span class="tag">' + esc(a.tag) + '</span></div>'; });
    html += '</div></div>';
  });
  return html;
}
function toggleRm(k) {
  state.rmDone[k] = !state.rmDone[k];
  document.querySelectorAll('[data-rm="' + k + '"]').forEach((el) => el.classList.toggle('done', !!state.rmDone[k]));
  const all = document.querySelectorAll('#rmWrap .rm-action'); const done = [...all].filter((e) => e.classList.contains('done')).length;
  ['', 'f'].forEach((pre) => { const l = $(pre + 'rmLbl'), f = $(pre + 'rmFill'); if (l) l.textContent = done + ' / ' + all.length + ' actions réalisées'; if (f) f.style.width = (all.length ? Math.round(done / all.length * 100) : 0) + '%'; });
}

/* ---------- checklist éditeur ---------- */
const CL_ICONS = {'Contractuel': '📄', 'Technique': '⚙️', 'Clinique / métier': '🩺', 'Éditeur': '🏢', 'Gouvernance': '🏛️'};
function checklistHtml() {
  let total = 0, done = 0; Object.keys(D.CHECKLIST).forEach((cat) => D.CHECKLIST[cat].forEach((q, i) => { total++; if (state.clDone[cat + i]) done++; }));
  let html = '<div class="rm-progress"><span class="small" style="font-weight:700;color:var(--navy)" id="clLbl">' + done + ' / ' + total + ' questions traitées</span><div class="bar"><div class="fill" id="clFill" style="width:' + Math.round(done / total * 100) + '%;background:var(--green)"></div></div></div>';
  Object.keys(D.CHECKLIST).forEach((cat) => {
    html += '<div class="cl-cat"><div class="cl-cat-title">' + (CL_ICONS[cat] || '•') + ' ' + esc(cat) + '</div>' + D.CHECKLIST[cat].map((q, i) => '<div class="cl-item' + (state.clDone[cat + i] ? ' checked' : '') + '" onclick="toggleCl(this,\'' + esc(cat + i).replace(/'/g, '\\\'') + '\')"><div class="rm-chk"></div><div>' + esc(q) + '</div></div>').join('') + '</div>';
  });
  return html;
}
function toggleCl(el, k) {
  state.clDone[k] = !state.clDone[k]; el.classList.toggle('checked', !!state.clDone[k]);
  const all = document.querySelectorAll('#clWrap .cl-item'), done = [...all].filter((e) => e.classList.contains('checked')).length;
  const l = $('clLbl'), f = $('clFill'); if (l) l.textContent = done + ' / ' + all.length + ' questions traitées'; if (f) f.style.width = Math.round(done / all.length * 100) + '%';
}

/* ---------- effort / récompense ---------- */
function erInit() { if (!state.er) state.er = {e: [0, 0, 0, 0, 0], r: [0, 0, 0, 0, 0]}; return state.er; }
function erPanel() {
  const er = erInit();
  const col = (side, items, title) => { const labels = side === 'e' ? (D.ER.effLabels || []) : (D.ER.rewLabels || []); return '<div class="er-col"><h4>' + title + '</h4>' + items.map((it, i) => '<div class="er-item"><div class="er-lbl">' + esc(it[0]) + '<span>' + esc(it[1]) + '</span></div><div class="er-seg">' + [0, 1, 2, 3].map((v) => '<button type="button" class="' + (er[side][i] === v ? 'sel' : '') + '" title="' + esc(labels[v] || '') + '" onclick="setER(\'' + side + '\',' + i + ',' + v + ')">' + v + '</button>').join('') + '</div></div>').join('') + '<div class="small" style="margin-top:4px">0 ' + esc(labels[0] || '') + ' · 1 ' + esc(labels[1] || '') + ' · 2 ' + esc(labels[2] || '') + ' · 3 ' + esc(labels[3] || '') + '</div></div>'; };
  return '<p class="small" style="margin-bottom:12px">Cotez de 0 (nul) à 3 (fort) l’effort demandé aux équipes et les contreparties prévues. Le rapport effort / récompense n’entre pas dans le score global : il éclaire la condition d’appropriation (modèle de Siegrist).</p>' +
    '<div class="er-grid">' + col('e', D.ER.effort, '🏋️ Effort demandé') + col('r', D.ER.reward, '🎁 Récompense / contreparties') + '</div><div id="erBalance">' + erBalanceHtml() + '</div>';
}
function setER(side, i, v) { erInit()[side][i] = v; const b = $('erBalance'); if (b) b.innerHTML = erBalanceHtml(); }
function erBalanceHtml() {
  const er = erInit(), ratio = erRatio(er), band = erBand(ratio);
  if (ratio == null) return '<div class="er-balance small">Renseignez au moins un item pour obtenir la balance.</div>';
  const pos = clamp(ratio / 2.2 * 100, 2, 98);
  const levers = D.ER.reward.map((it, i) => er.r[i] <= 1 ? D.ER.levers[i] : null).filter(Boolean);
  const e = er.e.reduce((a, b) => a + b, 0), r = er.r.reduce((a, b) => a + b, 0);
  return '<div class="er-balance"><div class="row" style="justify-content:space-between"><div><div class="small">Rapport effort / récompense</div><div class="er-ratio" style="color:' + ({green: '#0F6E56', blue: '#1B3A6B', amber: '#BA7517', red: '#A32D2D'}[band.cls]) + '">' + ratio.toFixed(2) + '</div><div class="small">effort ' + e + ' / 15 · récompense ' + r + ' / 15</div></div><div class="pill ' + (band.cls === 'green' ? 'pill-mint' : band.cls === 'blue' ? 'pill-cyan' : 'pill-navy') + '">' + esc(band.label) + '</div></div>' +
    '<div class="er-scale"><div class="er-cursor" style="left:' + pos.toFixed(1) + '%"></div></div><div class="row small" style="justify-content:space-between"><span>favorable</span><span>équilibre</span><span>déséquilibre</span><span>marqué</span></div>' +
    (levers.length ? '<div class="h3">Leviers de récompense à activer</div><ul class="er-levers">' + levers.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '<div class="alert green" style="margin-top:10px">Les contreparties sont identifiées sur l’ensemble des items : conditions d’appropriation favorables.</div>') + '</div>';
}

/* ---------- pondérations + sensibilité ---------- */
function weightsPanel(fams) {
  return '<p class="small" style="margin-bottom:10px">Poids de 1 à 5 par dimension, préréglés selon le profil et le contexte' + (state.wCustom ? ' <span class="pill pill-cyan">ajustés manuellement</span>' : '') + '. <button class="btn btn-sm btn-secondary" onclick="resetWeights()">Réinitialiser (profil)</button></p>' +
    '<div class="weights-grid">' + fams.map((f) => '<div class="w-row"><span>' + f.emoji + '</span><span class="w-name">' + esc(radarLabel(f)) + '</span><input type="range" min="1" max="5" step="1" value="' + (state.weights[f.id] || 3) + '" oninput="setWeight(\'' + f.id + '\',this.value)"><span class="w-val" id="wv-' + f.id + '">' + (state.weights[f.id] || 3) + '</span></div>').join('') + '</div><div id="sensWrap" style="margin-top:12px">' + sensitivityHtml() + '</div>';
}
function setWeight(fid, v) { state.weights[fid] = parseInt(v, 10); state.wCustom = true; const e = $('wv-' + fid); if (e) e.textContent = v; refreshScoreViews(); }
function resetWeights() { applyAutoWeights(); renderResults(); toast('Pondérations réinitialisées'); }
function sensitivityHtml() {
  const r = compute(), fams = r.fams.filter((f) => r.dims[f.id] != null);
  if (fams.length < 2 || r.global == null) return '';
  const base = r.global, vBase = verdictInfo(base).text;
  const test = (fid, w) => { const old = state.weights[fid]; state.weights[fid] = w; const g = compute().global; state.weights[fid] = old; return g; };
  const rows = fams.map((f) => { const w0 = state.weights[f.id] || 3; const lo = test(f.id, Math.max(1, w0 - 1)), hi = test(f.id, Math.min(5, w0 + 1)); const mn = Math.min(lo, hi, base), mx = Math.max(lo, hi, base); return {f, mn, mx, range: mx - mn, flip: verdictInfo(mn).text !== vBase || verdictInfo(mx).text !== vBase}; }).sort((a, b) => b.range - a.range);
  const gmin = Math.min.apply(null, rows.map((x) => x.mn)), gmax = Math.max.apply(null, rows.map((x) => x.mx)), span = Math.max(.2, gmax - gmin);
  const flips = rows.filter((x) => x.flip);
  return '<div class="h3" style="margin-top:4px">📐 Analyse de sensibilité</div><div class="small" style="margin-bottom:8px">En faisant varier chaque pondération de ±1, le score global reste entre <strong>' + fmt1(gmin) + '</strong> et <strong>' + fmt1(gmax) + '</strong> (actuel <strong>' + fmt1(base) + '</strong>). ' +
    (flips.length ? '⚠ Le verdict peut changer selon la pondération de : <strong>' + flips.map((x) => esc(radarLabel(x.f))).join(', ') + '</strong> ; un consensus de gouvernance sur ces poids est nécessaire avant décision.' : 'Le verdict est robuste au choix des pondérations.') + '</div>' +
    rows.map((x) => '<div class="sens-row"><span class="sens-label">' + x.f.emoji + ' ' + esc(radarLabel(x.f)) + (x.flip ? ' ⚠' : '') + '</span><div class="sens-track"><div class="sens-bar" style="left:' + ((x.mn - gmin) / span * 100).toFixed(1) + '%;width:' + Math.max(2, (x.mx - x.mn) / span * 100).toFixed(1) + '%"></div><div class="sens-base" style="left:' + ((base - gmin) / span * 100).toFixed(1) + '%"></div></div><span class="sens-range">' + fmt1(x.mn) + ' – ' + fmt1(x.mx) + '</span></div>').join('');
}

/* ---------- calculateur cinq ans ---------- */
function calcPanel() {
  const c = state.calc || {};
  const inp = (id, label, val, step) => '<div class="field" style="margin:0"><label for="calc-' + id + '">' + label + '</label><input type="number" min="0" step="' + (step || 1000) + '" id="calc-' + id + '" value="' + (val || '') + '" placeholder="0" oninput="updateCalc()"></div>';
  return '<div class="calc-grid">' + inp('abo', 'Abonnement annuel (€)', c.abo) + inp('integ', 'Intégration SI (€)', c.integ) + inp('form', 'Formation et conduite du changement (€)', c.form) + inp('sortie', 'Coût de sortie estimé (€)', c.sortie) + inp('gains', 'Gains annuels attendus (€/an)', c.gains) + '</div>' +
    '<div class="field"><label>Taux d’adoption attendu : <strong id="calcAdopVal">' + (c.adop != null ? c.adop : 70) + '</strong> %</label><input type="range" min="0" max="100" step="5" value="' + (c.adop != null ? c.adop : 70) + '" oninput="$(\'calcAdopVal\').textContent=this.value;updateCalc()" id="calc-adop"></div>' +
    '<div id="calcOut">' + calcOutHtml() + '</div><p class="small" style="margin-top:10px">Coût total 5 ans = abonnement × 5 + intégration SI + formation et conduite du changement + coût de sortie. Les gains sont pondérés par le taux d’adoption : un projet adopté à 40 % produit 40 % du ROI attendu avec 100 % des coûts.</p>';
}
function updateCalc() {
  const g = (id) => parseFloat(($('calc-' + id) || {}).value) || 0;
  state.calc = {abo: g('abo'), integ: g('integ'), form: g('form'), sortie: g('sortie'), gains: g('gains'), adop: parseInt(($('calc-adop') || {value: 70}).value, 10)};
  const o = $('calcOut'); if (o) o.innerHTML = calcOutHtml();
}
function calcOutHtml() {
  const c = state.calc || {}; const abo = c.abo || 0, integ = c.integ || 0, form = c.form || 0, sortie = c.sortie || 0, gains = c.gains || 0, adop = c.adop != null ? c.adop : 70;
  const total = abo * 5 + integ + form + sortie, hidden = integ + form + sortie;
  if (!total && !gains) return '<div class="small" style="text-align:center;padding:8px">Renseignez les montants pour obtenir le coût total sur cinq ans.</div>';
  const gainsAdj = gains * adop / 100 * 5, net = gainsAdj - total;
  const scen = [[adop, 'Scénario retenu'], [Math.max(0, adop - 30), 'Pessimiste'], [Math.min(100, adop + 20), 'Optimiste']].map((s) => { const g5 = gains * s[0] / 100 * 5; return '<div><span class="small">' + s[1] + ' · adoption ' + s[0] + ' %</span><strong style="color:' + (g5 - total >= 0 ? '#0F6E56' : '#A32D2D') + '">' + fmtEur(g5 - total) + '</strong><span class="small">bilan net 5 ans</span></div>'; }).join('');
  const be = gains * adop / 100 > 0 ? total / (gains * adop / 100) : null;
  return '<div class="calc-result"><div class="calc-kpi"><small>Coût total 5 ans</small><strong>' + fmtEur(total) + '</strong><span>tous postes</span></div><div class="calc-kpi"><small>Coûts cachés</small><strong>' + fmtEur(hidden) + '</strong><span>' + (total ? Math.round(hidden / total * 100) : 0) + ' % du total</span></div><div class="calc-kpi"><small>Bilan net (adoption ' + adop + ' %)</small><strong style="color:' + (net >= 0 ? '#B8E063' : '#FFB4B4') + '">' + fmtEur(net) + '</strong><span>' + (be != null ? 'seuil de rentabilité ≈ ' + (be > 10 ? '> 10' : be.toFixed(1)) + ' ans' : 'gains non renseignés') + '</span></div></div>' +
    '<div class="scen">' + scen + '</div>' + (total && hidden / total > .3 ? '<div class="alert amber" style="margin-top:10px">⚠️ Les coûts cachés représentent ' + Math.round(hidden / total * 100) + ' % du coût total, au-delà du seuil habituel de 30 % : le business case éditeur ne les montre pas.</div>' : '');
}

/* ---------- benchmark (optionnel) ---------- */
let BENCH = null;
function fetchBenchmark() {
  if (BENCH !== null || location.protocol === 'file:') return;
  BENCH = false;
  fetch('benchmark.json', {cache: 'no-store'}).then((r) => r.ok ? r.json() : null).then((j) => { if (j && j.n >= 5) { BENCH = j; const el = $('benchWrap'); if (el) el.innerHTML = benchHtml(compute()); } }).catch(() => {});
}
function benchHtml(r) {
  if (!BENCH || r.global == null) return '';
  const pos = (v, p) => v == null || !p ? '' : v < p.p25 ? 'en dessous du premier quartile' : v <= p.p75 ? 'dans la bande interquartile' : 'au-dessus du troisième quartile';
  return '<details class="sec"><summary>📊 Benchmark anonymisé (' + BENCH.n + ' évaluations, ' + esc(BENCH.date || '') + ')</summary><div class="sec-body"><p class="small">Score global : <strong>' + fmt1(r.global) + '</strong>, médiane ' + fmt1(BENCH.global.p50) + ' (bande ' + fmt1(BENCH.global.p25) + ' – ' + fmt1(BENCH.global.p75) + ') : ' + pos(r.global, BENCH.global) + '.</p>' +
    (BENCH.dims ? '<table class="table"><thead><tr><th>Dimension</th><th>Vous</th><th>Médiane</th><th>Position</th></tr></thead><tbody>' + r.fams.map((f) => BENCH.dims[f.id] ? '<tr><td>' + f.emoji + ' ' + esc(radarLabel(f)) + '</td><td><strong>' + fmt1(r.dims[f.id]) + '</strong></td><td>' + fmt1(BENCH.dims[f.id].p50) + '</td><td class="small">' + pos(r.dims[f.id], BENCH.dims[f.id]) + '</td></tr>' : '').join('') + '</tbody></table>' : '') + '</div></details>';
}

/* ---------- synthèse exécutive ---------- */
function execHtml(r, v) {
  const fams = r.fams, m = computeMaturity(), ratio = erRatio(state.er), band = erBand(ratio);
  const weak = fams.filter((f) => r.dims[f.id] != null && r.dims[f.id] < 3), crit = fams.filter((f) => r.dims[f.id] != null && r.dims[f.id] <= 2), na = fams.filter((f) => r.dims[f.id] == null);
  const alerts = crit.map((f) => ['red', f.emoji + ' ' + f.name + ' : critique (' + fmt1(r.dims[f.id]) + '/5)']).concat(weak.filter((f) => r.dims[f.id] > 2).slice(0, 2).map((f) => ['amber', f.emoji + ' ' + f.name + ' : vigilance (' + fmt1(r.dims[f.id]) + '/5)']));
  if (na.length) alerts.push(['amber', 'Angles morts non instruits : ' + na.map((f) => f.name).join(', ')]);
  if (!alerts.length) alerts.push(['green', 'Aucun point critique immédiat identifié.']);
  const recos = buildRecos(r, fams).slice(0, 3);
  return '<div class="exec" id="execPage"><div class="exec-head"><div><div class="exec-title">Synthèse exécutive · évaluation MCDA d’un projet IA</div><div class="exec-sub">' + esc(state.pn || 'Projet IA') + ' · ' + esc(state.dom || 'domaine non précisé') + ' · ' + esc(state.stage) + '</div></div><div class="small" style="text-align:right">' + esc(profileLabel(state.prof)) + ' · ' + esc(natureLabel(state.nature)) + '<br>' + esc(fmtDate(state.dt)) + '</div></div>' +
    '<div class="exec-score"><div><div class="small" style="color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.05em">Score pondéré global</div><div class="n">' + fmt1(r.global) + '<span style="font-size:16px;color:#fff;opacity:.6;font-weight:400">/5</span></div></div><div style="flex:1;font-size:15px;font-weight:700">' + esc(v.text) + '</div><div class="small" style="color:rgba(255,255,255,.8)">Maturité établissement ' + fmt1(m.score) + '/5' + (ratio != null ? '<br>Effort / récompense ' + ratio.toFixed(2) + ' (' + esc(band.label) + ')' : '') + '</div></div>' +
    '<div class="exec-grid"><div><div class="exec-h">Profil des ' + fams.length + ' dimensions</div>' + fams.map((f) => { const s = r.dims[f.id]; return '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700"><span>' + f.emoji + ' ' + esc(radarLabel(f)) + '</span><span style="color:' + scoreColor(s) + '">' + (s == null ? 'n.é.' : fmt1(s) + '/5') + '</span></div><div class="bar" style="height:5px"><div class="fill" style="width:' + (s == null ? 0 : s * 20) + '%;background:' + scoreColor(s) + '"></div></div></div>'; }).join('') + '</div><div style="text-align:center">' + buildRadar([{dims: r.dims}], fams, 240) + '</div></div>' +
    '<div class="exec-grid"><div><div class="exec-h">Points d’attention</div>' + alerts.map((a) => '<div class="alert ' + a[0] + '" style="padding:7px 10px;font-size:12.5px">' + esc(a[1]) + '</div>').join('') + '</div><div><div class="exec-h">Recommandations clés</div>' + recos.map((t) => '<div class="reco-list"><li style="font-size:12.5px">' + esc(t) + '</li></div>').join('') + '</div></div>' +
    '<div class="exec-footer"><span>Aloui · Tran · Le Goff-Pronost · ARAMOS 2026 · CHU Angers</span><span class="tag">Outil ROI IA ' + esc(D.versionLabel) + ' · CHU Angers</span><span>Aide à la décision : ne remplace pas un audit juridique, technique ou médical</span></div></div>';
}

/* ---------- page résultats ---------- */
function refreshScoreViews() {
  const r = compute(), v = verdictInfo(r.global);
  const bs = $('bigScore'); if (bs) bs.innerHTML = fmt1(r.global) + '<small>/5</small>';
  const vd = $('verdictTxt'); if (vd) vd.textContent = v.text;
  const sw = $('sensWrap'); if (sw) sw.innerHTML = sensitivityHtml();
  const dl = $('dimList'); if (dl) dl.innerHTML = dimListHtml(r);
  const ex = $('execWrap'); if (ex) ex.innerHTML = execHtml(r, v);
  const kp = $('kpiScore'); if (kp) { kp.textContent = fmt1(r.global) + '/5'; kp.style.color = v.color; }
}
function dimListHtml(r) {
  return r.fams.map((f) => { const s = r.dims[f.id]; return '<div class="dim"><div class="dim-row"><span>' + f.emoji + ' ' + esc(f.name) + '</span><span><span class="w">×' + (state.weights[f.id] || 3) + '</span> <span style="color:' + scoreColor(s) + '">' + (s == null ? 'n.é.' : fmt1(s) + '/5') + '</span></span></div><div class="bar"><div class="fill" style="width:' + (s == null ? 0 : s * 20) + '%;background:' + scoreColor(s) + '"></div></div></div>'; }).join('');
}
function renderResults() {
  ensureWeights();
  const r = compute(), v = verdictInfo(r.global), fams = r.fams, m = computeMaturity();
  const root = $('resultsRoot'); if (!root) return;
  const strong = fams.filter((f) => r.dims[f.id] >= 4), weak = fams.filter((f) => r.dims[f.id] != null && r.dims[f.id] < 3), crit = fams.filter((f) => r.dims[f.id] != null && r.dims[f.id] <= 2), na = fams.filter((f) => r.dims[f.id] == null);
  const pn = D.PROFILE_NOTES[state.prof];
  let alerts = '';
  crit.forEach((f) => { alerts += '<div class="alert red"><strong>' + f.emoji + ' ' + esc(f.name) + '</strong> : score critique (' + fmt1(r.dims[f.id]) + '/5). Action prioritaire avant tout engagement contractuel.</div>'; });
  weak.filter((f) => r.dims[f.id] > 2).forEach((f) => { alerts += '<div class="alert amber"><strong>' + f.emoji + ' ' + esc(f.name) + '</strong> : vigilance recommandée (' + fmt1(r.dims[f.id]) + '/5).</div>'; });
  if (na.length) alerts += '<div class="alert amber"><strong>🕳 Angles morts</strong> : ' + na.map((f) => esc(f.name)).join(', ') + ' non évalué(s). Un critère non documenté est une information à instruire, pas un zéro.</div>';
  if (pn && pn.alert) alerts += '<div class="alert blue">' + pn.alert + '</div>';
  if ((state.nature === 'planning' || state.nature === 'rh') && state.rh === 'forte') alerts += '<div class="alert amber"><strong>⚠️ Risque RPS</strong> : forte tension RH, la dette d’apprentissage et la conduite du changement sont des prérequis non négociables.</div>';
  const ratio = erRatio(state.er), band = erBand(ratio);
  if (ratio != null && ratio > 1.1) alerts += '<div class="alert ' + (ratio > 1.6 ? 'red' : 'amber') + '"><strong>⚖️ ' + esc(band.label) + ' effort / récompense (' + ratio.toFixed(2) + ')</strong> : l’effort demandé aux équipes dépasse les contreparties prévues. Voir les leviers dans le module effort / récompense.</div>';
  alerts += regulationPanel();
  alerts += '<div class="alert blue"><strong>💡 Modèle OPEX</strong> : calculez le coût total sur cinq ans et vérifiez les clauses de renouvellement et de sortie avant signature.</div>';
  if (!weak.length && !na.length) alerts += '<div class="alert green"><strong>✅ Aucun point critique immédiat.</strong> Poursuivre avec une analyse contractuelle et technique détaillée.</div>';
  const recos = buildRecos(r, fams), actions = generateRoadmap(r);

  root.innerHTML =
    '<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="small">' + esc(fmtDate(state.dt)) + ' · ' + esc(profileLabel(state.prof)) + ' · ' + esc(natureLabel(state.nature)) + '</span><span class="tag">Outil ROI IA ' + esc(D.versionLabel) + '</span></div>' +
    '<div class="results-hero"><div><div class="small" style="color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.06em">Score pondéré global</div><div class="big-score" id="bigScore">' + fmt1(r.global) + '<small>/5</small></div><div class="verdict" id="verdictTxt">' + esc(v.text) + '</div><div style="margin-top:6px;font-size:13px;opacity:.85">' + esc(state.pn || 'Projet IA') + ' · ' + esc(state.dom || 'domaine non précisé') + ' · ' + esc(state.stage) + '</div></div>' +
    '<div class="ctx-box"><div><span>Profil :</span> <strong>' + esc(profileLabel(state.prof)) + '</strong></div><div><span>Nature :</span> <strong>' + esc(natureLabel(state.nature)) + '</strong></div><div><span>SI :</span> <strong>' + esc(state.si) + '</strong> · <span>RH :</span> <strong>' + esc(state.rh) + '</strong></div><div><span>Conduite du changement :</span> <strong>' + esc(state.ch) + '</strong></div></div></div>' +
    '<div class="actions-bar no-print"><button class="btn btn-sm btn-navy" onclick="libSaveCurrent()">💾 Enregistrer</button><button class="btn btn-sm btn-secondary" onclick="copyLink()">🔗 Copier le lien</button><button class="btn btn-sm btn-secondary" onclick="openFiche()">📋 Fiche pratique</button><button class="btn btn-sm btn-secondary" onclick="toggleExecView()">📄 Synthèse</button><button class="btn btn-sm btn-secondary" onclick="printResults()">🖨 Imprimer</button><button class="btn btn-sm btn-secondary" onclick="goEvalStep(1)">✏️ Modifier</button></div>' +
    '<div class="kpis"><div class="kpi"><small>Score global</small><strong id="kpiScore" style="color:' + v.color + '">' + fmt1(r.global) + '/5</strong></div><div class="kpi"><small>Solides</small><strong>' + strong.length + '/' + fams.length + '</strong></div><div class="kpi"><small>Vigilance</small><strong style="color:' + (weak.length ? 'var(--amber)' : 'var(--green)') + '">' + weak.length + '/' + fams.length + '</strong></div><div class="kpi"><small>Critiques</small><strong style="color:' + (crit.length ? 'var(--red)' : 'var(--green)') + '">' + crit.length + '/' + fams.length + '</strong></div><div class="kpi"><small>Couverture</small><strong>' + Math.round(r.coverage.rated / r.coverage.total * 100) + ' %</strong></div></div>' +
    '<div class="results-layout"><div><div class="h3">Scores par dimension</div><div class="dim-list" id="dimList">' + dimListHtml(r) + '</div></div><div class="radar-wrap"><div class="radar-title">Profil radar · ' + fams.length + ' familles</div>' + buildRadar([{dims: r.dims}], fams, 320) + '</div></div>' +
    '<div class="panel tight"><div class="h3" style="margin-top:0">Points d’attention</div>' + alerts + '</div>' +
    '<details class="sec" open><summary>🧭 Recommandations opérationnelles</summary><div class="sec-body"><ul class="reco-list">' + recos.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></div></details>' +
    '<details class="sec" open><summary>🗺 Feuille de route priorisée</summary><div class="sec-body" id="rmWrap">' + roadmapHtml(actions, '') + '</div></details>' +
    '<details class="sec"><summary>🏥 Maturité de l’établissement <span class="tag" style="margin-left:auto;margin-right:8px">' + fmt1(m.score) + '/5</span></summary><div class="sec-body"><div class="maturity"><div><div class="m-score" style="color:' + m.verdict.color + '">' + fmt1(m.score) + '</div><div class="small" style="text-align:center">/5 · indépendant de la solution</div></div><div>' +
      [['Maturité SI', m.si, {5: 'Intégré et performant', 3: 'En structuration', 1: 'Fragile / hétérogène'}[m.si]], ['Disponibilité RH', m.rh, {5: 'Tension limitée', 3: 'Modérée', 1: 'Très forte'}[m.rh]], ['Conduite du changement', m.ch, {5: 'Rodée et outillée', 3: 'En développement', 1: 'Peu structurée'}[m.ch]]].map((x) => '<div class="m-bar-lbl"><span>' + x[0] + '</span><strong>' + x[2] + '</strong></div><div class="m-bar"><div class="fill" style="width:' + x[1] * 20 + '%;background:' + scoreColor(x[1]) + '"></div></div>').join('') +
      '<div class="alert ' + m.verdict.cls + '" style="margin-top:6px"><strong>' + esc(m.verdict.text) + '</strong></div></div></div></div></details>' +
    '<details class="sec"' + (ratio != null ? ' open' : '') + '><summary>⚖️ Balance effort / récompense' + (ratio != null ? ' <span class="tag" style="margin-left:auto;margin-right:8px">' + ratio.toFixed(2) + ' · ' + esc(band.label) + '</span>' : '') + '</summary><div class="sec-body">' + erPanel() + '</div></details>' +
    '<details class="sec"><summary>🎚 Pondérations et sensibilité</summary><div class="sec-body">' + weightsPanel(fams) + '</div></details>' +
    '<details class="sec"' + (state.calc && state.calc.abo ? ' open' : '') + '><summary>🧮 Calculateur : la règle des cinq ans</summary><div class="sec-body">' + calcPanel() + '</div></details>' +
    '<div id="benchWrap">' + benchHtml(r) + '</div>' +
    '<details class="sec"><summary>🔍 Détail des critères</summary><div class="sec-body table-wrap"><table class="table"><thead><tr><th>Dimension</th><th>Critère</th><th>Note</th></tr></thead><tbody>' + fams.map((f) => f.criteria.map((c) => { const s = state.scores[c[0]]; return '<tr><td>' + f.emoji + ' ' + esc(radarLabel(f)) + '</td><td><strong>' + esc(c[1]) + '</strong><div class="small">' + esc(c[2]) + '</div></td><td><strong style="color:' + (s >= 1 ? scoreColor(s) : '#5A6880') + '">' + (s >= 1 ? s + '/5' : s === 0 ? 'n.é.' : '—') + '</strong></td></tr>'; }).join('')).join('') + '</tbody></table></div></details>' +
    '<details class="sec" id="execSec"><summary>📄 Synthèse exécutive (une page)</summary><div class="sec-body" id="execWrap">' + execHtml(r, v) + '</div></details>' +
    '<details class="sec"><summary>📤 Transmettre les résultats anonymisés</summary><div class="sec-body"><p class="small">Seuls les scores et le contexte général sont transmis (profil, nature, stade, maturité) : aucun nom d’établissement ni de projet. Ces données alimentent le benchmark inter-établissements.</p><form name="resultats-anonymises-roi-ia" method="POST" data-netlify="true" onsubmit="prepareAnon()"><input type="hidden" name="form-name" value="resultats-anonymises-roi-ia"><input type="hidden" name="payload" id="anonPayload"><label class="row" style="font-size:13px;margin:8px 0"><input type="checkbox" required> J’accepte de transmettre ces résultats anonymisés à des fins de consolidation statistique.</label><button class="btn btn-sm btn-primary" type="submit">Envoyer</button></form></div></details>' +
    '<div class="save-bar no-print"><span class="small" style="font-weight:700;color:var(--navy)">🔗 Lien de sauvegarde</span><input type="text" readonly id="saveUrl" value="' + esc(stateToUrl()) + '" onclick="this.select()"><button class="btn btn-sm btn-secondary" onclick="copyLink()">Copier</button></div>' +
    '<div class="actions-bar no-print"><button class="btn btn-navy" onclick="libSaveCurrent();showScreen(\'compare\')">⚖️ Comparer avec une autre évaluation</button><button class="btn btn-secondary" onclick="startNewEval()">＋ Nouvelle évaluation</button></div>';
  libSaveCurrent(true);
  fetchBenchmark();
  if (typeof statsHit === 'function') statsHit('evaluation', 'roiia.hit.eval.' + state.evalId, {prof: state.prof, nat: state.nature});
  if (window.maybeShowInstall) window.maybeShowInstall();
}
function copyLink() { const u = stateToUrl(); copyText(u).then((ok) => toast(ok ? 'Lien copié dans le presse-papiers' : 'Copie impossible : sélectionnez le lien manuellement')); const i = $('saveUrl'); if (i) i.value = u; }
function toggleExecView() { const d = $('execSec'); if (d) { d.open = true; d.scrollIntoView({behavior: 'smooth', block: 'start'}); } }
function printResults() { document.querySelectorAll('#resultsRoot details.sec').forEach((d) => { d.open = true; }); setTimeout(() => window.print(), 150); }
function prepareAnon() {
  const r = compute();
  $('anonPayload').value = JSON.stringify({date: new Date().toISOString(), version: APP_VERSION + '-2026', profile: state.prof, nature: state.nature, stage: state.stage, si: state.si, rh: state.rh, change: state.ch, global: r.global, dims: r.dims, weights: state.weights, scores: state.scores, er: erRatio(state.er)});
}
/* fiche pratique (feuille de route + checklist) */
let ficheTab = 'rm';
function openFiche() { ficheShow(ficheTab); openModal('ficheOverlay'); }
function ficheShow(tab) {
  ficheTab = tab;
  document.querySelectorAll('#ficheTabs button').forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
  const body = $('ficheBody');
  if (tab === 'rm') body.innerHTML = '<div id="rmWrapF">' + roadmapHtml(generateRoadmap(compute()), 'f') + '</div>';
  else { body.innerHTML = '<div id="clWrap">' + checklistHtml() + '</div>'; }
}
function printModal(id) { document.body.classList.add('print-modal'); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('print-modal'), 300); }, 100); }
