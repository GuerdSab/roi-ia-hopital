/* ============================================================
   Comparer (2 solutions · atelier multi-acteurs · suivi dans le temps)
   Mes évaluations (bibliothèque locale)
   ============================================================ */
let cmpMode = 'duo';
const cmpSel = {};            // id -> true (évaluations enregistrées sélectionnées)
let cmpPasted = [];           // snapshots collés
const CMP_MODES = {
  duo: {label: '⚖️ Deux solutions', min: 2, max: 2, hint: 'Comparez deux solutions évaluées sur la même grille (même nature de projet). Enregistrez chaque évaluation dans Mes évaluations ou collez des liens de sauvegarde.'},
  atelier: {label: '👥 Atelier multi-acteurs', min: 2, max: 6, hint: 'Consolidez les évaluations d’un même projet par plusieurs acteurs (DG, DSN, CME, direction des soins…) : divergences fortes à mettre à l’agenda de la gouvernance, consensus et critères clivants.'},
  suivi: {label: '📈 Suivi dans le temps', min: 2, max: 5, hint: 'Réévaluez le même projet à intervalles réguliers (T0, +6, +12 mois) : trajectoire du score, dimensions en progression ou en dégradation, signal d’alerte précoce sur la dette d’apprentissage.'}
};
function renderCompare() {
  const seg = $('cmpSeg'); if (seg) seg.innerHTML = Object.keys(CMP_MODES).map((k) => '<button class="' + (cmpMode === k ? 'active' : '') + '" onclick="setCmpMode(\'' + k + '\')">' + CMP_MODES[k].label + '</button>').join('');
  const hint = $('cmpHint'); if (hint) hint.textContent = CMP_MODES[cmpMode].hint;
  renderPicker();
  const out = $('cmpOut'); if (out) out.innerHTML = '';
}
function setCmpMode(k) { cmpMode = k; renderCompare(); }
function renderPicker() {
  const list = libAll(); const el = $('cmpPicker'); if (!el) return;
  const m = CMP_MODES[cmpMode];
  let html = '<div class="h3" style="margin-top:0">Évaluations enregistrées <span class="small" style="font-weight:500">(' + m.min + (m.max > m.min ? ' à ' + m.max : '') + ' à sélectionner)</span></div>';
  html += list.length ? list.map((it) => '<div class="pick-item' + (cmpSel[it.id] ? ' sel' : '') + '" onclick="togglePick(\'' + it.id + '\')"><div class="pk-chk"></div><div class="pk-meta"><strong>' + esc(it.name) + '</strong><span>' + esc(profileLabel(it.prof)) + ' · ' + esc(natureLabel(it.nat)) + ' · ' + esc(fmtDate(it.dt)) + '</span></div><div class="pk-score" style="color:' + scoreColor(it.global) + '">' + fmt1(it.global) + '</div></div>').join('')
    : '<div class="empty" style="padding:14px">Aucune évaluation enregistrée pour l’instant. Terminez une évaluation (elle s’enregistre automatiquement) ou collez des liens ci-dessous.</div>';
  html += '<div class="h3">Ou coller des liens de sauvegarde</div><div class="field"><textarea id="cmpLinks" placeholder="Un lien (ou code) par ligne…" rows="3"></textarea></div>' +
    (cmpPasted.length ? '<div class="small" style="margin-bottom:8px">' + cmpPasted.length + ' lien(s) ajouté(s) : ' + cmpPasted.map((p) => esc(p.pn || 'sans nom')).join(', ') + ' <button class="btn btn-sm btn-secondary" onclick="cmpPasted=[];renderPicker()">effacer</button></div>' : '') +
    '<div class="row"><button class="btn btn-sm btn-secondary" onclick="addPastedLinks()">＋ Ajouter les liens</button><button class="btn btn-primary" onclick="runCompare()">Lancer l’analyse →</button></div>';
  el.innerHTML = html;
}
function togglePick(id) { cmpSel[id] = !cmpSel[id]; renderPicker(); }
function addPastedLinks() {
  const ta = $('cmpLinks'); const lines = (ta.value || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
  let n = 0;
  lines.forEach((l) => { try { const s = decodeSnap(l); if (s && s.sc) { cmpPasted.push(s); n++; } } catch (e) {} });
  ta.value = '';
  toast(n ? n + ' lien(s) ajouté(s)' : 'Aucun lien valide reconnu');
  renderPicker();
}
function selectedEvals() {
  const evs = [];
  libAll().forEach((it) => { if (cmpSel[it.id]) evs.push(evalFromSnap(it.snap)); });
  cmpPasted.forEach((s) => evs.push(evalFromSnap(s)));
  return evs;
}
function runCompare() {
  const m = CMP_MODES[cmpMode], evs = selectedEvals();
  if (evs.length < m.min) { toast('Sélectionnez au moins ' + m.min + ' évaluations'); return; }
  if (evs.length > m.max) { toast('Au maximum ' + m.max + ' évaluations pour ce mode'); return; }
  const natures = [...new Set(evs.map((e) => e.nature))];
  if (natures.length > 1) { toast('Les évaluations doivent porter sur la même nature de projet (' + natures.map(natureLabel).join(' / ') + ')'); return; }
  const out = $('cmpOut');
  if (cmpMode === 'duo') out.innerHTML = duoHtml(evs);
  else if (cmpMode === 'atelier') out.innerHTML = atelierHtml(evs);
  else out.innerHTML = suiviHtml(evs);
  out.scrollIntoView({behavior: 'smooth', block: 'start'});
}
function cmpFams(evs) { return famsForNature(evs[0].nature, evs[0].prof); }
function legendHtml(evs) { return '<div class="legend">' + evs.map((e, i) => '<span><i style="background:' + SERIES_COLORS[i % SERIES_COLORS.length] + '"></i>' + esc(e.label) + '</span>').join('') + '</div>'; }

/* ---- deux solutions ---- */
function duoHtml(evs) {
  const [A, B] = evs, fams = cmpFams(evs), diff = (A.r.global || 0) - (B.r.global || 0);
  const vA = verdictInfo(A.r.global), vB = verdictInfo(B.r.global);
  const banner = Math.abs(diff) < .3 ? '<small>Résultat</small><strong>Scores très proches (écart ' + Math.abs(diff).toFixed(1) + ' pt) : affinez sur les dimensions discriminantes</strong>' : '<small>Meilleur score ROI global</small><strong>' + esc(diff > 0 ? A.label : B.label) + ' · ' + Math.abs(diff).toFixed(1) + ' point(s) d’avance</strong>';
  const card = (E, v, i, win) => '<div class="cmp-card' + (win ? ' win' : '') + '" style="border-color:' + SERIES_COLORS[i] + '"><div class="c-name" style="color:' + SERIES_COLORS[i] + '">' + esc(E.label) + '</div><div class="c-score" style="color:' + v.color + '">' + fmt1(E.r.global) + '</div><div class="c-verdict">' + esc(v.text) + '</div></div>';
  const rows = fams.map((f) => { const a = A.r.dims[f.id], b = B.r.dims[f.id]; const d = (a == null || b == null) ? null : a - b; return '<tr><td><strong>' + f.emoji + ' ' + esc(radarLabel(f)) + '</strong></td><td style="font-weight:700;color:' + scoreColor(a) + '">' + (a == null ? 'n.é.' : fmt1(a)) + '</td><td style="font-weight:700;color:' + scoreColor(b) + '">' + (b == null ? 'n.é.' : fmt1(b)) + '</td><td style="font-weight:700;color:' + (d == null ? '#5A6880' : d > .2 ? SERIES_COLORS[0] : d < -.2 ? SERIES_COLORS[1] : '#5A6880') + '">' + (d == null ? '—' : (d > 0 ? '+' : '') + d.toFixed(1) + (Math.abs(d) > .2 ? ' ' + esc(d > 0 ? A.label : B.label) : ' =')) + '</td></tr>'; }).join('');
  return '<div class="panel"><div class="banner">' + banner + '</div><div class="cmp-cards">' + card(A, vA, 0, diff > .2) + card(B, vB, 1, diff < -.2) + '</div><div class="radar-wrap"><div class="radar-title">Radars superposés</div>' + buildRadar(evs.map((e, i) => ({dims: e.r.dims, color: SERIES_COLORS[i]})), fams, 320) + legendHtml(evs) + '</div><div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Dimension</th><th>' + esc(A.label) + '</th><th>' + esc(B.label) + '</th><th>Écart</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="actions-bar"><button class="btn btn-sm btn-secondary" onclick="window.print()">🖨 Imprimer</button></div></div>';
}
/* ---- atelier multi-acteurs ---- */
function atelierHtml(evs) {
  const fams = cmpFams(evs);
  const rows = fams.map((f) => { const vals = evs.map((e) => e.r.dims[f.id]).filter((v) => v != null); const spread = vals.length ? Math.max.apply(null, vals) - Math.min.apply(null, vals) : null; return {f, vals: evs.map((e) => e.r.dims[f.id]), spread}; });
  const strong = rows.filter((x) => x.spread != null && x.spread >= 1.5), cons = rows.filter((x) => x.spread != null && x.spread <= .5);
  const critRows = [];
  fams.forEach((f) => f.criteria.forEach((c) => { const vals = evs.map((e) => e.st.scores[c[0]]).filter((v) => v >= 1); if (vals.length >= 2) { const sp = Math.max.apply(null, vals) - Math.min.apply(null, vals); if (sp >= 2) critRows.push({f, c, sp, vals: evs.map((e) => e.st.scores[c[0]])}); } }));
  const globals = evs.map((e) => e.r.global).filter((g) => g != null), gmean = globals.length ? globals.reduce((a, b) => a + b, 0) / globals.length : null;
  return '<div class="panel"><div class="banner"><small>Atelier multi-acteurs · ' + evs.length + ' participants</small><strong>Score moyen ' + fmt1(gmean) + '/5 · ' + strong.length + ' divergence(s) forte(s) · ' + cons.length + ' consensus</strong></div>' +
    '<div class="cmp-cards">' + evs.map((e, i) => '<div class="cmp-card" style="border-color:' + SERIES_COLORS[i % 6] + '"><div class="c-name" style="color:' + SERIES_COLORS[i % 6] + '">' + esc(e.label) + '</div><div class="c-score" style="color:' + verdictInfo(e.r.global).color + '">' + fmt1(e.r.global) + '</div><div class="c-verdict">' + esc(fmtDate(e.dt)) + '</div></div>').join('') + '</div>' +
    '<div class="radar-wrap"><div class="radar-title">Radars superposés</div>' + buildRadar(evs.map((e, i) => ({dims: e.r.dims, color: SERIES_COLORS[i % 6], fill: .06})), fams, 320) + legendHtml(evs) + '</div>' +
    (strong.length ? '<div class="alert red" style="margin-top:12px"><strong>Divergences fortes (écart ≥ 1,5) à mettre à l’agenda de la gouvernance :</strong> ' + strong.map((x) => esc(radarLabel(x.f)) + ' (' + x.spread.toFixed(1) + ')').join(', ') + '</div>' : '<div class="alert green" style="margin-top:12px">Aucune divergence forte entre participants.</div>') +
    (cons.length ? '<div class="alert green"><strong>Consensus (écart ≤ 0,5) :</strong> ' + cons.map((x) => esc(radarLabel(x.f))).join(', ') + '</div>' : '') +
    '<div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Dimension</th>' + evs.map((e) => '<th>' + esc(e.label) + '</th>').join('') + '<th>Écart</th></tr></thead><tbody>' + rows.map((x) => '<tr><td><strong>' + x.f.emoji + ' ' + esc(radarLabel(x.f)) + '</strong></td>' + x.vals.map((v) => '<td style="font-weight:700;color:' + scoreColor(v) + '">' + (v == null ? 'n.é.' : fmt1(v)) + '</td>').join('') + '<td style="font-weight:800;color:' + (x.spread >= 1.5 ? '#A32D2D' : x.spread <= .5 ? '#0F6E56' : '#BA7517') + '">' + (x.spread == null ? '—' : x.spread.toFixed(1)) + '</td></tr>').join('') + '</tbody></table></div>' +
    (critRows.length ? '<div class="h3">Critères les plus clivants (écart ≥ 2)</div><div class="table-wrap"><table class="table"><thead><tr><th>Critère</th>' + evs.map((e) => '<th>' + esc(e.label) + '</th>').join('') + '</tr></thead><tbody>' + critRows.sort((a, b) => b.sp - a.sp).map((x) => '<tr><td>' + x.f.emoji + ' <strong>' + esc(x.c[1]) + '</strong></td>' + x.vals.map((v) => '<td style="font-weight:700;color:' + (v >= 1 ? scoreColor(v) : '#5A6880') + '">' + (v >= 1 ? v : '—') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '') +
    '<div class="actions-bar"><button class="btn btn-sm btn-secondary" onclick="window.print()">🖨 Imprimer</button></div></div>';
}
/* ---- suivi dans le temps ---- */
function suiviHtml(evs) {
  evs = evs.slice().sort((a, b) => (a.dt || '').localeCompare(b.dt || ''));
  const fams = cmpFams(evs), n = evs.length;
  const names = [...new Set(evs.map((e) => e.name))];
  const w = 600, h = 160, pad = 36;
  const pts = evs.map((e, i) => ({x: pad + i * (w - 2 * pad) / Math.max(1, n - 1), y: h - pad - ((e.r.global || 0) / 5) * (h - 2 * pad), g: e.r.global, dt: e.dt}));
  const spark = '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '">' + [1, 2, 3, 4, 5].map((k) => '<line x1="' + pad + '" x2="' + (w - pad) + '" y1="' + (h - pad - k / 5 * (h - 2 * pad)) + '" y2="' + (h - pad - k / 5 * (h - 2 * pad)) + '" stroke="#e3eaf3"/><text x="' + (pad - 8) + '" y="' + (h - pad - k / 5 * (h - 2 * pad) + 4) + '" font-size="10" text-anchor="end" fill="#5A6880">' + k + '</text>').join('') +
    '<polyline points="' + pts.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ') + '" fill="none" stroke="#00AEEF" stroke-width="3"/>' + pts.map((p) => '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="6" fill="' + scoreColor(p.g) + '" stroke="#fff" stroke-width="2"/><text x="' + p.x.toFixed(1) + '" y="' + (p.y - 12).toFixed(1) + '" font-size="12" font-weight="700" text-anchor="middle" fill="#1B3A6B">' + fmt1(p.g) + '</text><text x="' + p.x.toFixed(1) + '" y="' + (h - pad + 16) + '" font-size="10" text-anchor="middle" fill="#5A6880">' + esc(fmtDate(p.dt)) + '</text>').join('') + '</svg>';
  const first = evs[0], last = evs[n - 1];
  const delta = (last.r.global != null && first.r.global != null) ? last.r.global - first.r.global : null;
  const up = [], down = [];
  fams.forEach((f) => { const a = first.r.dims[f.id], b = last.r.dims[f.id]; if (a == null || b == null) return; if (b - a >= .3) up.push(radarLabel(f)); if (a - b >= .3) down.push(radarLabel(f)); });
  const d2First = first.st.scores.d2, d2Last = last.st.scores.d2;
  const d2Alert = (d2First >= 1 && d2Last >= 1 && d2Last < d2First) ? '<div class="alert red"><strong>🚨 Signal d’alerte précoce</strong> : la dette d’apprentissage se dégrade (' + d2First + ' → ' + d2Last + '). Un établissement qui la mesure dispose d’un signal avant que les équipes ne décrochent : renforcez l’accompagnement maintenant.</div>' : '';
  const arrow = (a, b) => a == null || b == null ? '<span class="small">—</span>' : b - a >= .3 ? '<span style="color:#0F6E56;font-weight:800">↗ +' + (b - a).toFixed(1) + '</span>' : a - b >= .3 ? '<span style="color:#A32D2D;font-weight:800">↘ −' + (a - b).toFixed(1) + '</span>' : '<span style="color:#5A6880;font-weight:800">→ ' + (b - a >= 0 ? '+' : '') + (b - a).toFixed(1) + '</span>';
  return '<div class="panel">' + (names.length > 1 ? '<div class="alert amber">Les évaluations portent des noms différents (' + names.map(esc).join(', ') + ') : vérifiez qu’il s’agit bien du même projet.</div>' : '') +
    '<div class="banner"><small>Suivi dans le temps · ' + n + ' points</small><strong>' + esc(first.name) + ' : ' + fmt1(first.r.global) + ' → ' + fmt1(last.r.global) + (delta != null ? ' (' + (delta >= 0 ? '+' : '') + delta.toFixed(1) + ')' : '') + '</strong></div>' + spark + d2Alert +
    (up.length ? '<div class="alert green"><strong>En progression :</strong> ' + up.map(esc).join(', ') + '</div>' : '') + (down.length ? '<div class="alert amber"><strong>En dégradation :</strong> ' + down.map(esc).join(', ') + '</div>' : '') +
    '<div class="radar-wrap" style="margin-top:12px"><div class="radar-title">Radars superposés (du plus ancien au plus récent)</div>' + buildRadar(evs.map((e, i) => ({dims: e.r.dims, color: SERIES_COLORS[i % 6], opacity: .4 + .6 * i / Math.max(1, n - 1), fill: .05})), fams, 320) + legendHtml(evs.map((e) => ({label: fmtDate(e.dt)}))) + '</div>' +
    '<div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Dimension</th>' + evs.map((e) => '<th>' + esc(fmtDate(e.dt)) + '</th>').join('') + '<th>Évolution</th></tr></thead><tbody>' + fams.map((f) => '<tr><td><strong>' + f.emoji + ' ' + esc(radarLabel(f)) + '</strong></td>' + evs.map((e) => '<td style="font-weight:700;color:' + scoreColor(e.r.dims[f.id]) + '">' + (e.r.dims[f.id] == null ? 'n.é.' : fmt1(e.r.dims[f.id])) + '</td>').join('') + '<td>' + arrow(first.r.dims[f.id], last.r.dims[f.id]) + '</td></tr>').join('') + '</tbody></table></div><div class="actions-bar"><button class="btn btn-sm btn-secondary" onclick="window.print()">🖨 Imprimer</button></div></div>';
}

/* ============================================================
   Mes évaluations
   ============================================================ */
function renderLibrary() {
  const list = libAll(), el = $('libList'); if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="empty"><div class="big">🗂️</div>Aucune évaluation enregistrée sur cet appareil.<br>Les évaluations s’enregistrent automatiquement à l’affichage des résultats.<br><br><button class="btn btn-primary" onclick="startNewEval()">Commencer une évaluation</button></div>'; return; }
  el.innerHTML = list.map((it) => { const v = verdictInfo(it.global); return '<div class="lib-card"><div class="l-score" style="background:' + v.color + '">' + fmt1(it.global) + '<small>/5</small></div><div class="l-meta clickable" onclick="libOpen(\'' + it.id + '\')"><strong>' + esc(it.name) + '</strong><span>' + esc(it.dom || 'domaine non précisé') + '</span><span>' + esc(profileLabel(it.prof)) + ' · ' + esc(natureLabel(it.nat)) + ' · ' + esc(fmtDate(it.dt)) + '</span></div><div class="l-actions"><button title="Ouvrir" onclick="libOpen(\'' + it.id + '\')">📂</button><button title="Copier le lien" onclick="libCopy(\'' + it.id + '\')">🔗</button><button title="Dupliquer (nouveau point de suivi)" onclick="libDup(\'' + it.id + '\')">⧉</button><button title="Renommer" onclick="libRenamePrompt(\'' + it.id + '\')">✏️</button><button title="Supprimer" onclick="libDel(\'' + it.id + '\')">🗑</button></div></div>'; }).join('');
}
function libOpen(id) { const it = libGet(id); if (!it) return; loadSnapshot(it.snap); state.evalId = id; if (it.done) { state.rmDone = it.done.rm || {}; state.clDone = it.done.cl || {}; } state.step = 2; showScreen('eval'); }
function libCopy(id) { const it = libGet(id); if (!it) return; const u = location.href.split('?')[0].split('#')[0] + '?eval=' + encodeURIComponent(encodeSnap(it.snap)); copyText(u).then((ok) => toast(ok ? 'Lien copié' : 'Copie impossible')); }
function libDup(id) {
  const it = libGet(id); if (!it) return;
  loadSnapshot(it.snap); state.evalId = uid(); state.dt = todayISO(); state.step = 1; currentDim = 0;
  toast('Copie créée : réévaluez le projet (point de suivi daté d’aujourd’hui)');
  showScreen('eval');
}
function libRenamePrompt(id) { const it = libGet(id); if (!it) return; const n = prompt('Nouveau nom de l’évaluation :', it.name); if (n && n.trim()) { libRename(id, n.trim()); if (state.evalId === id) state.pn = n.trim(); renderLibrary(); } }
function libDel(id) { const it = libGet(id); if (!it) return; if (confirm('Supprimer « ' + it.name + ' » de cet appareil ? Le lien de sauvegarde, s’il a été copié, reste valable.')) { libDelete(id); if (state.evalId === id) state.evalId = null; renderLibrary(); } }
function libImportLink() {
  const l = prompt('Collez un lien (ou code) de sauvegarde :'); if (!l) return;
  try { const s = decodeSnap(l); if (!s.sc) throw 0; loadSnapshot(s); if (!state.evalId) state.evalId = uid(); state.step = 2; showScreen('eval'); toast('Évaluation importée'); } catch (e) { toast('Lien non reconnu'); }
}
function libExportAll() {
  const blob = new Blob([JSON.stringify({app: 'roi-ia', version: APP_VERSION, exported: new Date().toISOString(), evals: lsGet()}, null, 1)], {type: 'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'roi-ia-evaluations-' + todayISO() + '.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function libImportFile(input) {
  const f = input.files && input.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { const j = JSON.parse(rd.result); const arr = Array.isArray(j) ? j : (j.evals || []); const cur = lsGet(); let n = 0; arr.forEach((it) => { if (it && it.snap && it.snap.sc) { if (!it.id) it.id = uid(); const i = cur.findIndex((x) => x.id === it.id); if (i >= 0) cur[i] = it; else cur.push(it); n++; } }); lsSet(cur); updateLibBadge(); renderLibrary(); toast(n + ' évaluation(s) importée(s)'); } catch (e) { toast('Fichier non reconnu'); } };
  rd.readAsText(f); input.value = '';
}
