/* ============================================================
   Accueil + Évaluer (contexte, assistant par dimension)
   ============================================================ */

/* ---------- Accueil ---------- */
function renderHome() {
  if (typeof renderHomeStats === 'function') renderHomeStats();
  const last = libAll()[0];
  const el = $('homeLast');
  if (el) {
    if (last) {
      const v = verdictInfo(last.global);
      el.innerHTML = '<div class="last-eval clickable" onclick="libOpen(\'' + last.id + '\')">' +
        '<div class="score" style="color:' + v.color + '">' + fmt1(last.global) + '<small style="font-size:12px;color:var(--muted)">/5</small></div>' +
        '<div class="meta"><strong>' + esc(last.name) + '</strong><span>' + esc(profileLabel(last.prof)) + ' · ' + esc(natureLabel(last.nat)) + ' · ' + esc(fmtDate(last.dt)) + '</span></div>' +
        '<span class="btn btn-sm btn-navy">Reprendre →</span></div>';
    } else el.innerHTML = '';
  }
  const ex = $('homeExamples');
  if (ex && !ex.dataset.built) {
    ex.dataset.built = '1';
    ex.innerHTML = Object.keys(D.EXAMPLES).map((k) => {
      const m = D.EXAMPLE_META[k];
      return '<div class="card example-card clickable" onclick="loadExample(\'' + k + '\')"><span class="ex-icon">' + m.icon + '</span>' +
        '<div class="ex-title">' + esc(m.title) + '</div><div class="ex-desc">' + esc(m.desc) + '</div>' +
        '<div class="ex-tags">' + m.tags.map((t) => '<span class="tag">' + esc(t) + '</span>').join('') + '</div></div>';
    }).join('');
  }
}
function startNewEval() {
  state = freshState();
  state.step = 0;
  showScreen('eval');
}
function loadExample(key) {
  const ex = D.EXAMPLES[key]; if (!ex) return;
  state = freshState();
  state.pn = ex.projectName; state.dom = ex.domain; state.prof = ex.profile; state.stage = ex.stage;
  state.si = ex.si; state.rh = ex.rh; state.ch = ex.change; state.nature = ex.nature;
  state.scores = Object.assign({}, ex.scores); state.er = ex.er ? JSON.parse(JSON.stringify(ex.er)) : null;
  applyAutoWeights();
  state.step = 2;
  showScreen('eval');
  toast('Exemple chargé : ' + D.EXAMPLE_META[key].title);
}

/* ---------- Évaluer : orchestration ---------- */
function renderEval() {
  const steps = [0, 1, 2];
  steps.forEach((i) => { const d = $('estep' + i); if (d) d.className = 'dot ' + (i < state.step ? 'done' : i === state.step ? 'active' : ''); });
  const lbl = $('estepLbl'); if (lbl) lbl.textContent = ['1 / 3 · Contexte', '2 / 3 · Évaluation', '3 / 3 · Résultats'][state.step];
  ['ctx', 'wiz', 'res'].forEach((s, i) => { const el = $('ev-' + s); if (el) el.classList.toggle('hidden', i !== state.step); });
  if (state.step === 0) renderContext();
  if (state.step === 1) renderWizard();
  if (state.step === 2) renderResults();
}
function goEvalStep(n) {
  if (n === 1 && state.step === 0) { if (!validateContext()) return; if (!state.wCustom) applyAutoWeights(); else ensureWeights(); }
  if (n === 2 && state.step === 1 && !validateScoresSoft()) return;
  if (n === 2 && state.step === 0) { if (!validateContext()) return; ensureWeights(); }
  state.step = n;
  renderEval();
  window.scrollTo({top: 0});
}

