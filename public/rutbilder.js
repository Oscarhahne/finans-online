// Rutorna Aktieutdelning, Börstips och Finanstidning, samt korthögarna i mitten.
// Allt ritas så att det täcker hela ytan, oavsett form, och blir skarpt även när man zoomar in.
(function () {
  const FONT = '"Nunito","Trebuchet MS",Verdana,sans-serif';
  const rounded = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  // Ram ända ut mot kanten, med ett sken i samma färg.
  function frame(c, cw, ch, band, glow, line) { const unit = Math.min(cw, ch), inset = unit * 0.045, rad = unit * 0.075; c.save(); c.strokeStyle = band; c.lineWidth = unit * 0.07; rounded(c, inset, inset, cw - 2 * inset, ch - 2 * inset, rad); c.stroke(); c.shadowColor = glow; c.shadowBlur = unit * 0.05; c.strokeStyle = line; c.lineWidth = Math.max(2, unit * 0.012); rounded(c, inset, inset, cw - 2 * inset, ch - 2 * inset, rad); c.stroke(); c.restore(); }
  function badge(c, cw, ch, no, bg) { const unit = Math.min(cw, ch), bw = unit * 0.21, bh = unit * 0.17, bx = unit * 0.085, by = unit * 0.085; c.fillStyle = bg; rounded(c, bx, by, bw, bh, unit * 0.03); c.fill(); c.fillStyle = '#fff'; c.font = `800 ${Math.round(unit * 0.125)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(no, bx + bw / 2, by + bh / 2 + unit * 0.006); c.textBaseline = 'alphabetic'; }
  // Aktieutdelning: bildens mynt, pil och text tonas in i en grön botten.
  window.drawDivArt = function (c, cw, ch, img, no) {
    const unit = Math.min(cw, ch), bg = c.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, '#04562c'); bg.addColorStop(0.3, '#023a1c'); bg.addColorStop(1, '#02301a'); c.fillStyle = bg; c.fillRect(0, 0, cw, ch);
    const sx = 321 * 0.13, sy = 214 * 0.03, sw = 321 * 0.74, sh = 214 * 0.9, pad = unit * 0.085, k = Math.min((cw - 2 * pad) / sw, (ch - 2 * pad) / sh), dw = sw * k, dh = sh * k, part = document.createElement('canvas'); part.width = Math.ceil(dw); part.height = Math.ceil(dh); const o = part.getContext('2d'); o.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh); o.globalCompositeOperation = 'destination-in';
    const fx = o.createLinearGradient(0, 0, dw, 0); fx.addColorStop(0, 'rgba(0,0,0,0)'); fx.addColorStop(0.12, '#000'); fx.addColorStop(0.88, '#000'); fx.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = fx; o.fillRect(0, 0, dw, dh);
    const fy = o.createLinearGradient(0, 0, 0, dh); fy.addColorStop(0, 'rgba(0,0,0,0)'); fy.addColorStop(0.06, '#000'); fy.addColorStop(0.95, '#000'); fy.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = fy; o.fillRect(0, 0, dw, dh);
    o.globalCompositeOperation = 'destination-out'; const bx0 = (321 * 0.1 - sx) * k, by0 = (214 * 0.13 - sy) * k, rb = 321 * 0.14 * k, cut = o.createRadialGradient(bx0, by0, rb * 0.55, bx0, by0, rb); cut.addColorStop(0, '#000'); cut.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = cut; o.fillRect(0, 0, dw, dh);
    c.drawImage(part, (cw - dw) / 2, (ch - dh) / 2);
    frame(c, cw, ch, 'rgba(38,226,120,.16)', '#3dff9a', '#49f59b'); badge(c, cw, ch, no, '#0a2a1b');
  };
  // Titel och två rader text längst ner i motivet.
  function caption(c, title, l1, l2, sub, size) { c.textAlign = 'center'; c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 6; c.shadowOffsetY = 2; c.fillStyle = '#fff'; c.font = `800 ${size}px ${FONT}`; c.fillText(title, 160, 160); c.restore(); c.fillStyle = sub; c.font = `700 13.5px ${FONT}`; c.fillText(l1, 160, 180); c.fillText(l2, 160, 196); }
  function newsScene(c) {
    c.strokeStyle = 'rgba(255,233,165,.26)'; c.lineWidth = 1.4; c.beginPath(); c.arc(262, 108, 58, 0, Math.PI * 2); c.stroke(); [0.35, 0.7].forEach((f) => { c.beginPath(); c.ellipse(262, 108, 58 * f, 58, 0, 0, Math.PI * 2); c.stroke(); }); [-28, 0, 28].forEach((d) => { const w = Math.sqrt(58 * 58 - d * d); c.beginPath(); c.moveTo(262 - w, 108 + d); c.lineTo(262 + w, 108 + d); c.stroke(); });
    c.save(); c.translate(150, 66); c.rotate(-0.17);
    c.save(); c.rotate(-0.13); c.shadowColor = 'rgba(70,40,0,.5)'; c.shadowBlur = 10; c.shadowOffsetY = 5; c.fillStyle = '#8f897c'; c.fillRect(-66, -46, 118, 92); c.restore(); c.save(); c.rotate(-0.06); c.fillStyle = '#c8c0ae'; c.fillRect(-64, -48, 120, 94); c.restore();
    c.save(); c.shadowColor = 'rgba(60,35,0,.55)'; c.shadowBlur = 8; c.shadowOffsetX = 2; c.shadowOffsetY = 5; c.fillStyle = '#f5eedf'; c.fillRect(-60, -50, 122, 100); c.restore();
    c.fillStyle = '#28385a'; c.font = 'bold 19px Georgia,"Times New Roman",serif'; c.textAlign = 'center'; c.fillText('FINANS', 1, -30); c.fillStyle = '#28385a'; c.fillRect(-52, -25, 106, 1.8);
    c.strokeStyle = '#8c8678'; c.lineWidth = 1.7; for (let y = -18; y <= 12; y += 6) { c.beginPath(); c.moveTo(-52, y); c.lineTo(-7, y); c.stroke(); } for (let y = 19; y <= 42; y += 6) { c.beginPath(); c.moveTo(-52, y); c.lineTo(54, y); c.stroke(); }
    const pic = c.createLinearGradient(0, -21, 0, 13); pic.addColorStop(0, '#8f9eb2'); pic.addColorStop(1, '#46546a'); c.fillStyle = pic; c.fillRect(0, -21, 54, 34); c.fillStyle = '#2b3648'; [[3, 7, 14], [11, 6, 22], [18, 8, 16], [27, 5, 25], [33, 8, 18], [42, 6, 12], [48, 5, 19]].forEach(([x, w, h]) => c.fillRect(x, 13 - h, w, h));
    c.restore();
    c.strokeStyle = '#ffd84d'; c.lineWidth = 5; c.lineCap = 'round'; [[218, 36, 234, 18], [228, 55, 250, 49], [224, 74, 245, 79]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }); c.lineCap = 'butt';
    caption(c, 'Finanstidning', 'Ta del av den senaste', 'marknadsinformationen.', '#fff1cc', 36);
  }
  function tipsScene(c) {
    c.fillStyle = 'rgba(120,190,255,.2)'; [[116, 34], [130, 44], [144, 42], [158, 56], [172, 72]].forEach(([x, h]) => c.fillRect(x, 124 - h, 10, h));
    c.save(); c.strokeStyle = '#2aa3ff'; c.lineWidth = 2.6; c.shadowColor = '#2aa3ff'; c.shadowBlur = 8; c.beginPath(); c.moveTo(18, 125); c.bezierCurveTo(52, 142, 72, 112, 102, 112); c.bezierCurveTo(134, 112, 158, 82, 188, 60); c.stroke(); c.restore();
    [[24, 96, 12, 'u'], [38, 90, 14, 'u'], [52, 80, 13, 'u'], [66, 72, 17, 'u'], [80, 62, 20, 'u'], [94, 58, 24, 'd'], [108, 68, 17, 'd'], [122, 62, 17, 'u'], [136, 44, 21, 'u'], [150, 40, 24, 'd'], [164, 48, 14, 'd'], [178, 32, 18, 'u'], [190, 22, 14, 'u'], [204, 2, 25, 'u']].forEach(([x, y, h, d]) => { const col = d === 'u' ? '#2fe48d' : '#f0604b'; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x, y + h + 7); c.stroke(); c.fillStyle = col; c.fillRect(x - 4.5, y, 9, h); });
    c.save(); c.translate(268, 56); c.rotate(-0.08); c.shadowColor = 'rgba(40,150,255,.8)'; c.shadowBlur = 9; c.fillStyle = '#0d56bd'; rounded(c, -39, -24, 78, 48, 6); c.fill(); c.shadowBlur = 0; c.strokeStyle = '#5ac0ff'; c.lineWidth = 2.2; rounded(c, -39, -24, 78, 48, 6); c.stroke(); c.fillStyle = '#e4f4ff'; c.font = `800 27px ${FONT}`; c.textAlign = 'center'; c.fillText('TIPS', 0, 10); c.restore();
    c.strokeStyle = '#37d6ff'; c.lineWidth = 3.6; c.lineJoin = 'round'; c.beginPath(); c.moveTo(240, 118); c.lineTo(255, 104); c.lineTo(263, 111); c.lineTo(281, 94); c.stroke(); c.beginPath(); c.moveTo(269, 93); c.lineTo(282, 93); c.lineTo(282, 106); c.stroke(); c.lineJoin = 'miter';
    caption(c, 'Börstips', 'Få insyn i marknaden', 'och dra ett kort.', '#bcd8f7', 38);
  }
  // kind är 'bor' eller 'news'. no är rutans nummer, eller null på korthögarna.
  window.drawCardArt = function (c, cw, ch, kind, no) {
    const news = kind === 'news', bg = c.createLinearGradient(0, 0, cw, ch), unit = Math.min(cw, ch);
    if (news) { bg.addColorStop(0, '#efb22c'); bg.addColorStop(0.5, '#d4930f'); bg.addColorStop(1, '#a56c08'); } else { bg.addColorStop(0, '#0d57b3'); bg.addColorStop(0.55, '#083d8b'); bg.addColorStop(1, '#052a63'); }
    c.fillStyle = bg; c.fillRect(0, 0, cw, ch);
    c.save(); c.beginPath(); c.moveTo(0, ch * 0.72); c.lineTo(cw * 0.62, 0); c.lineTo(cw * 0.9, 0); c.lineTo(0, ch); c.closePath(); c.fillStyle = 'rgba(255,255,255,.055)'; c.fill(); c.restore();
    if (!news) { c.strokeStyle = 'rgba(130,190,255,.1)'; c.lineWidth = Math.max(1, unit * 0.004); const step = unit * 0.1; for (let x = step; x < cw; x += step) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ch); c.stroke(); } for (let y = step; y < ch; y += step) { c.beginPath(); c.moveTo(0, y); c.lineTo(cw, y); c.stroke(); } }
    const pad = unit * 0.085, k = Math.min((cw - 2 * pad) / 320, (ch - 2 * pad) / 210); c.save(); c.translate((cw - 320 * k) / 2, (ch - 210 * k) / 2); c.scale(k, k); if (news) newsScene(c); else tipsScene(c); c.restore();
    if (news) frame(c, cw, ch, 'rgba(255,214,90,.12)', '#ffd65a', '#ffe07a'); else frame(c, cw, ch, 'rgba(70,170,255,.12)', '#3aa8ff', '#57bbff');
    if (no !== null && no !== undefined) badge(c, cw, ch, no, news ? 'rgba(92,58,6,.82)' : 'rgba(5,28,70,.86)');
  };
})();
