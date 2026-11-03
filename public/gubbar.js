// Spelpjäserna: sex gubbar i leksaksstil. Framsidan är +x och fötterna står på y = 0.
// Ben och armar sitter i egna leder, så att gubbarna kan gå, springa, sitta i bil och hänga i fallskärm.
(function () {
  window.GUBBE_NAMES = ['Direktören', 'Mäklaren', 'Byggherren', 'Bankchefen', 'Industrimagnaten', 'Investeraren'];
  window.makeGubbe = function (kind, color) {
    const T = THREE, g = new T.Group();
    const lin = (c) => new T.Color(c).convertSRGBToLinear();
    const M = (c, o = {}) => new T.MeshStandardMaterial({ roughness: 0.55, metalness: 0.03, ...o, color: lin(c), ...(o.emissive ? { emissive: lin(o.emissive) } : {}) });
    const add = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
    const box = (a, b, c) => new T.BoxGeometry(a, b, c), cyl = (a, b, h, s = 24) => new T.CylinderGeometry(a, b, h, s), ball = (r) => new T.SphereGeometry(r, 40, 30);
    const body = M(color, { roughness: 0.42 }), gold = M('#f4c542', { metalness: 0.85, roughness: 0.3 }), dark = M('#191c24'), white = M('#f7f7f2');
    const skin = M(['#f0c29b', '#e6b38a', '#c98d5f', '#f3cba8', '#efc09a', '#8d5a3a'][kind]), hairC = ['#2b2118', '#6b4423', '#3a2a1c', '#b5763a', '#8a8d93', '#14100d'][kind], hair = M(hairC, { roughness: 0.8 });
    const y0 = 0.015, pants = kind === 2 ? M('#39475f') : kind === 5 ? M('#2d3a55') : kind === 1 ? M('#2a2f3b') : body;
    // Benen: en led i höften, så att de svänger runt den.
    const legs = [0.075, -0.075].map((z) => { const j = new T.Group(); j.position.set(0, y0 + 0.185, z); add(j, cyl(0.058, 0.062, 0.17, 16), pants, 0, -0.085, 0); const sh = add(j, ball(0.072), kind === 2 ? M('#5b3b1f') : dark, 0.03, -0.155, 0); sh.scale.set(1.35, 0.6, 1); g.add(j); return j; });
    const t = add(g, cyl(0.125, 0.155, 0.27, 26), body, 0, y0 + 0.305, 0); t.scale.z = 1.08;
    const armM = kind === 1 ? white : body, arms = [];
    // amp anger hur mycket armen svänger vid gång. En arm som håller något svänger mindre.
    const arm = (side, rz, amp, rx = 0) => { const j = new T.Group(); j.position.set(0, y0 + 0.4, side * 0.15); j.rotation.set(rx, 0, rz); j.userData.rz = rz; j.userData.amp = amp; j.userData.sign = side; add(j, cyl(0.043, 0.048, 0.2, 14), armM, 0, -0.09, 0); add(j, ball(0.05), skin, 0, -0.2, 0); g.add(j); arms.push(j); return j; };
    add(g, cyl(0.055, 0.065, 0.04, 16), skin, 0, y0 + 0.46, 0);
    const hy = y0 + 0.615; const head = add(g, ball(0.165), skin, 0, hy, 0); head.scale.set(0.98, 1, 1);
    [0.058, -0.058].forEach((z) => { const e = add(g, ball(0.021), dark, 0.148, hy + 0.02, z); e.scale.x = 0.6; add(g, ball(0.007), white, 0.165, hy + 0.027, z + 0.006); });
    const smile = add(g, new T.TorusGeometry(0.05, 0.009, 8, 16, Math.PI), M('#7c2d24'), 0.155, hy - 0.045, 0); smile.rotation.set(Math.PI, Math.PI / 2, 0); add(g, ball(0.018), M('#d9966e'), 0.163, hy - 0.005, 0);
    if (kind === 0) { // Direktören: bakåtkammat hår, skjorta, slips och portfölj.
      const h = add(g, ball(0.17), hair, -0.022, hy + 0.05, 0); h.scale.set(1, 0.72, 1.02); add(g, box(0.012, 0.13, 0.1), white, 0.129, y0 + 0.36, 0); add(g, box(0.014, 0.135, 0.038), gold, 0.137, y0 + 0.34, 0); arm(1, 0.12, 0.8); const a = arm(-1, 0.05, 0.25); add(a, box(0.24, 0.16, 0.06), M('#6d3f1d'), 0.02, -0.33, 0); add(a, box(0.08, 0.018, 0.018), gold, 0.02, -0.245, 0); add(a, box(0.04, 0.03, 0.065), gold, 0.02, -0.31, 0);
    } else if (kind === 1) { // Mäklaren: glasögon, väst och telefon vid örat.
      const h = add(g, ball(0.172), hair, -0.03, hy + 0.045, 0); h.scale.set(1, 0.82, 1.03); [0.058, -0.058].forEach((z) => { const f = add(g, new T.TorusGeometry(0.036, 0.007, 8, 20), dark, 0.158, hy + 0.02, z); f.rotation.y = Math.PI / 2; }); add(g, box(0.012, 0.008, 0.05), dark, 0.165, hy + 0.02, 0); add(g, box(0.012, 0.13, 0.09), white, 0.129, y0 + 0.37, 0); arm(1, 0.15, 0.8); const a = arm(-1, -0.2, 0, 2.7); add(a, box(0.035, 0.13, 0.018), dark, 0, -0.25, 0); add(a, box(0.038, 0.11, 0.002), M('#7cd0ff', { emissive: '#3a90c0' }), 0.001, -0.25, 0.011);
    } else if (kind === 2) { // Byggherren: skyddshjälm, reflexväst och ritningsrulle.
      const hat = M('#ffcf1a', { roughness: 0.32 }), ref = M('#eaff3a', { emissive: '#868f10', emissiveIntensity: 0.5 }); const ha = add(g, new T.SphereGeometry(0.178, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0, hy + 0.04, 0); ha.scale.y = 0.9; add(g, cyl(0.2, 0.2, 0.02, 28), hat, 0.015, hy + 0.045, 0); add(g, box(0.3, 0.03, 0.03), M('#ffdf5a'), 0, hy + 0.2, 0); [0.052, -0.052].forEach((z) => add(g, box(0.012, 0.25, 0.032), ref, 0.126, y0 + 0.3, z)); add(g, box(0.205, 0.022, 0.27), ref, 0, y0 + 0.28, 0); arm(1, 0.1, 0.8); const a = arm(-1, 0.9, 0.12); const r = add(a, cyl(0.032, 0.032, 0.32, 14), M('#dbeafe'), 0, -0.24, 0); r.rotation.z = Math.PI / 2 - 0.9;
    } else if (kind === 3) { // Bankchefen: hårknut, kavaj, pärlor och sedelbunt.
      const h = add(g, ball(0.17), hair, -0.03, hy + 0.04, 0); h.scale.set(1, 0.85, 1.04); add(g, ball(0.075), hair, -0.1, hy + 0.17, 0); [-0.22, -0.11, 0, 0.11, 0.22].forEach((a, i) => add(g, ball(0.017), white, 0.1 * Math.cos(a) + 0.022, y0 + 0.435 - Math.abs(i - 2) * -0.004, 0.105 * Math.sin(a * 4.5))); add(g, box(0.012, 0.12, 0.1), white, 0.129, y0 + 0.36, 0); arm(1, 0.12, 0.8); const a = arm(-1, 1.05, 0.12); add(a, box(0.09, 0.05, 0.13), M('#79c889'), 0.01, -0.26, 0); add(a, box(0.092, 0.052, 0.03), white, 0.01, -0.26, 0);
    } else if (kind === 4) { // Industrimagnaten: plommonstop, mustasch och promenadkäpp.
      add(g, new T.SphereGeometry(0.165, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), dark, 0, hy + 0.06, 0); add(g, cyl(0.215, 0.215, 0.024, 28), dark, 0, hy + 0.06, 0); add(g, cyl(0.168, 0.17, 0.03, 28), M('#7f1d1d'), 0, hy + 0.08, 0); const ms = M(hairC); [0.04, -0.04].forEach((z, i) => { const m = add(g, ball(0.042), ms, 0.15, hy - 0.025, z); m.scale.set(0.5, 0.42, 1.3); m.rotation.x = i ? -0.3 : 0.3; }); add(g, box(0.012, 0.13, 0.1), white, 0.129, y0 + 0.36, 0); add(g, box(0.013, 0.03, 0.08), dark, 0.137, y0 + 0.41, 0); [0, 0.05, 0.1].forEach((d) => add(g, ball(0.012), gold, 0.13, y0 + 0.34 - d, 0)); arm(-1, 0.1, 0.8); const a = arm(1, 0.5, 0.12); const c = add(a, cyl(0.015, 0.015, 0.36, 10), dark, 0, -0.27, 0); c.rotation.z = -0.5; add(a, ball(0.032), gold, 0.03, -0.2, 0);
    } else { // Investeraren: hästsvans, luvtröja och surfplatta med stigande kurva.
      const h = add(g, ball(0.172), hair, -0.03, hy + 0.035, 0); h.scale.set(1, 0.9, 1.04); const pt = add(g, cyl(0.04, 0.018, 0.24, 12), hair, -0.2, hy - 0.02, 0); pt.rotation.z = 0.35; add(g, ball(0.045), body, -0.11, hy + 0.1, 0); const hood = add(g, new T.TorusGeometry(0.09, 0.035, 10, 20), body, -0.015, y0 + 0.45, 0); hood.rotation.x = Math.PI / 2; [0.03, -0.03].forEach((z) => add(g, box(0.008, 0.09, 0.008), white, 0.133, y0 + 0.37, z)); arm(1, 1.1, 0.08); arm(-1, 1.1, 0.08); const tb = add(g, box(0.13, 0.17, 0.012), M('#101726'), 0.24, y0 + 0.31, 0); tb.rotation.y = Math.PI / 2; const ln = add(g, box(0.003, 0.012, 0.11), M('#4dffa0', { emissive: '#1f9c60' }), 0.249, y0 + 0.31, 0); ln.rotation.x = 0.55;
    }
    g.userData.gubbe = { legs, arms };
    return g;
  };
  // Ben och armar svänger i takt. phase ökar när gubben rör sig, amount är 0-1 (springer gör den med mer).
  window.swingGubbe = function (m, phase, amount = 1) { const u = m.userData.gubbe; if (!u) return; const s = Math.sin(phase) * amount; u.legs[0].rotation.z = s * 0.72; u.legs[1].rotation.z = -s * 0.72; u.arms.forEach((a) => { a.rotation.z = a.userData.rz + s * a.userData.amp * a.userData.sign; }); };
  // Sitter i bil: benen pekar framåt.
  window.sitGubbe = function (m) { const u = m.userData.gubbe; if (!u) return; u.legs.forEach((l) => { l.rotation.z = 1.35; }); };
  // Hänger i fallskärmen: armarna uppåt mot linorna och benen dinglar.
  window.hangGubbe = function (m, up, phase) { const u = m.userData.gubbe; if (!u) return; const s = Math.sin(phase); u.legs[0].rotation.z = s * 0.34; u.legs[1].rotation.z = -s * 0.34; u.arms.forEach((a) => { a.rotation.z = a.userData.rz + (-2.75 - a.userData.rz) * up; }); };
  // Står stilla.
  window.standGubbe = function (m) { const u = m.userData.gubbe; if (!u) return; u.legs.forEach((l) => { l.rotation.z = 0; }); u.arms.forEach((a) => { a.rotation.z = a.userData.rz; }); };
})();