/* ---------- Étape 1 : contexte ---------- */
function renderContext() {
  const pg = $('profileGrid');
  if (pg) pg.innerHTML = D.PROFILES.map((p) => '<div class="profile-card' + (state.prof === p.id ? ' selected' : '') + '" onclick="selProfile(\'' + p.id + '\')"><span class="p-ic">' + p.emoji + '</span><div class="p-name">' + esc(p.label) + '</div></div>').join('');
  const pd = $('profileDesc'); if (pd) pd.innerHTML = state.prof ? esc(PROFILE_BY_ID[state.prof].desc) : '<em>Sélectionnez le profil de votre établissement : il prérègle les pondérations de la grille.</em>';
  const ng = $('natureGrid');
  if (ng) ng.innerHTML = D.NATURES.map((n) => '<div class="nature-card' + (state.nature === n.id ? ' selected' : '') + '" onclick="selNature(\'' + n.id + '\')"><span class="n-ic">' + n.icon + '</span><div class="n-name">' + esc(n.name) + '</div><div class="n-desc">' + esc(n.desc) + '</div></div>').join('');
  $('projectName').value = state.pn || ''; $('domain').value = state.dom || '';
  const st = $('stage'); st.innerHTML = D.STAGES.map((s) => '<option' + (s === state.stage ? ' selected' : '') + '>' + esc(s) + '</option>').join('');
  $('si').value = state.si || ''; $('rh').value = state.rh || ''; $('change').value = state.ch || '';
}
function selProfile(id) { readContextForm(); state.prof = id; state.wCustom = false; renderContext(); }
function selNature(id) { readContextForm(); state.nature = id; state.wCustom = false; renderContext(); }
function readContextForm() {
  state.pn = $('projectName').value.trim(); state.dom = $('domain').value.trim(); state.stage = $('stage').value;
  state.si = $('si').value; state.rh = $('rh').value; state.ch = $('change').value;
}
function validateContext() {
  readContextForm();
  const miss = [];
  if (!state.prof) miss.push('le profil d’établissement');
  if (!state.si) miss.push('la maturité SI');
  if (!state.rh) miss.push('la tension RH');
  if (!state.ch) miss.push('la conduite du changement');
  if (!state.nature) miss.push('la nature du projet');
  if (miss.length) { toast('À compléter : ' + miss.join(', ')); return false; }
  return true;
}

