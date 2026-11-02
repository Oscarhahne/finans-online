// Spelmotorn. Inga nätverksdelar: state in, handling in, state ut.
const { GROUPS, SQUARES, BORSTIPS, FINANS, RULES: R, sharePct, plotInfo } = require('./public/data.js');

const die = () => 1 + Math.floor(Math.random() * 6);
const kr = (v) => v.toLocaleString('sv-SE').replace(/ /g, ' ') + ' kr';
const shuffled = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fail = (m) => { const e = new Error(m); e.userError = true; throw e; };
const groupPlots = (k) => Object.keys(SQUARES).map(Number).filter((n) => SQUARES[n].group === k);

function newGame(players, opts = {}) {
  const g = {
    phase: 'play', autoEnd: opts.autoEnd !== false, target: opts.target || R.target, doubles: 0, pendingRent: null, bonusThenLand: false, drawNo: 0, lastDraw: null, extraRoll: false, eventNo: 0, events: [], finalRound: null, landed: null, cardNo: 0, rollNo: 0, lastRoll: null, turnNo: 1, current: 0, stage: 'pre', boughtPlot: false, boughtShare: false,
    players: players.map((p, i) => ({ id: p.id, name: p.name, bot: !!p.bot, color: i, pos: 47, cash: R.startCash, car: false, loans: 0, jail: 0, jailFree: [], permits: [], rentFree: [], tradePass: [], lapDone: false, fromPrison: false, out: false })),
    plots: {}, shares: [], bonds: {}, news: null, dice: [], debts: [], bondRound: null, winner: null, log: [],
    tipDeck: shuffled(BORSTIPS.length), newsDeck: shuffled(FINANS.length), lastCard: null,
  };
  for (const n of Object.keys(SQUARES)) if (SQUARES[n].kind === 'plot') g.plots[n] = { owner: null, built: false, mort: false };
  for (const k of Object.keys(GROUPS)) GROUPS[k].shares.forEach((v, i) => g.shares.push({ id: k + i, group: k, value: v, pct: sharePct(v), owner: null }));
  for (let i = 1; i <= 12; i++) g.bonds[i] = null;
  log(g, `Spelet börjar. ${g.players[0].name} slår först.`, true);
  return g;
}
const log = (g, m, quiet) => {
  g.log.push(m); if (g.log.length > 80) g.log.shift();
  // Händelser visas som korta rutor hos alla spelare. Kast och kort har egna visningar.
  if (!quiet) { g.eventNo++; g.events.push({ id: g.eventNo, text: m }); if (g.events.length > 20) g.events.shift(); }
};
const setRoll = (g, pid, dice, label) => { g.dice = dice.slice(); g.rollNo++; g.lastRoll = { id: g.rollNo, player: pid, dice: dice.slice(), label }; };
const P = (g, id) => g.players.find((p) => p.id === id);
const cur = (g) => g.players[g.current];
const alive = (g) => g.players.filter((p) => !p.out);
const shareCapital = (g, p) => g.shares.filter((s) => s.owner === p.id).reduce((a, s) => a + s.value, 0);
const buildingsOf = (g, p) => Object.values(g.plots).filter((x) => x.owner === p.id && x.built).length;
const plotsOf = (g, p) => Object.keys(g.plots).map(Number).filter((n) => g.plots[n].owner === p.id);

function completeGroup(g, k, p) {
  return groupPlots(k).every((n) => g.plots[n].owner === p.id) && g.shares.filter((s) => s.group === k).every((s) => s.owner === p.id);
}
const completeCount = (g, p) => Object.keys(GROUPS).filter((k) => completeGroup(g, k, p)).length;

