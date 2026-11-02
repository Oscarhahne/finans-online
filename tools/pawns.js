// Ritar pjäserna i 3D och sparar dem i public/pawns. Kör: node tools/pawns.js (kräver playwright).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, '..', 'public', 'pawns');
const COLORS = ['#ff1744', '#2979ff', '#ffea00', '#ffffff', '#d500f9', '#ff6d00'];
const render = ([shape, hex]) => {
const smin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25};
const disc=(r,y,rad,y0,y1,c=.04)=>{const dx=r-rad+c,dy=Math.abs(y-(y0+y1)/2)-(y1-y0)/2+c;return Math.min(Math.max(dx,dy),0)+Math.hypot(Math.max(dx,0),Math.max(dy,0))-c};
const cy=(x,y,z,rad,y0,y1,c)=>disc(Math.hypot(x,z),y,rad,y0,y1,c);
const box=(x,y,z,cx,cy_,cz,a,b,d,c=.04)=>{const q=[Math.abs(x-cx)-a+c,Math.abs(y-cy_)-b+c,Math.abs(z-cz)-d+c];return Math.min(Math.max(...q),0)+Math.hypot(Math.max(q[0],0),Math.max(q[1],0),Math.max(q[2],0))-c};
const sph=(x,y,z,cx,c_,cz,r)=>Math.hypot(x-cx,y-c_,z-cz)-r;
const ell=(x,y,z,cx,c_,cz,a,b,d)=>{const k0=Math.hypot((x-cx)/a,(y-c_)/b,(z-cz)/d),k1=Math.hypot((x-cx)/a/a,(y-c_)/b/b,(z-cz)/d/d);return k1<1e-6?-.1:k0*(k0-1)/k1};
const base=(x,y,z)=>smin(cy(x,y,z,1,0,.22,.08),cy(x,y,z,.82,.2,.32,.05),.05);
const SHAPES = [
  (x,y,z)=>{let d=base(x,y,z);d=Math.min(d,box(x,y,z,0,1.05,0,.95,.72,.34,.1));d=Math.min(d,box(x,y,z,0,1.05,.34,.96,.04,.02,.01));d=Math.min(d,box(x,y,z,0,1.08,.37,.17,.14,.05,.03));const hx=Math.abs(x),a=Math.hypot(Math.max(hx-.25,0),Math.max(y-1.97,0)-0)-.2;const h=Math.hypot(Math.max(Math.abs(Math.hypot(Math.max(hx-.25,0),y-1.78)-.28),0),z)-.07;return Math.min(d,y>1.74?h:9)},
  (x,y,z)=>{let d=base(x,y,z);[[0,0],[.06,-.04],[-.05,.05],[.07,.03],[-.04,-.05],[.04,.06],[-.07,0]].forEach(([a,b],i)=>{const y0=.34+i*.26;d=Math.min(d,cy(x-a,y,z-b,.62,y0,y0+.23,.05))});return Math.min(d,Math.max(Math.hypot(x,y-2.45)-.5,Math.abs(z)-.09)-.02)},
  (x,y,z)=>{let d=base(x,y,z);d=Math.min(d,box(x,y,z,0,.9,0,.62,.62,.62));d=Math.min(d,box(x,y,z,0,1.85,0,.46,.5,.46));d=Math.min(d,box(x,y,z,0,2.5,0,.27,.2,.27));d=Math.min(d,cy(x,y,z,.05,2.6,3.05,.02));const win=Math.max(Math.abs(((y+.08)%.24+.24)%.24-.12)-.045,-9);return d+(y>.4&&y<2.3&&win<0?.012:0)},
  (x,y,z)=>{let d=base(x,y,z);d=Math.min(d,ell(x,y,z,-.08,1.15,0,.82,.68,.64));d=smin(d,ell(x,y,z,.62,1.42,0,.42,.42,.42),.12);const sr=Math.hypot(y-1.36,z);d=smin(d,disc(sr,x,.2,.92,1.14,.05),.04);[[-.45,.3],[-.45,-.3],[.35,.3],[.35,-.3]].forEach(([a,b])=>{d=smin(d,cy(x-a,y,z-b,.16,.3,.75,.05),.04)});[.25,-.25].forEach(b=>{d=smin(d,ell(x,y,z,.58,1.86,b,.13,.17,.09),.04)});d=Math.min(d,box(x,y,z,-.1,1.8,0,.2,.025,.05,.01)+(.0));return Math.min(d,sph(x,y,z,.92,1.56,.2,.045),sph(x,y,z,.92,1.56,-.2,.045))},
  (x,y,z)=>{let d=base(x,y,z);d=Math.min(d,box(x,y,z,0,.85,0,1,.28,.52,.14));d=smin(d,box(x,y,z,-.08,1.3,0,.56,.28,.46,.16),.05);[[-.6,.52],[-.6,-.52],[.6,.52],[.6,-.52]].forEach(([a,b])=>{const dx=Math.hypot(x-a,y-.58)-.25;d=Math.min(d,Math.max(dx,Math.abs(z-b)-.09)-.015)});return d},
  (x,y,z)=>{let d=base(x,y,z);const n=8,a=Math.atan2(z,x),s=2*Math.PI/n,fa=Math.abs(((a%s)+s)%s-s/2),r=Math.hypot(x,z)*Math.cos(fa);const top=Math.max((r+(y-2.1)*.8-.56)*.78,(r-(y-.42)*.72)*.81);const dia=Math.max(top,y-2.12,.42-y);d=smin(d,cy(x,y,z,.25,.28,.6,.03),.05);return Math.min(d,dia)},
];
const f = SHAPES[shape]; const W = 264, H = 372, E = 0.42, ce = Math.cos(E), se = Math.sin(E), Az = 0.55, ca = Math.cos(Az), sa = Math.sin(Az);
const A = [1, 3, 5].map((k) => Math.pow(parseInt(hex.slice(k, k + 2), 16) / 255, 2.2));
const big = document.createElement('canvas'); big.width = W; big.height = H; const g = big.getContext('2d'), im = g.createImageData(W, H);
const sdf = (x, y, z) => f(x * ca - z * sa, y, x * sa + z * ca); const nm = (a, b, d) => { const l = Math.hypot(a, b, d); return [a / l, b / l, d / l]; };
const key = nm(-0.55, 0.85, 0.65), fill = nm(0.8, 0.15, 0.45), view = [0, se, ce], half = nm(key[0] + view[0], key[1] + view[1], key[2] + view[2]);
for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
  const u = (px + 0.5) / W * 2.44 - 1.22, v = 2.95 - (py + 0.5) / H * 3.44; const oy = v * ce + 6 * se, oz = -v * se + 6 * ce; let t = 3, hit = false;
  for (let i = 0; i < 90 && t < 9.5; i++) { const d = sdf(u, oy - se * t, oz - ce * t); if (d < 0.002) { hit = true; break; } t += d * 0.9; }
  if (!hit) continue;
  const x = u, y = oy - se * t, z = oz - ce * t, e = 0.005; const n = nm(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e));
  let ao = 1; for (let k = 1; k <= 4; k++) { const q = 0.09 * k; ao -= Math.max(q - sdf(x + n[0] * q, y + n[1] * q, z + n[2] * q), 0) * 0.85 / k; } ao = Math.max(ao, 0.2);
  const dot = (l) => n[0] * l[0] + n[1] * l[1] + n[2] * l[2]; const nv = Math.max(dot(view), 0), sp = Math.pow(Math.max(dot(half), 0), 90) * 1.2 + Math.pow(Math.max(dot(half), 0), 14) * 0.12, edge = 1 - Math.pow(1 - nv, 5) * 0.75, light = (Math.max(dot(key), 0) * 1.05 + Math.max(dot(fill), 0) * 0.22 + (0.5 + 0.5 * n[1]) * 0.32) * ao;
  const q = (py * W + px) * 4; for (let k = 0; k < 3; k++) im.data[q + k] = 255 * Math.pow(Math.min((A[k] * light + sp * ao + Math.pow(1 - nv, 3) * 0.14 * (0.5 + 0.5 * n[1])) * edge, 1), 1 / 2.2); im.data[q + 3] = 255;
}
g.putImageData(im, 0, 0);
const out = document.createElement('canvas'); out.width = W / 2; out.height = H / 2; const o = out.getContext('2d');
const grad = o.createRadialGradient(0, 0, 0, 0, 0, 1); grad.addColorStop(0, 'rgba(0,0,0,.6)'); grad.addColorStop(0.7, 'rgba(0,0,0,.35)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
o.save(); o.translate(W / 4 + 6, H / 2 - 22); o.scale(60, 22); o.fillStyle = grad; o.beginPath(); o.arc(0, 0, 1, 0, 7); o.fill(); o.restore();
o.imageSmoothingQuality = 'high'; o.drawImage(big, 0, 0, W / 2, H / 2);
return out.toDataURL('image/png');
};
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); const b = await chromium.launch(); const p = await b.newPage();
  for (let s = 0; s < 6; s++) for (let c = 0; c < 6; c++) {
    const url = await p.evaluate(render, [s, COLORS[c]]);
    fs.writeFileSync(path.join(OUT, `${s}-${c}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close();
})();
