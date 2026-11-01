// Spelmotorn. Inga nätverksdelar: state in, handling in, state ut.
const { GROUPS, SQUARES, BORSTIPS, FINANS, RULES: R, sharePct, plotInfo } = require('./public/data.js');

const die = () => 1 + Math.floor(Math.random() * 6);
const kr = (v) => v.toLocaleString('sv-SE').replace(/ /g, ' ') + ' kr';
const shuffled = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fail = (m) => { const e = new Error(m); e.userError = true; throw e; };
const groupPlots = (k) => Object.keys(SQUARES).map(Number).filter((n) => SQUARES[n].group === k);

function newGame(players, opts = {}) {
  const g = {
    phase: 'play', target: opts.target || R.target, doubles: 0, turnNo: 1, current: 0, stage: 'pre', boughtPlot: false, boughtShare: false,
    players: players.map((p, i) => ({ id: p.id, name: p.name, bot: !!p.bot, color: i, pos: 47, cash: R.startCash, car: false, loans: 0, skip: 0, fromPrison: false, freeBuild: false, out: false })),
    plots: {}, shares: [], bonds: {}, news: null, dice: [], debts: [], bondRound: null, winner: null, log: [],
    tipDeck: shuffled(BORSTIPS.length), newsDeck: shuffled(FINANS.length), lastCard: null,
  };
  for (const n of Object.keys(SQUARES)) if (SQUARES[n].kind === 'plot') g.plots[n] = { owner: null, built: false, mort: false };
  for (const k of Object.keys(GROUPS)) GROUPS[k].shares.forEach((v, i) => g.shares.push({ id: k + i, group: k, value: v, pct: sharePct(v), owner: null }));
  for (let i = 1; i <= 12; i++) g.bonds[i] = null;
  log(g, `Spelet börjar. ${g.players[0].name} slår först.`);
  return g;
}
const log = (g, m) => { g.log.push(m); if (g.log.length > 80) g.log.shift(); };
const P = (g, id) => g.players.find((p) => p.id === id);
const cur = (g) => g.players[g.current];
const alive = (g) => g.players.filter((p) => !p.out);
const shareCapital = (g, p) => g.shares.filter((s) => s.owner === p.id).reduce((a, s) => a + s.value, 0);
const buildingsOf = (g, p) => Object.values(g.plots).filter((x) => x.owner === p.id && x.built).length;
const plotsOf = (g, p) => Object.keys(g.plots).map(Number).filter((n) => g.plots[n].owner === p.id);
const loansOut = (g) => g.players.reduce((a, p) => a + p.loans, 0);

function completeGroup(g, k, p) {
  return groupPlots(k).every((n) => g.plots[n].owner === p.id) && g.shares.filter((s) => s.group === k).every((s) => s.owner === p.id);
}
const completeCount = (g, p) => Object.keys(GROUPS).filter((k) => completeGroup(g, k, p)).length;

function rentOf(g, n) {
  const x = g.plots[n]; const i = plotInfo(n); const o = P(g, x.owner);
  let r = x.built ? i.rentBuilt : i.rent;
  if (completeGroup(g, SQUARES[n].group, o)) r *= 2;
  return r;
}
function pay(g, from, to, amount, why) { if (amount > 0) g.debts.push({ from: from.id, to: to ? to.id : null, amount, why }); }

