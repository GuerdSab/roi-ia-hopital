// Test de la fonction compteur : logique pure + appel de bout en bout contre un faux serveur Blobs local.
import http from 'node:http';
import handler, { applyEvent, fresh, publicView } from '../../netlify/functions/compteur.mjs';

let ok = 0, ko = 0;
const check = (c, l) => { if (c) { ok++; console.log('  ✓', l); } else { ko++; console.log('  ✗', l); } };

// --- logique pure
const s = fresh('2026-10-10');
check(applyEvent(s, 'visite', {}, '2026-10-10') && s.total.visite === 1, 'visite comptée');
check(!applyEvent(s, 'piratage', {}, '2026-10-10'), 'événement inconnu refusé');
applyEvent(s, 'evaluation', { prof: 'chu', nat: 'medical' }, '2026-10-10');
applyEvent(s, 'evaluation', { prof: 'CHU<script>', nat: 'medical' }, '2026-10-11');
check(s.total.evaluation === 2 && s.parProfil.chu === 1 && Object.keys(s.parProfil).length === 1 && s.parNature.medical === 2, 'répartitions filtrées (identifiants sûrs uniquement)');
const v = publicView(s, '2026-10-11');
check(v.jours30.length === 30 && v.jours30[29].d === '2026-10-11' && v.jours30[28].evaluation === 1, 'série de 30 jours avec jours vides');
check(v.trenteJours.evaluation === 2 && v.depuis === '2026-10-10' && v.maj === '2026-10-11', 'totaux 30 jours et dates');
for (let i = 0; i < 450; i++) applyEvent(s, 'visite', {}, new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10));
check(Object.keys(s.jours).length <= 400, 'historique borné à 400 jours');

// --- faux serveur Blobs : GET/PUT sur /<site>/<store>/<key>
const blobs = {};
const srv = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const key = req.url.split('?')[0];
    if (req.method === 'GET') { if (blobs[key] == null) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(blobs[key]); return; }
    if (req.method === 'PUT') { blobs[key] = Buffer.concat(chunks).toString(); res.writeHead(200); res.end(); return; }
    res.writeHead(405); res.end();
  });
});
await new Promise((r) => srv.listen(0, r));
const base = 'http://127.0.0.1:' + srv.address().port;
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ edgeURL: base, uncachedEdgeURL: base, siteID: 'site-test', token: 'tok' })).toString('base64');

const call = (method, body) => handler(new Request('http://x/api/compteur', { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }));
let r = await call('GET'); let j = await r.json();
check(r.status === 200 && j.total.visite === 0 && j.jours30.length === 30, 'GET initial : stats vides');
r = await call('POST', { ev: 'visite' }); j = await r.json();
check(r.status === 200 && j.ok && j.total.visite === 1, 'POST visite');
r = await call('POST', { ev: 'evaluation', prof: 'clcc', nat: 'medical' });
r = await call('POST', { ev: 'installation' });
r = await call('POST', { ev: 'autre' }); check(r.status === 400, 'POST événement inconnu → 400');
r = await call('POST', 'pas du json'); check(r.status === 400, 'POST corps invalide → 400');
r = await call('GET'); j = await r.json();
check(j.total.visite === 1 && j.total.evaluation === 1 && j.total.installation === 1 && j.parProfil.clcc === 1 && j.trenteJours.evaluation === 1, 'GET après événements : totaux cohérents');
console.log("  clés blob :", Object.keys(blobs).join(", ")); check(Object.keys(blobs).some((k) => /site-test.*compteur.*stats/.test(k)), "blob écrit dans le store « compteur », clé « stats »");
r = await call('DELETE'); check(r.status === 405, 'DELETE → 405');
srv.close();
console.log('\n' + ok + ' réussis, ' + ko + ' échoués');
process.exit(ko ? 1 : 0);
