// Ritar gubbarna i 3D och sparar dem som bilder i public/pawns. Kör: node tools/pawns.js (kräver playwright).
// Bilderna används i lobbyn, spelarlistan, startmenyn och på det enkla brädet.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, '..', 'public', 'pawns');
const COLORS = ['#ff1744', '#2979ff', '#ffea00', '#ffffff', '#d500f9', '#00e676'];
const THREE_JS = process.env.THREE_JS; // Sökväg till three.min.js r128. Utan den hämtas biblioteket från jsDelivr.
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 396, height: 558 } })).newPage();
  await p.setContent('<!doctype html><body style="margin:0;background:transparent"><canvas id="c" width="396" height="558"></canvas></body>');
  if (THREE_JS) await p.addScriptTag({ content: fs.readFileSync(THREE_JS, 'utf8') }); else await p.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js' });
  await p.addScriptTag({ path: path.join(__dirname, '..', 'public', 'gubbar.js') });
  await p.evaluate(() => { const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setClearColor(0, 0); r.outputEncoding = THREE.sRGBEncoding; window.draw = (kind, hex) => { const s = new THREE.Scene(); s.add(new THREE.HemisphereLight('#ffffff', '#6f8f80', 1.05)); const sun = new THREE.DirectionalLight('#fff4dd', 1.25); sun.position.set(-3, 7, 6); s.add(sun); const g = makeGubbe(kind, hex); g.rotation.y = -1.0; s.add(g); const cam = new THREE.PerspectiveCamera(20, 396 / 558, 0.1, 30); cam.position.set(0, 0.74, 2.82); cam.lookAt(0, 0.46, 0); r.render(s, cam); const o = document.createElement('canvas'); o.width = 132; o.height = 186; const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(document.getElementById('c'), 0, 0, 132, 186); return o.toDataURL('image/png'); }; });
  for (let kind = 0; kind < 6; kind++) for (let c = 0; c < 6; c++) { const url = await p.evaluate(([k, h]) => draw(k, h), [kind, COLORS[c]]); fs.writeFileSync(path.join(OUT, `${kind}-${c}.png`), Buffer.from(url.split(',')[1], 'base64')); }
  await b.close(); console.log('Klart: 36 bilder i public/pawns.');
})().catch((e) => { console.error(e); process.exit(1); });