function dividendTo(g, p, why) {
  const a = g.shares.filter((s) => s.owner === p.id).reduce((t, s) => t + Math.round(s.value * s.pct / 100), 0);
  if (a) { p.cash += a; log(g, `${p.name} får ${kr(a)} i aktieutdelning${why || ''}.`); }
}
function giveDividends(g, p) {
  const gs = new Set(plotsOf(g, p).map((n) => SQUARES[n].group));
  for (const o of alive(g)) {
    if (o === p) continue;
    const cap = g.shares.filter((s) => s.owner === o.id && gs.has(s.group)).reduce((t, s) => t + s.value, 0);
    if (cap) { const a = Math.round(cap * R.givePct); pay(g, p, o, a, `20 % utdelning till ${o.name}`); }
  }
}
function drawTip(g, p, d) {
  const i = g.tipDeck.shift(); g.tipDeck.push(i); const c = BORSTIPS[i];
  g.lastCard = { deck: 'Börstips', text: c.x }; log(g, `Börstips till ${p.name}: ${c.x}`);
  if (c.t === 'gain') p.cash += c.a;
  else if (c.t === 'lose') pay(g, p, null, c.a, 'börstips');
  else if (c.t === 'dividend') dividendTo(g, p);
  else if (c.t === 'give') giveDividends(g, p);
  else if (c.t === 'goto') { p.pos = c.to; land(g, p, d + 1); }
  else if (c.t === 'freebuild') p.freeBuild = true;
  else if (c.t === 'news') drawNews(g, p, d);
  else if (c.t === 'prison') { p.pos = 9; land(g, p, d + 1); }
  else if (c.t === 'car') { if (p.car) pay(g, p, null, c.a, 'bilservice'); }
  else if (c.t === 'collect') alive(g).forEach((o) => { if (o !== p) pay(g, o, p, c.a, 'födelsedag'); });
  else if (c.t === 'perbuild') pay(g, p, null, c.a * buildingsOf(g, p), 'underhåll');
}
function drawNews(g, p) {
  const i = g.newsDeck.shift(); g.newsDeck.push(i); const c = FINANS[i];
  g.news = c.until ? { type: c.t, text: c.x } : null;
  g.lastCard = { deck: 'Finanstidningen', text: c.x }; log(g, `Finanstidningen: ${c.x}`);
  const everyone = alive(g);
  if (c.t === 'largedraw') startBonds(g, p, true, 'large');
  else if (c.t === 'alldiv') everyone.forEach((o) => dividendTo(g, o));
  else if (c.t === 'inflation') everyone.forEach((o) => pay(g, o, null, Math.round(shareCapital(g, o) * 0.1), 'inflation'));
  else if (c.t === 'proptax') everyone.forEach((o) => pay(g, o, null, plotsOf(g, o).length * 1000 + buildingsOf(g, o) * 3000, 'fastighetsskatt'));
  else if (c.t === 'boom') everyone.forEach((o) => { o.cash += buildingsOf(g, o) * 5000; });
  else if (c.t === 'rate') everyone.forEach((o) => pay(g, o, null, o.loans * 5000, 'räntehöjning'));
  else if (c.t === 'grant') everyone.forEach((o) => { o.cash += 10000; });
}
function startBonds(g, p, all, draw) {
  const order = []; const n = g.players.length; const start = g.players.indexOf(p);
  for (let i = 0; i < n; i++) { const o = g.players[(start + i) % n]; if (!o.out && (all || o === p)) order.push(o.id); }
  g.bondRound = { queue: order, draw };
}
function runDraw(g, kind) {
  const a = die(); const b = die(); const prizes = kind === 'large' ? R.largeDraw : R.smallDraw;
  g.dice = [a, b];
  const low = Math.min(a, b); const hi = Math.max(a, b);
  const lowNum = a === b ? (low === 1 ? 12 : low - 1) : low;
  log(g, `${kind === 'large' ? 'Stora' : 'Lilla'} dragningen: tärningarna visar ${a} och ${b}.`);
  [a + b, hi, lowNum].forEach((num, i) => {
    const o = g.bonds[num]; if (!o) return;
    const q = P(g, o); if (q && !q.out) { q.cash += prizes[i]; log(g, `Obligation ${num} ger ${q.name} ${kr(prizes[i])}.`); }
    g.bonds[num] = null;
  });
}
function sendToPrison(g, p) {
  const d = die(); p.skip = d <= 2 ? 1 : d <= 4 ? 2 : 3; p.fromPrison = true; g.dice = [d];
  log(g, `${p.name} slår ${d} och står över ${p.skip} kast.`);
}
function land(g, p, depth = 0) {
  if (depth > 5) return;
  const s = SQUARES[p.pos];
  switch (s.kind) {
    case 'plot': { const x = g.plots[p.pos];
      if (x.owner && x.owner !== p.id && !x.mort) { const o = P(g, x.owner); const r = rentOf(g, p.pos); log(g, `${p.name} hamnar på ${s.name} och betalar ${kr(r)} i hyra till ${o.name}.`); pay(g, p, o, r, 'hyra'); }
      break; }
    case 'bor': drawTip(g, p, depth); break;
    case 'news': drawNews(g, p, depth); break;
    case 'div': dividendTo(g, p); break;
    case 'prison': sendToPrison(g, p); break;
    case 'gotoprison': {
      if (p.fromPrison) { log(g, `${p.name} kommer direkt från fängelset, rutan gäller inte.`); break; }
      const d = die(); g.dice = [d]; log(g, `${p.name} slår ${d} på Gå direkt i fängelse.`);
      if (d <= 2) { p.pos = 9; sendToPrison(g, p); }
      break; }
    case 'entry': { let a = die(); let b = die(); g.dice = [a, b];
      let pips = a + b; if (g.news && g.news.type === 'bad') pips = Math.min(a, b);
      let bonus = pips * R.bonusPerPip; if (g.news && g.news.type === 'good') bonus *= 2;
      p.cash += bonus; log(g, `${p.name} får ${kr(bonus)} i gratifikation.`); break; }
    case 'exit': {
      p.fromPrison = false;
      if (p.loans) { pay(g, p, null, p.loans * R.loanInterest, 'låneränta'); log(g, `${p.name} betalar ränta på ${p.loans} lån.`); }
      drawTip(g, p, depth); break; }
    case 'repay': if (p.loans) { p.loans--; pay(g, p, null, R.loan + R.loanInterest, 'tvingad lånebetalning'); log(g, `${p.name} måste återbetala ett lån plus ränta.`); } break;
    case 'give': giveDividends(g, p); log(g, `${p.name} ger utdelning till motspelarna.`); break;
    case 'lilla': startBonds(g, p, false, 'small'); break;
    case 'bonddiv': { const good = g.news && g.news.type === 'good';
      (good ? alive(g) : [p]).forEach((o) => dividendTo(g, o)); startBonds(g, p, good, null); break; }
    default: break;
  }
}
function bankruptPlayer(g, p) {
  const owed = g.debts.find((d) => d.from === p.id && d.to);
  if (owed && p.cash > 0) { const c = P(g, owed.to); if (c && !c.out) c.cash += p.cash; }
  g.debts = g.debts.filter((d) => d.from !== p.id);
  p.cash = 0; p.out = true; p.loans = 0; p.car = false;
  Object.values(g.plots).forEach((x) => { if (x.owner === p.id) { x.owner = null; x.built = false; x.mort = false; } });
  g.shares.forEach((s) => { if (s.owner === p.id) s.owner = null; });
  Object.keys(g.bonds).forEach((b) => { if (g.bonds[b] === p.id) g.bonds[b] = null; });
  log(g, `${p.name} har gått i konkurs.`);
}
function nextTurn(g) {
  const n = g.players.length;
  for (let guard = 0; guard < 200; guard++) {
    g.current = (g.current + 1) % n; const p = cur(g);
    if (p.out) continue;
    if (p.skip > 0) { p.skip--; log(g, `${p.name} står över sitt kast.`); continue; }
    break;
  }
  g.stage = 'pre'; g.boughtPlot = false; g.boughtShare = false; g.doubles = 0; g.turnNo++;
}
// Kör allt som kan köras automatiskt: skulder, dragning, vinst.
function settle(g) {
  for (let guard = 0; guard < 500 && g.phase === 'play'; guard++) {
    if (g.debts.length) {
      const d = g.debts[0]; const f = P(g, d.from);
      if (f.out) { g.debts.shift(); continue; }
      if (f.cash < d.amount) break;
      f.cash -= d.amount; if (d.to) { const t = P(g, d.to); if (t && !t.out) t.cash += d.amount; }
      g.debts.shift(); continue;
    }
    const left = alive(g);
    if (left.length === 1) { g.phase = 'over'; g.winner = left[0].id; log(g, `${left[0].name} är sist kvar och vinner!`); break; }
    const w = left.find((p) => p.cash >= g.target && completeCount(g, p) >= R.groupsToWin);
    if (w) { g.phase = 'over'; g.winner = w.id; log(g, `${w.name} visar ${kr(w.cash)} och två kompletta företagsgrupper och vinner!`); break; }
    if (g.bondRound) {
      const r = g.bondRound;
      while (r.queue.length) { const o = P(g, r.queue[0]); const free = Object.values(g.bonds).some((v) => !v); if (o.out || !free || o.cash < R.bondPrice) r.queue.shift(); else break; }
      if (r.queue.length) break;
      g.bondRound = null; if (r.draw) runDraw(g, r.draw); continue;
    }
    if (cur(g).out) { nextTurn(g); continue; }
    break;
  }
}
const blocked = (g) => g.debts.length > 0 || !!g.bondRound;
const canTrade = (p) => p.pos === 12 || (p.pos >= 35 && p.pos <= 46);
const canBuildHere = (p) => p.pos === 17 || p.pos === 40 || p.freeBuild;
const meetingCost = (g, p, k) => {
  let x = 0;
  groupPlots(k).forEach((n) => { const q = g.plots[n]; if (q.owner && q.owner !== p.id) x += plotInfo(n).price + (q.built ? plotInfo(n).build : 0); });
  g.shares.forEach((s) => { if (s.group === k && s.owner && s.owner !== p.id) x += s.value; });
  return x;
};

