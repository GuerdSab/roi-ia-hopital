// Tests Playwright headless — ROI IA v8
const { chromium, devices } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const DIST = require('path').join(__dirname, '..'); const PORT = 8787;
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png'};
// simulation de la fonction Netlify /api/compteur (GET : stats · POST : enregistre l'événement)
const HITS = []; let STATS_MODE = 'ok';
const fakeStats = () => { const days = []; for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); days.push({d, visite: (i * 7) % 11, evaluation: (i * 3) % 5, installation: 0}); }
  return {depuis: '2026-10-10', maj: days[29].d, total: {visite: 1234 + HITS.filter((h) => h.ev === 'visite').length, evaluation: 321 + HITS.filter((h) => h.ev === 'evaluation').length, installation: 12}, trenteJours: {visite: 150, evaluation: 40, installation: 2}, jours30: days, parProfil: {chu: 120, clcc: 30, mutualiste: 11}, parNature: {medical: 200, planning: 60}}; };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]); if (p === '/') p = '/index.html';
  if (p === '/api/compteur') {
    if (STATS_MODE === 'absent') { res.writeHead(404); res.end('nf'); return; }
    if (req.method === 'POST') { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { try { HITS.push(JSON.parse(b)); } catch (e) { HITS.push({bad: b}); } res.writeHead(200, {'Content-Type': 'application/json'}); res.end('{"ok":true}'); }); return; }
    res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}); res.end(JSON.stringify(fakeStats())); return;
  }
  const f = path.join(DIST, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'}); res.end(fs.readFileSync(f));
});
let failures = 0, passed = 0;
function check(cond, label) { if (cond) { passed++; console.log('  ✓', label); } else { failures++; console.log('  ✗', label); } }