/* ---------- Étape 2 : assistant par dimension ---------- */
let currentDim = 0;
function renderWizard() {
  const fams = getFamilies();
  const root = $('dimWizard'); if (!root) return;
  if (currentDim >= fams.length) currentDim = 0;
  let html = '';
  if ((state.nature === 'planning' || state.nature === 'rh') && state.rh === 'forte')
    html += '<div class="alert amber"><strong>⚠️ Risque RPS identifié</strong> — forte tension RH et projet ' + esc(natureLabel(state.nature)) + ' : la dette d’apprentissage et la conduite du changement sont des prérequis non négociables.</div>';
  html += '<div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="pill pill-cyan">' + esc(natureLabel(state.nature)) + '</span><span class="pill pill-navy">' + esc(profileLabel(state.prof)) + '</span></div>';
  html += '<div class="crit-progress"><span class="crit-progress-label" id="critProgLbl"></span><div class="crit-progress-bar"><div class="crit-progress-fill" id="critProgFill"></div></div></div>';
  html += '<div class="wiz-dots">' + fams.map((f, i) => '<div class="wiz-dot" id="wdot' + i + '" title="' + esc(f.name) + '" onclick="showDim(' + i + ')">' + f.emoji + '</div>').join('') + '</div>';
  html += fams.map((f, fi) => {
    let page = '<div class="dim-page" id="dimpage' + fi + '">';
    page += '<div class="dim-head"><div class="d-ic">' + f.emoji + '</div><div><div class="d-name">' + esc(f.name) + '</div><div class="d-sub">Dimension ' + (fi + 1) + ' sur ' + fams.length + ' · pondération ×' + (state.weights[f.id] || 3) + '</div></div>' +
      '<div class="d-score"><strong id="dscore' + fi + '">—</strong><span>/5</span></div></div>';
    const h = dimHelp(f); if (h) page += '<div class="dim-help">💡 ' + tipify(h) + '</div>';
    page += f.criteria.map((c) => critHtml(c, f, fi)).join('');
    page += '</div>';
    return page;
  }).join('');
  html += '<div class="wiz-footer"><button class="btn btn-secondary btn-sm" id="wizPrev" onclick="prevDim()">← Précédente</button><span class="cnt" id="wizCnt"></span><button class="btn btn-primary btn-sm" id="wizNext" onclick="nextDim()">Suivante →</button></div>';
  root.innerHTML = html;
  showDim(currentDim, true);
}
function critHtml(c, f, fi) {
  const id = c[0], sc = state.scores[id];
  const na = sc === 0 || sc === null;
  const btns = [1, 2, 3, 4, 5].map((v) => '<div class="scale-btn' + (sc === v ? ' sel' : '') + '" role="button" onclick="setScore(\'' + id + '\',' + v + ',\'' + f.id + '\',' + fi + ')"><span class="n">' + v + '</span><span class="l">' + D.SCALE_LABELS[v - 1] + '</span></div>').join('') +
    '<div class="scale-btn na-btn' + (na ? ' sel' : '') + '" role="button" title="Non évalué : exclu du calcul" onclick="setScore(\'' + id + '\',0,\'' + f.id + '\',' + fi + ')"><span class="n">∅</span><span class="l">Non évalué</span></div>';
  let g = '';
  if (c[3] && c[3].length) {
    g = '<div class="guided-toggle" onclick="toggleGuided(\'g-' + id + '\')">🔍 Questions guidées <span class="small" style="font-weight:500">(calculer la note)</span></div>' +
      '<div class="guided-panel" id="g-' + id + '">' + c[3].map((q, qi) => '<div class="guided-q"><div class="guided-q-text">' + (qi + 1) + '. ' + esc(q.q) + '</div><div class="guided-opts">' +
        q.opts.map((o, oi) => '<button type="button" class="guided-opt" onclick="setGuided(\'' + id + '\',' + qi + ',' + oi + ',\'' + f.id + '\',' + fi + ',this)">' + esc(o[0]) + '</button>').join('') + '</div></div>').join('') +
      '<div class="guided-result" id="gr-' + id + '"></div></div>';
  }
  return '<div class="criterion' + (sc >= 1 ? ' scored' : na ? ' na' : '') + '" id="crit-' + id + '"><div class="crit-top"><div class="crit-label">' + esc(c[1]) + '</div><span class="badge-score ' + (na ? 'ns' : scoreCls(sc >= 1 ? sc : null)) + '" id="badge-' + id + '">' + (sc >= 1 ? sc + '/5' : na ? 'Non évalué' : 'Non noté') + '</span></div>' +
    '<div class="crit-help">' + tipify(c[2]) + '</div><div class="scale">' + btns + '</div>' + g + '<div id="alert-' + id + '" class="inline-alert"></div></div>';
}
const guidedAnswers = {};
function toggleGuided(id) { const p = $(id); if (p) p.classList.toggle('open'); }
function setGuided(critId, qi, oi, famId, fi, btn) {
  const wrap = btn.closest('.guided-opts'); wrap.querySelectorAll('.guided-opt').forEach((b) => b.classList.remove('sel')); btn.classList.add('sel');
  const fam = famById(famId); const crit = fam && fam.criteria.find((c) => c[0] === critId); if (!crit) return;
  if (!guidedAnswers[critId]) guidedAnswers[critId] = {};
  guidedAnswers[critId][qi] = crit[3][qi].opts[oi][1];
  const ans = guidedAnswers[critId];
  if (Object.keys(ans).length === crit[3].length) {
    const total = Object.values(ans).reduce((a, b) => a + b, 0);
    const max = crit[3].reduce((s, q) => s + Math.max.apply(null, q.opts.map((o) => o[1])), 0);
    const score = clamp(Math.round(1 + (total / max) * 4), 1, 5);
    setScore(critId, score, famId, fi);
    const r = $('gr-' + critId); if (r) { r.className = 'guided-result show'; r.innerHTML = 'Note calculée : <strong style="color:var(--navy)">' + score + '/5</strong> — vous pouvez l’ajuster manuellement.'; }
  }
}
function setScore(id, v, famId, fi) {
  state.scores[id] = v;
  const crit = $('crit-' + id);
  if (crit) {
    crit.querySelectorAll('.scale-btn').forEach((b, i) => b.classList.toggle('sel', (v >= 1 && i === v - 1) || (v === 0 && i === 5)));
    crit.classList.toggle('scored', v >= 1); crit.classList.toggle('na', v === 0);
    const b = $('badge-' + id); if (b) { b.textContent = v >= 1 ? v + '/5' : 'Non évalué'; b.className = 'badge-score ' + (v >= 1 ? scoreCls(v) : 'ns'); }
  }
  checkInlineAlert(id, v);
  updateDimScore(fi);
  updateWizardDots();
  updateCritProgress();
}
function checkInlineAlert(id, v) {
  const cfg = D.INLINE_ALERTS[id], el = $('alert-' + id); if (!el) return;
  if (cfg && v >= 1 && v <= cfg.threshold) { el.className = 'inline-alert show ' + cfg.level; el.innerHTML = '<span>' + (cfg.level === 'critical' ? '🚨' : '⚠️') + '</span><span>' + esc(cfg.msg) + '</span>'; }
  else el.className = 'inline-alert';
}
function dimAvg(f) { let s = 0, n = 0; f.criteria.forEach((c) => { const v = state.scores[c[0]]; if (v >= 1) { s += v; n++; } }); return n ? s / n : null; }
function updateDimScore(fi) { const f = getFamilies()[fi]; const el = $('dscore' + fi); if (el && f) { const a = dimAvg(f); el.textContent = a == null ? '—' : fmt1(a); } }
function updateWizardDots() {
  getFamilies().forEach((f, i) => {
    const d = $('wdot' + i); if (!d) return;
    const vals = f.criteria.map((c) => state.scores[c[0]]);
    const done = vals.every((v) => v != null && v !== undefined), some = vals.some((v) => v != null && v !== undefined);
    d.className = 'wiz-dot' + (i === currentDim ? ' active' : done ? ' done' : some ? ' partial' : '');
  });
}
function updateCritProgress() {
  const fams = getFamilies(); let total = 0, rated = 0;
  fams.forEach((f) => f.criteria.forEach((c) => { total++; const v = state.scores[c[0]]; if (v != null && v !== undefined) rated++; }));
  const l = $('critProgLbl'), b = $('critProgFill');
  if (l) l.textContent = rated + ' / ' + total + ' critères renseignés';
  if (b) b.style.width = Math.round(rated / total * 100) + '%';
}
function showDim(i, noScroll) {
  const fams = getFamilies(); currentDim = clamp(i, 0, fams.length - 1);
  fams.forEach((f, k) => { const p = $('dimpage' + k); if (p) p.classList.toggle('active', k === currentDim); updateDimScore(k); fams[k].criteria.forEach((c) => { const v = state.scores[c[0]]; if (v >= 1) checkInlineAlert(c[0], v); }); });
  const prev = $('wizPrev'), next = $('wizNext'), cnt = $('wizCnt');
  if (prev) prev.style.visibility = currentDim > 0 ? 'visible' : 'hidden';
  if (next) { next.textContent = currentDim < fams.length - 1 ? 'Suivante →' : '✓ Voir les résultats'; next.className = 'btn btn-sm ' + (currentDim < fams.length - 1 ? 'btn-primary' : 'btn-navy'); }
  if (cnt) cnt.textContent = (currentDim + 1) + ' / ' + fams.length + ' dimensions';
  updateWizardDots(); updateCritProgress();
  if (!noScroll) { const w = $('dimWizard'); if (w) w.scrollIntoView({behavior: 'smooth', block: 'start'}); }
}
function nextDim() { const n = getFamilies().length; if (currentDim < n - 1) showDim(currentDim + 1); else goEvalStep(2); }
function prevDim() { if (currentDim > 0) showDim(currentDim - 1); }
function validateScoresSoft() {
  const fams = getFamilies(); let missing = 0, rated = 0;
  fams.forEach((f) => f.criteria.forEach((c) => { const v = state.scores[c[0]]; if (v == null) missing++; else if (v >= 1) rated++; }));
  if (rated === 0) { toast('Notez au moins un critère avant de voir les résultats'); return false; }
  if (missing > 0 && !confirm(missing + ' critère(s) non renseigné(s) seront exclus du calcul (angles morts). Continuer ?')) return false;
  return true;
}
/* swipe tactile entre dimensions */
(function () {
  let x0 = 0, y0 = 0;
  document.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].screenX; y0 = e.changedTouches[0].screenY; }, {passive: true});
  document.addEventListener('touchend', (e) => {
    if (currentScreen !== 'eval' || state.step !== 1) return;
    if (e.target.closest && e.target.closest('input[type=range],.overlay')) return;
    const dx = e.changedTouches[0].screenX - x0, dy = e.changedTouches[0].screenY - y0;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) { if (currentDim < getFamilies().length - 1) showDim(currentDim + 1); } else prevDim(); }
  }, {passive: true});
})();