function apply(g, pid, a) {
  if (g.phase !== 'play') fail('Spelet är slut.');
  const p = P(g, pid); if (!p || p.out) fail('Du är inte med i spelet.');
  const isTurn = cur(g).id === pid;
  const inDebt = g.debts.length && g.debts[0].from === pid;
  const raising = isTurn ? !blocked(g) || inDebt : inDebt;
  const needTurn = () => { if (!isTurn) fail('Det är inte din tur.'); if (blocked(g)) fail('Vänta tills betalningar och obligationer är klara.'); };
  const pre = () => { needTurn(); if (g.stage !== 'pre') fail('Det går bara före ditt kast.'); };
  const needOwnPlot = (n) => { const x = g.plots[n]; if (!x || x.owner !== pid) fail('Du äger inte den tomten.'); return x; };
  switch (a.type) {
    case 'roll': { pre();
      const inBank = p.pos >= 34 && p.pos < 47; const two = p.car && !inBank;
      const d1 = die(); const d2 = two ? die() : null; g.dice = two ? [d1, d2] : [d1];
      const pair = two && d1 === d2;
      if (pair) g.doubles++;
      if (pair && g.doubles >= R.maxDoubles) {
        log(g, `${p.name} slår lika ${R.maxDoubles} gånger i rad och åker i fängelse.`);
        g.lastCard = null; g.stage = 'post'; p.pos = 9; sendToPrison(g, p); g.dice = [d1, d2]; break;
      }
      let steps = d1 + (d2 || 0);
      while (steps-- > 0) { p.pos = p.pos === 53 ? 1 : p.pos + 1; if (p.pos === 34 || p.pos === 47) break; }
      log(g, `${p.name} slår ${two ? d1 + ' och ' + d2 : d1} och går till ${SQUARES[p.pos].name}.`);
      g.lastCard = null; g.stage = 'post'; land(g, p);
      if (pair && p.skip === 0 && !p.out) { g.stage = 'pre'; log(g, `${p.name} slog lika och får slå igen.`); }
      break; }
    case 'end': needTurn(); if (g.stage !== 'post') fail('Du måste slå först.'); nextTurn(g); break;
    case 'buyCar': pre(); if (p.car) fail('Du har redan en bil.'); if (p.cash < R.carPrice) fail('Du har inte råd.'); p.cash -= R.carPrice; p.car = true; log(g, `${p.name} köper bil.`); break;
    case 'sellCar': if (!raising) fail('Inte nu.'); if (!p.car) fail('Du har ingen bil.'); p.car = false; p.cash += R.carSell; log(g, `${p.name} säljer bilen.`); break;
    case 'buyPlot': { pre(); if (!canTrade(p)) fail('Du måste stå i banken eller på Bankfilialen.'); if (g.boughtPlot) fail('Bara en tomt per tur.');
      const x = g.plots[a.n]; if (!x || x.owner) fail('Tomten går inte att köpa.'); const c = plotInfo(a.n).price; if (p.cash < c) fail('Du har inte råd.');
      p.cash -= c; x.owner = pid; g.boughtPlot = true; log(g, `${p.name} köper ${SQUARES[a.n].name}.`); break; }
    case 'buyShare': { pre(); if (!canTrade(p)) fail('Du måste stå i banken eller på Bankfilialen.'); if (g.boughtShare) fail('Bara en aktie per tur.');
      const s = g.shares.find((v) => v.id === a.id); if (!s || s.owner) fail('Aktien går inte att köpa.'); if (p.cash < s.value) fail('Du har inte råd.');
      p.cash -= s.value; s.owner = pid; g.boughtShare = true; log(g, `${p.name} köper en aktie i ${GROUPS[s.group].name}.`); break; }
    case 'build': { pre(); if (!canBuildHere(p)) fail('Du kan inte bygga här.'); const x = needOwnPlot(a.n); if (x.built) fail('Tomten är redan bebyggd.'); if (x.mort) fail('Tomten är belånad.');
      const c = plotInfo(a.n).build; if (p.cash < c) fail('Du har inte råd.'); p.cash -= c; x.built = true;
      if (p.pos !== 17 && p.pos !== 40) p.freeBuild = false; log(g, `${p.name} bygger på ${SQUARES[a.n].name}.`); break; }
    case 'mortgage': { if (!raising) fail('Inte nu.'); const x = needOwnPlot(a.n); if (x.mort) fail('Redan belånad.'); const i = plotInfo(a.n); p.cash += x.built ? i.mortgageBuilt : i.mortgage; x.mort = true; log(g, `${p.name} belånar ${SQUARES[a.n].name}.`); break; }
    case 'redeem': { pre(); const x = needOwnPlot(a.n); if (!x.mort) fail('Tomten är inte belånad.'); const i = plotInfo(a.n); const c = Math.round((x.built ? i.mortgageBuilt : i.mortgage) * R.redeemPct); if (p.cash < c) fail('Du har inte råd.'); p.cash -= c; x.mort = false; log(g, `${p.name} löser lånet på ${SQUARES[a.n].name}.`); break; }
    case 'sellPlot': { if (!raising) fail('Inte nu.'); const x = needOwnPlot(a.n); if (x.mort) fail('Lös belåningen först.'); const i = plotInfo(a.n); p.cash += x.built ? i.sellBuilt : i.sell; x.owner = null; x.built = false; log(g, `${p.name} säljer ${SQUARES[a.n].name} till banken.`); break; }
    case 'sellShare': { if (!raising) fail('Inte nu.'); const s = g.shares.find((v) => v.id === a.id); if (!s || s.owner !== pid) fail('Du äger inte aktien.'); p.cash += Math.round(s.value * 0.75 / 500) * 500; s.owner = null; log(g, `${p.name} säljer en aktie till banken.`); break; }
    case 'loan': if (!raising) fail('Inte nu.'); if (p.pos === 38) fail('Du får inte låna på den här rutan.'); if (p.loans >= R.maxLoans) fail('Du har redan tre lån.'); if (loansOut(g) >= R.bankLoans) fail('Banken har inga lån kvar.'); p.loans++; p.cash += R.loan; log(g, `${p.name} tar ett banklån.`); break;
    case 'repay': needTurn(); if (!p.loans) fail('Du har inga lån.'); if (p.cash < R.loan) fail('Du har inte råd.'); p.cash -= R.loan; p.loans--; log(g, `${p.name} betalar tillbaka ett lån.`); break;
    case 'meeting': { pre(); if (!canTrade(p)) fail('Du måste stå i banken eller på Bankfilialen.'); const k = a.group; if (!GROUPS[k]) fail('Okänd företagsgrupp.');
      const fee = Number(a.fee); if (!Number.isInteger(fee) || fee % 10000 || fee < R.feeMin || fee > R.feeMax) fail('Ogiltig förmedlingsavgift.');
      const mine = groupPlots(k).some((n) => g.plots[n].owner === pid) || g.shares.some((s) => s.group === k && s.owner === pid); if (!mine) fail('Du måste äga något i gruppen.');
      const x = meetingCost(g, p, k); if (!x) fail('Ingen motspelare äger något i gruppen.'); if (p.cash < x + fee) fail('Du har inte tillräckligt med kontanter.');
      const r1 = die(); const r2 = die(); const auto = fee === R.feeMax; const won = auto || r1 + r2 <= fee / 10000;
      if (!auto) g.dice = [r1, r2];
      if (!won) { p.cash -= fee; log(g, `Bolagsstämma i ${GROUPS[k].name}: ${p.name} slår ${r1 + r2} och misslyckas. Avgiften går till banken.`); break; }
      const owners = new Set(); p.cash -= x + fee;
      groupPlots(k).forEach((n) => { const q = g.plots[n]; if (q.owner && q.owner !== pid) { const o = P(g, q.owner); o.cash += plotInfo(n).price + (q.built ? plotInfo(n).build : 0); owners.add(o); q.owner = pid; } });
      g.shares.forEach((s) => { if (s.group === k && s.owner && s.owner !== pid) { const o = P(g, s.owner); o.cash += s.value; owners.add(o); s.owner = pid; } });
      const rest = fee - R.feeBank; const each = Math.round(rest / owners.size / 500) * 500; owners.forEach((o) => { o.cash += each; });
      log(g, `Bolagsstämma: ${p.name} tar över ${GROUPS[k].name}.`); break; }
    case 'buyBond': { const r = g.bondRound; if (!r || r.queue[0] !== pid) fail('Det är inte din tur att köpa.'); if (blocked(g) && g.debts.length) fail('Skulderna måste betalas först.'); const n = Number(a.n); if (!(n in g.bonds) || g.bonds[n]) fail('Obligationen går inte att köpa.'); if (p.cash < R.bondPrice) fail('Du har inte råd.'); p.cash -= R.bondPrice; g.bonds[n] = pid; r.queue.shift(); log(g, `${p.name} köper obligation ${n}.`); break; }
    case 'skipBond': { const r = g.bondRound; if (!r || r.queue[0] !== pid) fail('Det är inte din tur.'); r.queue.shift(); break; }
    case 'bankrupt': { if (!inDebt) fail('Du har ingen skuld att ge upp på.'); bankruptPlayer(g, p); break; }
    default: fail('Okänd handling.');
  }
  settle(g);
  return g;
}
// Vem ska agera nu?
function actor(g) {
  if (g.phase !== 'play') return null;
  if (g.debts.length) return g.debts[0].from;
  if (g.bondRound && g.bondRound.queue.length) return g.bondRound.queue[0];
  return cur(g).id;
}
// Enkel datorspelare. Används också när en människa är borta för länge.
function botAction(g, pid, passive) {
  const p = P(g, pid);
  if (g.debts.length && g.debts[0].from === pid) {
    if (p.pos !== 38 && p.loans < R.maxLoans && loansOut(g) < R.bankLoans) return { type: 'loan' };
    const free = plotsOf(g, p).find((n) => !g.plots[n].mort); if (free) return { type: 'mortgage', n: free };
    const sh = g.shares.find((s) => s.owner === pid); if (sh) return { type: 'sellShare', id: sh.id };
    if (p.car) return { type: 'sellCar' };
    return { type: 'bankrupt' };
  }
  if (g.bondRound && g.bondRound.queue[0] === pid) {
    if (passive) return { type: 'skipBond' };
    const prefer = [7, 6, 8, 5, 9, 4, 10, 3, 11, 12, 2, 1].find((n) => !g.bonds[n]);
    return prefer ? { type: 'buyBond', n: prefer } : { type: 'skipBond' };
  }
  if (g.stage === 'post') return { type: 'end' };
  if (passive) return { type: 'roll' };
  // Sälj av för vinst om det räcker.
  if (completeCount(g, p) >= R.groupsToWin) {
    const keep = new Set(Object.keys(GROUPS).filter((k) => completeGroup(g, k, p)));
    const s = g.shares.find((v) => v.owner === pid && !keep.has(v.group)); if (s) return { type: 'sellShare', id: s.id };
  }
  if (!p.car && p.cash > 150000) return { type: 'buyCar' };
  if (canTrade(p)) {
    if (p.cash > 200000) for (const k of Object.keys(GROUPS)) { const x = meetingCost(g, p, k); const has = groupPlots(k).some((n) => g.plots[n].owner === pid) || g.shares.some((s) => s.group === k && s.owner === pid);
      if (has && x && p.cash >= x + R.feeMax + 50000) return { type: 'meeting', group: k, fee: R.feeMax }; }
    if (!g.boughtPlot) { const n = Object.keys(g.plots).map(Number).find((m) => !g.plots[m].owner && p.cash >= plotInfo(m).price + 20000); if (n) return { type: 'buyPlot', n }; }
    if (!g.boughtShare) { const s = g.shares.find((v) => !v.owner && p.cash >= v.value + 20000); if (s) return { type: 'buyShare', id: s.id }; }
  }
  if (canBuildHere(p)) { const n = plotsOf(g, p).find((m) => !g.plots[m].built && !g.plots[m].mort && p.cash >= plotInfo(m).build + 30000); if (n) return { type: 'build', n }; }
  if (p.loans && p.cash > 200000) return { type: 'repay' };
  return { type: 'roll' };
}
// Det webbläsaren får se: kortlekarnas ordning hålls hemlig.
function publicView(g) { const { tipDeck, newsDeck, ...v } = g; return v; }

module.exports = { newGame, apply, actor, botAction, publicView, meetingCost, completeCount, settle };