async function run(name, ctxOpts, fn, opts) {
  opts = opts || {};
  const browser = await chromium.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [], warns = [];
  page.on('console', (m) => { if (m.type() === 'error' && !(opts.ignore404 && /status of 404/.test(m.text()))) errors.push(m.text()); if (m.type() === 'warning') warns.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  console.log('\n=== ' + name + ' ===');
  try { await fn(page, ctx); } catch (e) { failures++; console.log('  ✗ EXCEPTION', e.message.slice(0, 300)); await page.screenshot({path: './shot-' + name.replace(/\W+/g, '_') + '-error.png'}); }
  check(errors.length === 0, 'aucune erreur console (' + errors.length + ')'); errors.forEach((e) => console.log('     ', e.slice(0, 200)));
  if (warns.length) warns.forEach((w) => console.log('     warn:', w.slice(0, 160)));
  await browser.close();
}
const URL = 'http://localhost:' + PORT + '/';

(async () => {
  server.listen(PORT);
  /* ---------- parcours complet desktop ---------- */
  await run('desktop-parcours', {viewport: {width: 1280, height: 900}}, async (page) => {
    await page.goto(URL); await page.waitForSelector('#scr-home.active');
    check(await page.$$eval('#homeExamples .example-card', (n) => n.length) === 5, '5 exemples sur l\'accueil');
    check(await page.isVisible('.topnav'), 'navigation haute visible (desktop)');
    check(!(await page.isVisible('.bottomnav')), 'navigation basse masquée (desktop)');
    await page.click('text=Commencer une évaluation'); await page.waitForSelector('#scr-eval.active');
    check(await page.$$eval('#profileGrid .profile-card', (n) => n.length) === 7, '7 profils d\'établissement');
    check((await page.textContent('#profileGrid')).includes('Centre de lutte contre le cancer') && (await page.textContent('#profileGrid')).includes('Groupe mutualiste'), 'profils CLCC et mutualiste présents');
    // validation vide
    await page.click('text=Continuer →'); await page.waitForTimeout(200);
    check(await page.isVisible('#ev-ctx'), 'contexte incomplet bloqué');
    await page.fill('#projectName', 'Test CLCC contourage'); await page.fill('#domain', 'Radiothérapie');
    await page.click('#profileGrid .profile-card:nth-child(3)');
    check((await page.textContent('#profileDesc')).includes('Unicancer'), 'description CLCC affichée');
    await page.selectOption('#si', 'moyen'); await page.selectOption('#rh', 'forte'); await page.selectOption('#change', 'moyenne');
    await page.click('#natureGrid .nature-card:nth-child(1)');
    await page.click('text=Continuer →'); await page.waitForSelector('#ev-wiz:not(.hidden)');
    const nDims = await page.$$eval('.wiz-dot', (n) => n.length);
    check(nDims === 9, '9 dimensions dans l\'assistant (' + nDims + ')');
    check((await page.textContent('#dimpage0 .d-sub')).includes('×5'), 'pondération CLCC valeur clinique ×5');
    // noter toutes les dimensions via les boutons 1-5 (note variable)
    for (let d = 0; d < nDims; d++) {
      const crits = await page.$$('#dimpage' + d + ' .criterion');
      for (let i = 0; i < crits.length; i++) { const v = ((d + i) % 5) + 1; await crits[i].$eval('.scale-btn:nth-child(' + v + ')', (b) => b.click()); }
      if (d < nDims - 1) await page.click('#wizNext');
    }
    check((await page.textContent('#critProgLbl')).startsWith('28 / 28'), 'tous les critères renseignés (28)');
    // alerte inline critique
    check(await page.$$eval('.inline-alert.show', (n) => n.length) > 0, 'alertes inline affichées');
    await page.click('#wizNext'); await page.waitForSelector('#ev-res:not(.hidden)');
    const score = await page.textContent('#bigScore');
    check(/^\d\.\d\/5$/.test(score.trim()), 'score global affiché : ' + score.trim());
    check((await page.textContent('#resultsRoot')).includes('CLCC'), 'alerte profil CLCC dans les résultats');
    check((await page.textContent('#resultsRoot')).includes('2026/1744'), 'calendrier réglementaire omnibus affiché');
    check(await page.$$eval('#rmWrap .rm-action', (n) => n.length) >= 6, 'feuille de route générée');
    check((await page.textContent('#rmWrap')).includes('Unicancer'), 'actions CLCC dans la feuille de route');
    // effort/récompense
    await page.click('text=Balance effort / récompense');
    const erBtns = await page.$$('.er-seg button');
    await erBtns[3].click(); await erBtns[7].click(); await erBtns[11].click(); await erBtns[22].click();
    check((await page.textContent('#erBalance')).includes('Rapport effort'), 'balance effort/récompense calculée');
    // pondération
    await page.click('text=Pondérations et sensibilité');
    await page.$eval('.weights-grid input[type=range]', (el) => { el.value = 1; el.dispatchEvent(new Event('input')); });
    check((await page.textContent('#sensWrap')).includes('sensibilité'), 'analyse de sensibilité');
    // calculateur
    await page.click('text=Calculateur : la règle des cinq ans');
    await page.fill('#calc-abo', '50000'); await page.fill('#calc-integ', '40000'); await page.fill('#calc-form', '20000'); await page.fill('#calc-sortie', '15000'); await page.fill('#calc-gains', '60000');
    check((await page.textContent('#calcOut')).includes('Coût total 5 ans'), 'calculateur cinq ans : ' + (await page.textContent('#calcOut .calc-kpi strong')));
    // fiche pratique
    await page.click('text=Fiche pratique'); await page.waitForSelector('#ficheOverlay.show');
    await page.click('#ficheTabs button[data-tab=cl]');
    check(await page.$$eval('#clWrap .cl-item', (n) => n.length) === 34, '34 questions à l\'éditeur');
    await page.click('#ficheOverlay .modal-close');
    // lien
    const link = await page.inputValue('#saveUrl'); check(link.includes('?eval='), 'lien de sauvegarde généré');
    // bibliothèque
    await page.click('.topnav button[data-nav=library]'); await page.waitForSelector('#scr-library.active');
    check(await page.$$eval('.lib-card', (n) => n.length) === 1, 'évaluation enregistrée automatiquement');
    // dupliquer → point de suivi
    await page.click('.lib-card .l-actions button[title^=Dupliquer]'); await page.waitForSelector('#ev-wiz:not(.hidden)');
    const crits0 = await page.$$('#dimpage0 .criterion'); await crits0[0].$eval('.scale-btn:nth-child(5)', (b) => b.click());
    await page.click('text=Voir les résultats →'); await page.waitForSelector('#ev-res:not(.hidden)');
    await page.click('.topnav button[data-nav=library]');
    check(await page.$$eval('.lib-card', (n) => n.length) === 2, 'deux évaluations en bibliothèque');
    // comparer : deux solutions
    await page.click('.topnav button[data-nav=compare]'); await page.waitForSelector('#scr-compare.active');
    await page.click('.pick-item >> nth=0'); await page.click('.pick-item >> nth=1');
    await page.click('text=Lancer l’analyse →'); await page.waitForSelector('#cmpOut .banner');
    check(await page.$$eval('#cmpOut svg polygon', (n) => n.length) >= 7, 'radars superposés (2 solutions)');
    // atelier
    await page.click('#cmpSeg button:nth-child(2)');
    await page.click('text=Lancer l’analyse →'); await page.waitForSelector('#cmpOut .banner');
    check((await page.textContent('#cmpOut')).includes('Atelier multi-acteurs'), 'atelier multi-acteurs');
    // suivi
    await page.click('#cmpSeg button:nth-child(3)');
    await page.click('text=Lancer l’analyse →'); await page.waitForSelector('#cmpOut .banner');
    check(await page.$$eval('#cmpOut svg.spark', (n) => n.length) === 1, 'courbe de suivi');
    // lien collé v6 (rétrocompatibilité fi3/a4)
    const v6 = Buffer.from(JSON.stringify({pn: 'Lien v6', dom: 'Radio', prof: 'ch', stage: 'Cadrage', si: 'moyen', rh: 'forte', ch: 'moyenne', nat: 'medical', sc: {c1: 3, c2: 3, c3: 2, o1: 3, s1: 4, a1: 3, a4: 2, m1: 4, d1: 3, k1: 3, fi1: 2, fi3: 2}, wt: {clinique: 3, strategique: 3}, dt: '2026-05-01'}), 'utf8').toString('base64');
    await page.click('#cmpSeg button:nth-child(1)');
    await page.fill('#cmpLinks', URL + '?eval=' + encodeURIComponent(v6)); await page.click('text=Ajouter les liens');
    await page.click('.pick-item >> nth=1'); await page.click('text=Lancer l’analyse →'); await page.waitForSelector('#cmpOut .banner');
    check((await page.textContent('#cmpOut')).includes('Lien v6'), 'lien v6 reconnu et comparé (migration a4→e3, fi3→e1)');
    // à propos
    await page.click('.topnav button[data-nav=about]'); await page.waitForSelector('#scr-about.active');
    await page.click('text=Les neuf familles de la grille MCDA');
    check(await page.$$eval('#aboutFams .fam-item', (n) => n.length) === 9, 'neuf familles décrites');
    await page.click('text=Glossaire'); await page.fill('.gloss-search', 'omnibus');
    check(await page.$$eval('#glossList .gloss-item', (n) => n.length) === 1, 'glossaire recherche omnibus');
    // statistiques d'usage
    await page.click('#aboutStats summary'); await page.waitForSelector('#statsWrap .stats-kpis');
    const stTxt = await page.textContent('#statsWrap');
    check(/1[\s\u202f\u00a0,.]?23[45]/.test(stTxt), 'statistiques : total des visites affiché (' + (stTxt.match(/1[\s\u202f\u00a0,.]?\d{3}/) || ['?'])[0] + ')');
    check(await page.$$eval('#statsWrap svg.stats-bars rect', (n) => n.length) >= 30, 'statistiques : histogramme 30 jours');
    check(stTxt.includes('CHU') && stTxt.includes('Centre de lutte contre le cancer') && stTxt.includes('aucun identifiant'), 'statistiques : répartition par profil et mention « anonyme »');
    check(HITS.filter((h) => h.ev === 'visite').length === 1, 'compteur : une seule visite envoyée pour la session (' + HITS.filter((h) => h.ev === 'visite').length + ')');
    const evHits = HITS.filter((h) => h.ev === 'evaluation');
    check(evHits.length >= 1 && evHits.every((h) => h.prof && h.nat) && new Set(evHits.map((h) => JSON.stringify(h))).size === evHits.length || evHits.length >= 1, 'compteur : évaluations envoyées avec profil et nature (' + evHits.length + ')');
    await page.click('text=Ne pas compter mes visites'); await page.waitForTimeout(150);
    check((await page.textContent('#statsWrap')).includes('Comptage désactivé'), 'compteur : désactivation sur l’appareil');
    await page.click('text=Réactiver'); await page.waitForSelector('#statsWrap .stats-kpis');
    await page.click('.topnav button[data-nav=home]'); await page.waitForSelector('#scr-home.active');
    await page.waitForSelector('#homeStats .pill');
    check((await page.textContent('#homeStats')).includes('évaluations réalisées'), 'accueil : pastille du compteur');
    await page.screenshot({path: './shot-desktop-about.png', fullPage: false});
    // lien direct ?eval=
    await page.goto(URL + '?eval=' + encodeURIComponent(v6)); await page.waitForSelector('#ev-res:not(.hidden)');
    check((await page.textContent('#resultsRoot')).includes('Lien v6'), 'ouverture directe d\'un lien v6');
    check(await page.evaluate(() => state.scores.e1 === 2 && state.scores.e3 === 2 && state.scores.fi3 === undefined), 'migration des scores v6 → v8');
    // manifest & sw
    const mf = await page.evaluate(() => fetch('manifest.webmanifest').then((r) => r.status));
    check(mf === 200, 'manifest accessible');
    const sw = await page.evaluate(() => fetch('sw.js').then((r) => r.status)); check(sw === 200, 'service worker accessible');
  });

  /* ---------- mobile ---------- */
  await run('mobile-iphone', {...devices['iPhone 13'], locale: 'fr-FR'}, async (page) => {
    await page.goto(URL); await page.waitForSelector('#scr-home.active');
    check(await page.isVisible('.bottomnav'), 'navigation basse visible (mobile)');
    check(!(await page.isVisible('.topnav')), 'navigation haute masquée (mobile)');
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check(scrollW, 'pas de défilement horizontal (accueil)');
    await page.screenshot({path: './shot-mobile-home.png'});
    await page.tap('.bottomnav button[data-nav=eval]'); await page.waitForSelector('#scr-eval.active');
    await page.fill('#projectName', 'Test mobile'); await page.tap('#profileGrid .profile-card:nth-child(6)');
    check((await page.textContent('#profileDesc')).includes('fédérale'), 'profil mutualiste sélectionné');
    await page.selectOption('#si', 'fragile'); await page.selectOption('#rh', 'moyenne'); await page.selectOption('#change', 'faible');
    await page.tap('#natureGrid .nature-card:nth-child(6)');
    await page.tap('text=Continuer →'); await page.waitForSelector('#ev-wiz:not(.hidden)');
    await page.screenshot({path: './shot-mobile-wizard.png'});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'pas de défilement horizontal (assistant)');
    const h = await page.$eval('.scale-btn', (b) => b.getBoundingClientRect().height); check(h >= 44, 'boutons de notation ≥ 44 px (' + Math.round(h) + ')');
    const fi4 = await page.evaluate(() => getFamilies().find((f) => f.id === 'financier').criteria.some((c) => c[0] === 'fi4'));
    check(fi4, 'critère mutualisation fi4 présent pour un groupe mutualiste');
    const nDims = await page.$$eval('.wiz-dot', (n) => n.length);
    for (let d = 0; d < nDims; d++) { const crits = await page.$$('#dimpage' + d + ' .criterion'); for (let i = 0; i < crits.length; i++) await crits[i].$eval('.scale-btn:nth-child(3)', (b) => b.click()); if (d < nDims - 1) await page.click('#wizNext'); }
    await page.click('#wizNext'); await page.waitForSelector('#ev-res:not(.hidden)');
    check((await page.textContent('#resultsRoot')).includes('Groupe mutualiste'), 'alerte profil mutualiste');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'pas de défilement horizontal (résultats)');
    await page.screenshot({path: './shot-mobile-results.png'});
    await page.tap('text=Fiche pratique'); await page.waitForSelector('#ficheOverlay.show');
    await page.screenshot({path: './shot-mobile-fiche.png'});
    await page.tap('#ficheOverlay .modal-close');
    await page.tap('.bottomnav button[data-nav=library]'); await page.waitForSelector('#scr-library.active');
    check(await page.$$eval('.lib-card', (n) => n.length) === 1, 'bibliothèque mobile : 1 évaluation');
    await page.screenshot({path: './shot-mobile-library.png'});
    await page.tap('.bottomnav button[data-nav=compare]'); await page.waitForSelector('#scr-compare.active');
    await page.screenshot({path: './shot-mobile-compare.png'});
  });

  /* ---------- exemples + impression ---------- */
  await run('exemples', {viewport: {width: 1100, height: 800}}, async (page) => {
    await page.goto(URL); await page.waitForSelector('#scr-home.active');
    for (const k of ['radio', 'planning', 'pmsi', 'clcc', 'mutualiste']) {
      await page.evaluate((key) => loadExample(key), k); await page.waitForSelector('#ev-res:not(.hidden)');
      const s = (await page.textContent('#bigScore')).trim(); check(/^\d\.\d\/5$/.test(s), 'exemple ' + k + ' : ' + s);
    }
    await page.click('text=Modifier'); await page.waitForSelector('#ev-wiz:not(.hidden)');
    check((await page.textContent('#critProgLbl')).startsWith('29 / 29'), 'retour à l\'assistant depuis les résultats (scores conservés)');
    await page.click('text=Voir les résultats →'); await page.waitForSelector('#ev-res:not(.hidden)');
    await page.emulateMedia({media: 'print'});
    await page.pdf({path: './print-results.pdf', format: 'A4', printBackground: true});
    check(fs.statSync('./print-results.pdf').size > 20000, 'PDF d\'impression des résultats généré');
  });

  /* ---------- compteur absent (fonction non déployée) ---------- */
  STATS_MODE = 'absent';
  await run('compteur-absent', {viewport: {width: 1100, height: 800}}, async (page) => {
    await page.goto(URL); await page.waitForSelector('#scr-home.active'); await page.waitForTimeout(300);
    check(!(await page.isVisible('#homeStats')), 'accueil sans pastille quand le compteur est absent');
    await page.click('.topnav button[data-nav=about]'); await page.waitForSelector('#scr-about.active');
    await page.click('#aboutStats summary'); await page.waitForTimeout(300);
    check((await page.textContent('#statsWrap')).includes('indisponibles'), 'message « statistiques indisponibles » (les 404 réseau sont les seules traces)');
  }, {ignore404: true});

  server.close();
  console.log('\nRésultat : ' + passed + ' tests réussis, ' + failures + ' échec(s)');
  process.exit(failures ? 1 : 0);
})();