function rentOf(g, n) {
  const x = g.plots[n]; const i = plotInfo(n); const o = P(g, x.owner);
  let r = x.built ? i.rentBuilt : i.rent;
  // Dubbel hyra räknas en gång, även om gruppen är komplett och har högkonjunktur.
  const boom = g.news && g.news.type === 'double' && g.news.group === SQUARES[n].group;
  if (boom || completeGroup(g, SQUARES[n].group, o)) r *= 2;
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
  const i = g.tipDeck.shift(); const c = BORSTIPS[i]; if (c.t === 'jailfree') p.jailFree.push(i); else if (c.t === 'permit') p.permits.push(i); else if (c.t === 'rentfree') p.rentFree.push(i); else if (c.t === 'tradepass') p.tradePass.push(i); else g.tipDeck.push(i);
  g.cardNo++; g.lastCard = { id: g.cardNo, deck: 'Börstips', text: c.x }; log(g, `Börstips till ${p.name}: ${c.x}`, true);
  if (c.t === 'gain') p.cash += c.a;
  else if (c.t === 'lose') pay(g, p, null, c.a, 'börstips');
  else if (c.t === 'dividend') dividendTo(g, p);
  else if (c.t === 'give') giveDividends(g, p);
  else if (c.t === 'goto') { p.pos = c.to; land(g, p, d + 1); }
  else if (c.t === 'permit') log(g, `${p.name} sparar ett bygglov.`);
  else if (c.t === 'rentfree') log(g, `${p.name} sparar en hyresfrihet.`);
  else if (c.t === 'tradepass') log(g, `${p.name} sparar ett köptips.`);
  else if (c.t === 'perplot') { const a = plotsOf(g, p).length * c.a; p.cash += a; log(g, `${p.name} får ${kr(a)} från hyresgäster.`); }
  else if (c.t === 'poorest') { const o = alive(g).reduce((b, q) => (q.cash < b.cash ? q : b), p); o.cash += c.a; log(g, `${o.name} har minst kontanter och får ${kr(c.a)}.`); }
  else if (c.t === 'audit') { const a = Math.ceil(p.cash * c.pct / 100 / 500) * 500; if (a) { pay(g, p, null, a, 'revision'); log(g, `${p.name} betalar ${kr(a)} efter revisionen.`); } }
  else if (c.t === 'carloss') { if (p.car) { p.car = false; log(g, `${p.name} förlorar sin bil.`); } else log(g, `${p.name} har ingen bil att förlora.`); }
  else if (c.t === 'toexit') { p.pos = 47; p.fromPrison = false; g.landed = { player: p.id, pos: 47 }; if (p.loans) pay(g, p, null, p.loans * R.loanInterest, 'låneränta'); log(g, `${p.name} går till Bankutgång.`); }
  else if (c.t === 'news') drawNews(g, p, d);
  else if (c.t === 'prison') { sendToPrison(g, p); }
  else if (c.t === 'bondwin') { const o = g.bonds[c.n] ? P(g, g.bonds[c.n]) : null; if (o) { o.cash += c.a; g.bonds[c.n] = null; log(g, `${o.name} inkasserar ${kr(c.a)} på obligation ${c.n}.`); } else log(g, `Ingen äger obligation ${c.n}.`); }
  else if (c.t === 'smalldraw') startBonds(g, p, false, 'small');
  else if (c.t === 'back') { for (let k = 0; k < c.n; k++) p.pos = p.pos === 1 ? 53 : p.pos - 1; land(g, p, d + 1); }
  else if (c.t === 'forward') { // Stegkort stannar inte vid banken, utan kan gå rakt in i den.
    let passedEntry = false;
    for (let k = 0; k < c.n; k++) { p.pos = p.pos === 53 ? 1 : p.pos + 1; if (p.pos === 34 && k < c.n - 1) passedEntry = true; if (p.pos === 47) p.fromPrison = false; }
    // Går man förbi Bankentré slår man gratifikation först. Sedan gäller rutan man kom till.
    if (passedEntry) { p.lapDone = true; g.extraRoll = false; g.bonusThenLand = true; g.stage = 'bonus'; } else land(g, p, d + 1); }
  else if (c.t === 'jailfree') log(g, `${p.name} sparar ett frikort.`);
  else if (c.t === 'visit') { if (plotsOf(g, p).length) g.stage = 'visit'; else { p.pos = 34; land(g, p, d + 1); } }
  else if (c.t === 'handover') { if (handoverItems(g, p).length && prevPlayer(g, p)) g.stage = 'handover'; else log(g, `${p.name} har inget att lämna över.`); }
  else if (c.t === 'car') { if (p.car) pay(g, p, null, c.a, 'bilservice'); }
  else if (c.t === 'collect') alive(g).forEach((o) => { if (o !== p) pay(g, o, p, c.a, 'födelsedag'); });
  else if (c.t === 'perbuild') pay(g, p, null, c.a * buildingsOf(g, p), 'underhåll');
}
function drawNews(g, p) {
  const i = g.newsDeck.shift(); g.newsDeck.push(i); const c = FINANS[i];
  g.cardNo++; g.lastCard = { id: g.cardNo, deck: 'Finanstidningen', text: c.x }; log(g, `Finanstidningen: ${c.x}`, true);
  const everyone = alive(g);
  g.news = c.until ? { type: c.t, text: c.x, group: c.group } : null;
  if (c.t === 'largedraw') startBonds(g, p, true, 'large');
  else if (c.t === 'rebuild') everyone.forEach((o) => { if (o.pos >= 34 && o.pos < 47) { o.pos = 47; o.fromPrison = false; log(g, `${o.name} hamnar på Bankutgång.`); } });
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
  log(g, `${kind === 'large' ? 'Stora' : 'Lilla'} obligationsdragningen: tärningarna visar ${a} och ${b}.`, true);
  const results = [a + b, hi, lowNum].map((num, i) => {
    const o = g.bonds[num]; const q = o ? P(g, o) : null; const paid = q && !q.out;
    if (paid) { q.cash += prizes[i]; log(g, `Obligation ${num} ger ${q.name} ${kr(prizes[i])}.`, true); }
    if (o) g.bonds[num] = null;
    return { num, prize: prizes[i], winner: paid ? q.name : null, color: paid ? q.color : null };
  });
  g.drawNo++; g.lastDraw = { id: g.drawNo, kind, dice: [a, b], results };
}
// Spelaren hamnar i fängelset och slår själv hur länge det blir.
function sendToPrison(g, p) {
  g.prisonFrom = { pos: p.pos, fromPrison: p.fromPrison };
  p.pos = 9; p.fromPrison = true; g.landed = { player: p.id, pos: 9 }; g.extraRoll = false; g.stage = 'sentence';
  log(g, `${p.name} åker i fängelse.`);
}
// Det som går att lämna över. Kompletta företagsgrupper är skyddade.
function handoverItems(g, p) {
  const free = (k) => !completeGroup(g, k, p);
  return [...plotsOf(g, p).filter((n) => free(SQUARES[n].group)).map((n) => ({ kind: 'plot', n, value: plotInfo(n).price })),
    ...g.shares.filter((s) => s.owner === p.id && free(s.group)).map((s) => ({ kind: 'share', id: s.id, value: s.value }))];
}
function prevPlayer(g, p) {
  const n = g.players.length; const i = g.players.indexOf(p);
  for (let k = 1; k < n; k++) { const o = g.players[(i - k + n) % n]; if (!o.out) return o; }
  return null;
}
function afterLanding(g, p) {
  if (g.stage === 'post' && g.extraRoll && !p.jail && !p.out) { g.stage = 'pre'; log(g, `${p.name} slog lika och får slå igen.`); }
  if (!['bonus', 'visit', 'handover', 'rentchoice'].includes(g.stage)) g.extraRoll = false;
}
function land(g, p, depth = 0) {
  if (depth > 5) return;
  g.landed = { player: p.id, pos: p.pos };
  const s = SQUARES[p.pos];
  switch (s.kind) {
    case 'plot': { const x = g.plots[p.pos];
      if (x.owner && x.owner !== p.id && !x.mort && p.rentFree.length) { g.pendingRent = { to: x.owner, amount: rentOf(g, p.pos), pos: p.pos }; g.stage = 'rentchoice'; }
      else if (x.owner && x.owner !== p.id && !x.mort) { const o = P(g, x.owner); const r = rentOf(g, p.pos); log(g, `${p.name} hamnar på ${s.name} och betalar ${kr(r)} i hyra till ${o.name}.`); pay(g, p, o, r, 'hyra'); }
      break; }
    case 'bor': drawTip(g, p, depth); break;
    case 'news': drawNews(g, p, depth); break;
    case 'div': dividendTo(g, p); break;
    case 'prison': sendToPrison(g, p); break;
    case 'gotoprison':
      if (p.fromPrison) { log(g, `${p.name} har redan suttit i fängelse under det här varvet och klarar sig.`); break; }
      sendToPrison(g, p); break;
    case 'entry': p.lapDone = true; g.extraRoll = false; g.stage = 'bonus'; break; // Turen slutar här, även efter lika tärningar.
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
  g.tipDeck.push(...p.jailFree, ...p.permits, ...p.rentFree, ...p.tradePass); p.jailFree = []; p.permits = []; p.rentFree = []; p.tradePass = [];
  p.cash = 0; p.out = true; p.loans = 0; p.car = false;
  Object.values(g.plots).forEach((x) => { if (x.owner === p.id) { x.owner = null; x.built = false; x.mort = false; } });
  g.shares.forEach((s) => { if (s.owner === p.id) s.owner = null; });
  Object.keys(g.bonds).forEach((b) => { if (g.bonds[b] === p.id) g.bonds[b] = null; });
  log(g, `${p.name} har gått i konkurs.`);
}
const reachedTarget = (g) => alive(g).filter((p) => p.cash >= g.target && completeCount(g, p) >= R.groupsToWin);
// När rundan är slut vinner den som har mest, av dem som fortfarande har nått målet.
function finishRound(g) {
  const best = reachedTarget(g).sort((a, b) => b.cash - a.cash)[0];
  g.finalRound = null;
  if (!best) { log(g, 'Ingen har kvar vinstsumman när rundan är slut. Spelet fortsätter.'); return false; }
  g.phase = 'over'; g.winner = best.id; log(g, `Rundan är slut. ${best.name} vinner med ${kr(best.cash)}!`);
  return true;
}
function nextTurn(g) {
  const n = g.players.length;
  for (let guard = 0; guard < 200; guard++) {
    if (g.current === n - 1 && g.finalRound && finishRound(g)) return;
    g.current = (g.current + 1) % n; const p = cur(g);
    if (p.out) continue;
    break;
  }
  g.stage = 'pre'; g.boughtPlot = false; g.boughtShare = false; g.doubles = 0; g.extraRoll = false; g.turnNo++;
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
    const w = reachedTarget(g)[0];
    if (w && !g.finalRound) { g.finalRound = w.id; log(g, `${w.name} har nått ${kr(g.target)}! Rundan spelas klart.`); }
    if (g.bondRound) {
      const r = g.bondRound;
      while (r.queue.length) { const o = P(g, r.queue[0]); const free = Object.values(g.bonds).some((v) => !v); if (o.out || !free || o.cash < R.bondPrice) r.queue.shift(); else break; }
      if (r.queue.length) break;
      g.bondRound = null; if (r.draw) runDraw(g, r.draw); continue;
    }
    if (cur(g).out) { nextTurn(g); continue; }
    // Turen slutar av sig själv när allt på rutan är klart.
    if (g.autoEnd && g.stage === 'post') { nextTurn(g); continue; }
    break;
  }
}
const blocked = (g) => g.debts.length > 0 || !!g.bondRound;
const canTrade = (p) => p.lapDone && (p.pos === 12 || (p.pos >= 35 && p.pos <= 46));
const canBuy = (p) => p.lapDone && (canTrade(p) || p.tradePass.length > 0);
const usePass = (g, p) => { if (!canTrade(p)) { g.tipDeck.push(p.tradePass.shift()); log(g, `${p.name} använder sitt köptips.`); } };
const tradeFail = (p) => (p.lapDone ? 'Du måste stå i banken eller på Bankfilialen.' : 'Du får inte köpa tomter och aktier på första varvet.');
const canBuildHere = (p) => p.pos === 17 || p.pos === 40 || p.permits.length > 0;
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
      g.lastCard = null;
      if (p.jail > 0) {
        const d1 = die(); const d2 = die(); setRoll(g, pid, [d1, d2], 'slår för att komma ut');
        if (d1 === d2) {
          p.jail = 0; let steps = p.car ? d1 + d2 : d1; if (g.news && g.news.type === 'good') steps *= 2; else if (g.news && g.news.type === 'bad') steps = d1;
          while (steps-- > 0) { p.pos = p.pos === 53 ? 1 : p.pos + 1; if (p.pos === 34 || p.pos === 47) break; }
          log(g, `${p.name} slår lika och går ut ur fängelset till ${SQUARES[p.pos].name}.`);
          g.stage = 'post'; land(g, p); break;
        }
        p.jail--; g.stage = 'post';
        log(g, p.jail ? `${p.name} sitter kvar i fängelset, ${p.jail} år till.` : `${p.name} har suttit av sitt straff och slår som vanligt nästa tur.`);
        break;
      }
      const inBank = p.pos >= 34 && p.pos < 47; const two = p.car && !inBank;
      const good = g.news && g.news.type === 'good'; const bad = g.news && g.news.type === 'bad';
      // Dåliga tider: alla slår två tärningar och går efter den lägsta. Goda tider: dubbelt så många steg.
      const d1 = die(); const d2 = two || bad ? die() : null; setRoll(g, pid, d2 === null ? [d1] : [d1, d2], 'slår');
      const pair = two && d1 === d2;
      if (pair) g.doubles++;
      if (pair && g.doubles >= R.maxDoubles) { log(g, `${p.name} slår lika ${R.maxDoubles} gånger i rad.`); sendToPrison(g, p); break; }
      let steps = bad ? Math.min(d1, d2) : d1 + (d2 || 0); if (good) steps *= 2;
      while (steps-- > 0) { p.pos = p.pos === 53 ? 1 : p.pos + 1; if (p.pos === 34 || p.pos === 47) break; }
      log(g, `${p.name} slår ${d2 === null ? d1 : d1 + ' och ' + d2}${good ? ', goda tider ger dubbla steg,' : bad ? ', dåliga tider ger lägsta tärningen,' : ''} och går till ${SQUARES[p.pos].name}.`, true);
      g.stage = 'post'; g.extraRoll = pair; land(g, p); afterLanding(g, p); break; }
    case 'bonus': { needTurn(); if (g.stage !== 'bonus') fail('Det går inte nu.');
      const a1 = die(); const a2 = die(); setRoll(g, pid, [a1, a2], 'slår gratifikation');
      let bonus = (a1 + a2) * R.bonusPerPip;
      if (g.news && g.news.type === 'good') bonus *= 2; else if (g.news && g.news.type === 'bad') bonus = Math.round(bonus / 2);
      p.cash += bonus; log(g, `${p.name} får ${kr(bonus)} i gratifikation.`);
      g.stage = 'post'; if (g.bonusThenLand) { g.bonusThenLand = false; g.landed = { player: pid, pos: p.pos }; land(g, p, 1); } afterLanding(g, p); break; }
    case 'sentence': { needTurn(); if (g.stage !== 'sentence') fail('Det går inte nu.');
      const d = die(); setRoll(g, pid, [d], 'slår hur länge fängelset blir');
      p.jail = d <= 2 ? 1 : d <= 4 ? 2 : 3; g.stage = 'post';
      log(g, `${p.name} ska sitta i fängelse i ${p.jail} år.`); break; }
    case 'useJailFree': { needTurn(); if (g.stage !== 'sentence') fail('Det går inte nu.'); if (!p.jailFree.length) fail('Du har inget frikort.');
      g.tipDeck.push(p.jailFree.shift()); const from = g.prisonFrom || { pos: 9, fromPrison: false };
      p.pos = from.pos; p.fromPrison = from.fromPrison; p.jail = 0; g.landed = { player: pid, pos: p.pos }; g.stage = 'post';
      log(g, `${p.name} använder sitt frikort och slipper fängelset.`); break; }
    case 'visit': { needTurn(); if (g.stage !== 'visit') fail('Det går inte nu.'); const n = Number(a.n); needOwnPlot(n);
      p.pos = n; g.stage = 'post'; log(g, `${p.name} besöker ${SQUARES[n].name}.`); land(g, p, 1); afterLanding(g, p); break; }
    case 'handover': { needTurn(); if (g.stage !== 'handover') fail('Det går inte nu.'); const to = prevPlayer(g, p); const items = handoverItems(g, p);
      const it = items.find((v) => (a.kind === 'plot' ? v.kind === 'plot' && v.n === Number(a.n) : v.kind === 'share' && v.id === a.id)); if (!it) fail('Det går inte att lämna över.');
      if (it.kind === 'plot') { g.plots[it.n].owner = to.id; log(g, `${p.name} lämnar över ${SQUARES[it.n].name} till ${to.name}.`); }
      else { g.shares.find((v) => v.id === it.id).owner = to.id; log(g, `${p.name} lämnar över en aktie till ${to.name}.`); }
      g.stage = 'post'; afterLanding(g, p); break; }
    case 'payRent': { needTurn(); if (g.stage !== 'rentchoice') fail('Det går inte nu.'); const r = g.pendingRent; const o = P(g, r.to); log(g, `${p.name} betalar ${kr(r.amount)} i hyra till ${o.name}.`); pay(g, p, o, r.amount, 'hyra'); g.pendingRent = null; g.stage = 'post'; afterLanding(g, p); break; }
    case 'useRentFree': { needTurn(); if (g.stage !== 'rentchoice') fail('Det går inte nu.'); g.tipDeck.push(p.rentFree.shift()); log(g, `${p.name} använder hyresfrihet och slipper hyran.`); g.pendingRent = null; g.stage = 'post'; afterLanding(g, p); break; }
    case 'end': needTurn(); if (g.stage !== 'post') fail('Du måste slå först.'); nextTurn(g); break;
    case 'buyCar': pre(); if (p.car) fail('Du har redan en bil.'); if (p.cash < R.carPrice) fail('Du har inte råd.'); p.cash -= R.carPrice; p.car = true; log(g, `${p.name} köper bil.`); break;
    case 'sellCar': if (!raising) fail('Inte nu.'); if (!p.car) fail('Du har ingen bil.'); p.car = false; p.cash += R.carSell; log(g, `${p.name} säljer bilen.`); break;
    case 'buyPlot': { pre(); if (!canBuy(p)) fail(tradeFail(p)); if (g.boughtPlot) fail('Bara en tomt per tur.');
      const x = g.plots[a.n]; if (!x || x.owner) fail('Tomten går inte att köpa.'); const c = plotInfo(a.n).price; if (p.cash < c) fail('Du har inte råd.');
      usePass(g, p); p.cash -= c; x.owner = pid; g.boughtPlot = true; log(g, `${p.name} köper ${SQUARES[a.n].name}.`); break; }
    case 'buyShare': { pre(); if (!canBuy(p)) fail(tradeFail(p)); if (g.boughtShare) fail('Bara en aktie per tur.');
      const s = g.shares.find((v) => v.id === a.id); if (!s || s.owner) fail('Aktien går inte att köpa.'); if (p.cash < s.value) fail('Du har inte råd.');
      usePass(g, p); p.cash -= s.value; s.owner = pid; g.boughtShare = true; log(g, `${p.name} köper en aktie i ${GROUPS[s.group].name}.`); break; }
    case 'build': { pre(); if (g.news && g.news.type === 'buildstop') fail('Byggstopp gäller just nu.'); if (!canBuildHere(p)) fail('Du kan inte bygga här.'); const x = needOwnPlot(a.n); if (x.built) fail('Tomten är redan bebyggd.'); if (x.mort) fail('Tomten är belånad.');
      const c = plotInfo(a.n).build; if (p.cash < c) fail('Du har inte råd.'); p.cash -= c; x.built = true;
      if (p.pos !== 17 && p.pos !== 40) { g.tipDeck.push(p.permits.shift()); log(g, `${p.name} använder sitt bygglov.`); } log(g, `${p.name} bygger på ${SQUARES[a.n].name}.`); break; }
    case 'mortgage': { if (!raising) fail('Inte nu.'); const x = needOwnPlot(a.n); if (x.mort) fail('Redan belånad.'); const i = plotInfo(a.n); p.cash += x.built ? i.mortgageBuilt : i.mortgage; x.mort = true; log(g, `${p.name} belånar ${SQUARES[a.n].name}.`); break; }
    case 'redeem': { pre(); const x = needOwnPlot(a.n); if (!x.mort) fail('Tomten är inte belånad.'); const i = plotInfo(a.n); const c = Math.round((x.built ? i.mortgageBuilt : i.mortgage) * R.redeemPct); if (p.cash < c) fail('Du har inte råd.'); p.cash -= c; x.mort = false; log(g, `${p.name} löser lånet på ${SQUARES[a.n].name}.`); break; }
    case 'sellPlot': { if (!raising) fail('Inte nu.'); const x = needOwnPlot(a.n); if (x.mort) fail('Lös belåningen först.'); const i = plotInfo(a.n); p.cash += x.built ? i.sellBuilt : i.sell; x.owner = null; x.built = false; log(g, `${p.name} säljer ${SQUARES[a.n].name} till banken.`); break; }
    case 'sellShare': { if (!raising) fail('Inte nu.'); const s = g.shares.find((v) => v.id === a.id); if (!s || s.owner !== pid) fail('Du äger inte aktien.'); p.cash += Math.round(s.value * 0.75 / 500) * 500; s.owner = null; log(g, `${p.name} säljer en aktie till banken.`); break; }
    case 'loan': if (!raising) fail('Inte nu.'); if (p.pos === 38) fail('Du får inte låna på den här rutan.'); if (p.loans >= R.maxLoans) fail('Du har redan tre lån.'); p.loans++; p.cash += R.loan; log(g, `${p.name} tar ett banklån.`); break;
    case 'repay': needTurn(); if (!p.loans) fail('Du har inga lån.'); if (p.cash < R.loan) fail('Du har inte råd.'); p.cash -= R.loan; p.loans--; log(g, `${p.name} betalar tillbaka ett lån.`); break;
    case 'meeting': { pre(); if (!canTrade(p)) fail(tradeFail(p)); const k = a.group; if (!GROUPS[k]) fail('Okänd företagsgrupp.');
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
    if (p.pos !== 38 && p.loans < R.maxLoans) return { type: 'loan' };
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
  if (g.stage === 'bonus') return { type: 'bonus' };
  if (g.stage === 'sentence') return !passive && p.jailFree.length ? { type: 'useJailFree' } : { type: 'sentence' };
  if (g.stage === 'rentchoice') return !passive && g.pendingRent.amount >= 8000 ? { type: 'useRentFree' } : { type: 'payRent' };
  if (g.stage === 'visit') return { type: 'visit', n: plotsOf(g, p)[0] };
  if (g.stage === 'handover') { const it = handoverItems(g, p).sort((x, y) => x.value - y.value)[0]; return { type: 'handover', ...it }; }
  if (g.stage === 'post') return { type: 'end' };
  if (passive) return { type: 'roll' };
  if (!p.car && p.cash > 150000) return { type: 'buyCar' };
  if (canBuy(p)) {
    if (canTrade(p) && p.cash > 200000) for (const k of Object.keys(GROUPS)) { const x = meetingCost(g, p, k); const has = groupPlots(k).some((n) => g.plots[n].owner === pid) || g.shares.some((s) => s.group === k && s.owner === pid);
      if (has && x && p.cash >= x + R.feeMax + 50000) return { type: 'meeting', group: k, fee: R.feeMax }; }
    if (!g.boughtPlot) { const n = Object.keys(g.plots).map(Number).find((m) => !g.plots[m].owner && p.cash >= plotInfo(m).price + 20000); if (n) return { type: 'buyPlot', n }; }
    if (!g.boughtShare) { const s = g.shares.find((v) => !v.owner && p.cash >= v.value + 20000); if (s) return { type: 'buyShare', id: s.id }; }
  }
  if (canBuildHere(p) && !(g.news && g.news.type === 'buildstop')) { const n = plotsOf(g, p).find((m) => !g.plots[m].built && !g.plots[m].mort && p.cash >= plotInfo(m).build + 30000); if (n) return { type: 'build', n }; }
  if (p.loans && p.cash > 200000) return { type: 'repay' };
  return { type: 'roll' };
}
// Det webbläsaren får se: kortlekarnas ordning hålls hemlig.
function publicView(g) { const { tipDeck, newsDeck, ...v } = g; return v; }

module.exports = { newGame, apply, actor, botAction, publicView, meetingCost, completeCount, settle };
