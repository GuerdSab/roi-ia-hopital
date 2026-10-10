#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Assemble dist/ : index.html (CSS, données et JS inclus), sw.js, manifest, icônes."""
import json, base64, io, os, re, shutil, subprocess
from PIL import Image

import pathlib
B = str(pathlib.Path(__file__).parent); DIST = str(pathlib.Path(__file__).parent.parent)
os.makedirs(DIST + '/icons', exist_ok=True)

data = json.load(open(B + '/app-data.json', encoding='utf-8'))
css = open(B + '/app.css', encoding='utf-8').read()
js_parts = sorted(f for f in os.listdir(B + '/js') if f.endswith('.js'))
js = '\n\n'.join(open(B + '/js/' + f, encoding='utf-8').read() for f in js_parts)

# vérification syntaxique du JS assemblé
open(B + '/app.bundle.js', 'w', encoding='utf-8').write(js)
r = subprocess.run(['node', '--check', B + '/app.bundle.js'], capture_output=True, text=True)
if r.returncode != 0:
    print(r.stderr); raise SystemExit('JS invalide')

# logo CHU (base64, fond blanc d'origine)
logo_png = open(B + '/Logo_CHU_Angers.png', 'rb').read()
logo_b64 = base64.b64encode(logo_png).decode()

# icônes : logo blanc sur fond navy, coins doux
img = Image.open(io.BytesIO(logo_png)).convert('RGBA')
def make_icon(size, pad_ratio=0.17):
    pad = int(size * pad_ratio)
    icon = Image.new('RGBA', (size, size), (27, 58, 107, 255))
    lg = img.copy(); lg.thumbnail((size - 2 * pad, size - 2 * pad), Image.LANCZOS)
    a = lg.split()[3]
    white = Image.new('RGBA', lg.size, (255, 255, 255, 255))
    lw = Image.composite(white, Image.new('RGBA', lg.size, (0, 0, 0, 0)), a)
    icon.paste(lw, ((size - lw.width) // 2, (size - lw.height) // 2), lw)
    return icon
for s in (32, 180, 192, 512):
    make_icon(s).save(f'{DIST}/icons/icon-{s}.png', optimize=True)
# icône maskable (marge plus large)
make_icon(512, 0.26).save(f'{DIST}/icons/icon-512-maskable.png', optimize=True)

# manifest
manifest = {
    "name": "ROI IA Hospitalière", "short_name": "ROI IA",
    "description": "Évaluation multicritère (MCDA) des projets d'IA hospitalière — CHU Angers",
    "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait-primary",
    "background_color": "#1B3A6B", "theme_color": "#1B3A6B", "lang": "fr", "categories": ["medical", "productivity"],
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
    "shortcuts": [
        {"name": "Nouvelle évaluation", "url": "./#eval", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]},
        {"name": "Mes évaluations", "url": "./#library", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]},
    ],
}
json.dump(manifest, open(DIST + '/manifest.webmanifest', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# service worker : cache de l'app shell (cache-first) + mise à jour en arrière-plan
sw = """// Service worker — ROI IA Hospitalière v%s
const CACHE = 'roi-ia-v%s';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-32.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return; // compteur et fonctions : réseau uniquement, jamais en cache
  if (url.pathname.endsWith('benchmark.json')) { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); return; }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then((cached) => {
    const net = fetch(e.request).then((res) => { if (res && res.status === 200) { const cl = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cl)); } return res; }).catch(() => cached);
    return cached || net;
  }));
});
""" % (data['version'], data['version'].replace('.', '-'))
open(DIST + '/sw.js', 'w', encoding='utf-8').write(sw)

# benchmark exemple + en-têtes Netlify
json.dump({"n": 0, "date": "2026-10", "comment": "Renommer en benchmark.json une fois n >= 5. Percentiles p25/p50/p75 du score global et par dimension.",
           "global": {"p25": 2.8, "p50": 3.3, "p75": 3.8},
           "dims": {k: {"p25": 2.7, "p50": 3.2, "p75": 3.8} for k in ["clinique", "operationnel", "strategique", "acceptabilite", "marche", "dettes", "cadre", "financier", "environnement"]}},
          open(DIST + '/benchmark.example.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump({'n': 0, 'date': '2026-10', 'global': {}, 'dims': {}}, open(DIST + '/benchmark.json', 'w'))
open(DIST + '/_headers', 'w').write("/sw.js\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Content-Type: application/manifest+json\n/*\n  X-Content-Type-Options: nosniff\n")

# index.html
html = open(B + '/index.template.html', encoding='utf-8').read()
html = html.replace('/*__CSS__*/', css).replace('/*__LOGO__*/', 'data:image/png;base64,' + logo_b64)
html = html.replace('/*__DATA__*/', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
html = html.replace('/*__JS__*/', js.replace('</script', '<\\/script'))
open(DIST + '/index.html', 'w', encoding='utf-8').write(html)

# version autonome (sans service worker ni fichiers externes) pour ouverture locale / envoi par mail
alone = html.replace('<link rel="manifest" href="manifest.webmanifest">', '')
alone = re.sub(r'<link rel="(?:icon|apple-touch-icon)"[^>]*>\n?', '', alone)
alone = alone.replace('src="icons/icon-192.png"', 'src="data:image/png;base64,' + base64.b64encode(open(DIST + '/icons/icon-192.png', 'rb').read()).decode() + '"')
open(DIST + '/ROI_IA_autonome.html', 'w', encoding='utf-8').write(alone)

# fonction Netlify « compteur » : bundle esbuild (si esbuild est disponible), sinon le bundle versionné est conservé
fn_src = B + '/functions/compteur.mjs'; fn_out = DIST + '/netlify/functions/compteur.mjs'
esb = shutil.which('esbuild') or next((p for p in ['/opt/npm-tools/node_modules/.bin/esbuild', B + '/node_modules/.bin/esbuild'] if os.path.exists(p)), None)
if esb and os.path.exists(fn_src):
    os.makedirs(os.path.dirname(fn_out), exist_ok=True)
    r = subprocess.run([esb, fn_src, '--bundle', '--platform=node', '--format=esm', '--target=node20', '--legal-comments=none', '--outfile=' + fn_out], capture_output=True, text=True)
    print('fonction compteur :', 'bundlée' if r.returncode == 0 else 'ERREUR ' + r.stderr[:300])
else:
    print('fonction compteur : esbuild absent, bundle existant conservé')

print('dist/index.html :', len(html.splitlines()), 'lignes,', len(html.encode()) // 1024, 'Ko')
print('fichiers dist :', sorted(os.listdir(DIST)), sorted(os.listdir(DIST + '/icons')))
