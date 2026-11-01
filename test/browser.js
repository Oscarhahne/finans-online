// Två riktiga webbläsare spelar mot varandra via servern.
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const mk = async (w, h) => { const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_/.test(m.text())) errors.push(m.text()); }); return p; };
  const A = await mk(1440, 1000); const B = await mk(390, 844);
  await A.goto('http://localhost:3456'); await A.fill('#name', 'Anna'); await A.click('text=Skapa nytt spel');
  await A.waitForSelector('.code'); const code = await A.textContent('.code'); await A.screenshot({ path: out + '/lobby.png' });
  await B.goto('http://localhost:3456/?kod=' + code); await B.fill('#name', 'Bertil'); await B.click('button:has-text("Gå med")');
  await B.waitForSelector('.code'); await A.waitForSelector('text=Bertil'); await A.click('text=Lägg till dator'); await A.click('text=Starta spelet');
  await A.waitForSelector('.board'); await B.waitForSelector('.board');
  // Spela: båda klickar det som är möjligt, och köper när de står i banken.
  let bought = 0;
  for (let i = 0; i < 400 && bought < 3; i++) {
    for (const p of [A, B]) {
      const buy = p.locator('button:has-text("Köp tomt/aktie")');
      if (await buy.count()) { await buy.click(); const k = p.locator('.modal .item button:not([disabled])').first(); if (await k.count()) { await k.click(); bought++; await p.waitForTimeout(100); } await p.locator('.modal button:has-text("Stäng")').click(); }
      for (const t of ['Slå tärningen', 'Slå två tärningar', 'Avsluta turen', 'Köp ingen']) { const q = p.locator(`.side button:has-text("${t}")`); if (await q.count()) { await q.first().click(); await p.waitForTimeout(40); break; } }
    }
    await A.waitForTimeout(50);
  }
  await A.waitForTimeout(400);
  await A.screenshot({ path: out + '/game-desktop.png' });
  await B.screenshot({ path: out + '/game-phone.png' });
  // Åtgärd utan tur ska avvisas, och omladdning ska återansluta.
  await B.reload(); await B.waitForSelector('.board');
  await A.locator('#sq24').click(); await A.waitForSelector('.modal'); await A.screenshot({ path: out + '/square.png' });
  await A.locator('.modal button:has-text("Stäng")').click();
  const hasOwner = await A.locator('.own').count();
  const overflow = await B.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(JSON.stringify({ bought, hasOwner, overflow, errors }));
  await b.close();
  if (errors.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
