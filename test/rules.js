// Stämmer motorn med de viktigaste reglerna?
const assert = require('assert');
const G = require('../game.js');
const two = () => G.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], { autoEnd: false });
const rejects = (g, id, a, re) => assert.throws(() => G.apply(g, id, a), re);
let g = two();
rejects(g, 'b', { type: 'roll' }, /inte din tur/);
rejects(g, 'a', { type: 'end' }, /slå först/);
g.players[0].pos = 12;
rejects(g, 'a', { type: 'buyPlot', n: 5 }, /första varvet/);
rejects(g, 'a', { type: 'buyShare', id: 'A0' }, /första varvet/);
g.players[0].lapDone = true;
G.apply(g, 'a', { type: 'buyPlot', n: 5 });
rejects(g, 'a', { type: 'buyPlot', n: 7 }, /en tomt/);
assert.equal(g.players[0].cash, 55000);
// Bolagsstämma med full avgift lyckas alltid, köpesumma enligt regelbokens exempel.
g = two(); const [A, B, C] = g.players; A.lapDone = true; A.pos = 41; A.cash = 500000; B.cash = 0; C.cash = 0;
g.plots[5] = { owner: 'b', built: true, mort: false }; g.plots[7].owner = 'a'; g.plots[8].owner = 'a';
g.shares.find((s) => s.id === 'A0').owner = 'a'; g.shares.find((s) => s.id === 'A1').owner = 'b'; g.shares.find((s) => s.id === 'A2').owner = 'c';
G.apply(g, 'a', { type: 'meeting', group: 'A', fee: 120000 });
assert.equal(A.cash, 500000 - 190000 - 120000); assert.equal(B.cash, 115000 + 45000); assert.equal(C.cash, 75000 + 45000);
assert.equal(g.plots[5].owner, 'a');
// Hyra fördubblas med komplett grupp.
A.cash = 100000; g.current = 1; B.pos = 4; B.cash = 100000; B.car = false; g.stage = 'pre';
const orig = Math.random; Math.random = () => 0; G.apply(g, 'b', { type: 'roll' }); Math.random = orig;
assert.equal(B.pos, 5); assert.equal(B.cash, 100000 - 24000); assert.equal(A.cash, 124000);
// Tvingad återbetalning: 50 000 + 10 000.
g = two(); g.players[0].pos = 38; g.players[0].loans = 1; g.players[0].cash = 65000; Math.random = () => 0; G.apply(g, 'a', { type: 'roll' }); Math.random = orig;
assert.equal(g.players[0].pos, 39); assert.equal(g.players[0].cash, 5000); assert.equal(g.players[0].loans, 0);
// Obligationsdragning: två fyror ger 8, 4 och 3. Två ettor ger 2, 1 och 12.
g = two(); g.players[0].pos = 41; g.bonds[2] = 'a'; g.bonds[1] = 'b'; g.bonds[12] = 'c';
const before = g.players.map((p) => p.cash); Math.random = () => 0; G.apply(g, 'a', { type: 'roll' }); G.apply(g, 'a', { type: 'skipBond' }); Math.random = orig;
assert.equal(g.players[0].cash - before[0], 50000); assert.equal(g.players[1].cash - before[1], 25000); assert.equal(g.players[2].cash - before[2], 15000);
// Når någon målet spelas rundan klart. Sedan vinner den som har mest.
g = two(); g.players[1].cash = 1200000; G.settle(g); assert.equal(g.phase, 'play'); assert.equal(g.finalRound, 'b');
g.stage = 'post'; G.apply(g, 'a', { type: 'end' }); assert.equal(g.phase, 'play'); assert.equal(g.current, 1);
g.stage = 'post'; G.apply(g, 'b', { type: 'end' }); assert.equal(g.phase, 'play'); assert.equal(g.current, 2);
g.players[2].cash = 1500000; g.stage = 'post'; G.apply(g, 'c', { type: 'end' }); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'c');
// Har ingen kvar summan när rundan är slut fortsätter spelet.
g = two(); g.players[2].cash = 1200000; G.settle(g); g.current = 2; g.players[2].cash = 900000; g.stage = 'post'; G.apply(g, 'c', { type: 'end' }); assert.equal(g.phase, 'play'); assert.equal(g.finalRound, null); assert.equal(g.current, 0);
// Skuld som inte går att betala blockerar turen och kan sluta i konkurs.
g = two(); g.players[0].cash = 0; g.debts.push({ from: 'a', to: 'b', amount: 900000, why: 'test' }); G.settle(g);
rejects(g, 'b', { type: 'roll' }, /inte din tur|Vänta/);
G.apply(g, 'a', { type: 'bankrupt' }); assert.equal(g.players[0].out, true); assert.equal(g.players[g.current].out, false);
// Lika på två tärningar ger nytt kast, tredje gången blir det fängelse.
g = two(); { const p = g.players[0]; p.car = true; p.pos = 1; p.cash = 500000; Math.random = () => 0.99; // sexor
  G.apply(g, 'a', { type: 'roll' }); assert.equal(p.pos, 13); assert.equal(g.stage, 'pre'); assert.equal(g.current, 0);
  G.apply(g, 'a', { type: 'roll' }); assert.equal(p.pos, 25); assert.equal(g.stage, 'pre');
  G.apply(g, 'a', { type: 'roll' }); assert.equal(p.pos, 9); assert.equal(g.stage, 'sentence');
  G.apply(g, 'a', { type: 'sentence' }); assert.equal(p.jail, 3); assert.equal(g.stage, 'post'); Math.random = orig;
  G.apply(g, 'a', { type: 'end' }); assert.equal(g.current, 1); assert.equal(g.doubles, 0); }
// Olika tärningar ger inget extra kast, och en tärning räknas aldrig som lika.
g = two(); { const p = g.players[0]; p.car = true; p.pos = 1; const seq = [0, 0.5]; let i = 0; Math.random = () => seq[i++ % 2];
  G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(g.stage, 'post'); assert.equal(g.doubles, 0); }
// Gratifikation: 10 000 kr per öga, dubbelt vid goda tider och hälften vid dåliga.
for (const [news, want] of [[null, 120000], ['good', 240000], ['bad', 60000]]) {
  g = two(); const p = g.players[0]; p.pos = 34; p.cash = 0; g.news = news ? { type: news } : null; Math.random = () => 0;
  G.apply(g, 'a', { type: 'roll' }); assert.equal(p.pos, 35); assert.equal(g.stage, 'bonus'); assert.equal(p.lapDone, true);
  Math.random = () => 0.99; G.apply(g, 'a', { type: 'bonus' }); Math.random = orig; assert.equal(p.cash, want); assert.equal(g.stage, 'post');
}
// Bankentré avslutar turen även efter lika tärningar.
g = two(); { const p = g.players[0]; p.car = true; p.pos = 33; Math.random = () => 0; G.apply(g, 'a', { type: 'roll' }); assert.equal(p.pos, 35); assert.equal(g.stage, 'bonus'); G.apply(g, 'a', { type: 'bonus' }); Math.random = orig; assert.equal(g.stage, 'post'); rejects(g, 'a', { type: 'roll' }, /före ditt kast/); }
// Gå direkt i fängelse gäller alltid, utom efter fängelse under samma varv.
g = two(); { const p = g.players[0]; p.pos = 29; Math.random = () => 0; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(p.pos, 9); assert.equal(g.stage, 'sentence'); }
g = two(); { const p = g.players[0]; p.pos = 29; p.fromPrison = true; Math.random = () => 0; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(p.pos, 30); assert.equal(g.stage, 'post'); }
// I fängelset: lika släpper ut. Med bil gäller båda tärningarna, utan bil en.
g = two(); { const p = g.players[0]; p.pos = 9; p.jail = 2; Math.random = () => 0.5; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(p.jail, 0); assert.equal(p.pos, 13); }
g = two(); { const p = g.players[0]; p.pos = 9; p.jail = 2; p.car = true; Math.random = () => 0.5; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(p.jail, 0); assert.equal(p.pos, 17); }
// Olika tärningar: kvar, ett år mindre.
g = two(); { const p = g.players[0]; p.pos = 9; p.jail = 2; const q = [0, 0.5]; let i = 0; Math.random = () => q[i++ % 2]; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(p.jail, 1); assert.equal(p.pos, 9); assert.equal(g.stage, 'post'); }
// Händelser skapas för utdelning.
g = two(); { const p = g.players[0]; g.shares[0].owner = 'a'; p.pos = 3; Math.random = () => 0; const n = g.eventNo; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.ok(g.eventNo > n); assert.match(g.events[g.events.length - 1].text, /aktieutdelning/); }
// Ett lån per omgång och högst tre lån. Spärren släpper först när spelarens egen tur kommer igen.
g = two(); G.apply(g, 'a', { type: 'loan' }); rejects(g, 'a', { type: 'loan' }, /ett lån per omgång/); assert.equal(g.players[0].loans, 1);
{ const nextA = () => { g.stage = 'post'; G.apply(g, 'a', { type: 'end' }); g.stage = 'post'; G.apply(g, 'b', { type: 'end' }); g.stage = 'post'; G.apply(g, 'c', { type: 'end' }); }; nextA(); assert.equal(g.current, 0); G.apply(g, 'a', { type: 'loan' }); nextA(); G.apply(g, 'a', { type: 'loan' }); assert.equal(g.players[0].loans, 3); nextA(); rejects(g, 'a', { type: 'loan' }, /tre lån/); }
// Dragningen sparar tärningar, vinnare och priser. Obligationer utan ägare visas utan vinnare.
g = two(); g.players[0].pos = 41; g.bonds[2] = 'a'; g.bonds[12] = 'c'; Math.random = () => 0; G.apply(g, 'a', { type: 'roll' }); G.apply(g, 'a', { type: 'skipBond' }); Math.random = orig;
assert.deepEqual(g.lastDraw.dice, [1, 1]); assert.deepEqual(g.lastDraw.results.map((r) => [r.num, r.prize, r.winner]), [[2, 50000, 'A'], [1, 25000, null], [12, 15000, 'C']]);
// Nya kort: drar ett bestämt Börstips eller en Finanstidning.
const D = require('../public/data.js');
const tip = (g, match) => { const i = D.BORSTIPS.findIndex(match); g.tipDeck = [i, ...g.tipDeck.filter((v) => v !== i)]; };
const news = (g, match) => { const i = D.FINANS.findIndex(match); g.newsDeck = [i, ...g.newsDeck.filter((v) => v !== i)]; };
const landOn = (g, pos, die = 0) => { g.players[g.current].pos = pos - 1; Math.random = () => die; G.apply(g, g.players[g.current].id, { type: 'roll' }); Math.random = orig; };
assert.equal(D.BORSTIPS.length, 62); assert.equal(D.BORSTIPS.filter((c) => c.t === 'bondwin').length, 1); assert.equal(D.BORSTIPS.filter((c) => c.t === 'back').length, 1); assert.equal(D.BORSTIPS.filter((c) => c.t === 'forward').length, 1); assert.equal(D.FINANS.length, 40);
g = two(); g.bonds[1] = 'b'; { const c = g.players[1].cash; tip(g, (c) => c.t === 'bondwin' && c.n === 1); landOn(g, 2); assert.equal(g.players[1].cash, c + 10000); assert.equal(g.bonds[1], null); }
g = two(); tip(g, (c) => c.t === 'smalldraw'); landOn(g, 2); assert.equal(g.bondRound.draw, 'small');
g = two(); tip(g, (c) => c.t === 'back'); landOn(g, 2); assert.equal(g.players[0].pos, 54);
g = two(); tip(g, (c) => c.t === 'forward'); landOn(g, 2); assert.equal(g.players[0].pos, 4);
g = two(); tip(g, (c) => c.t === 'goto' && c.to === 21); landOn(g, 2); assert.equal(g.players[0].pos, 21);
g = two(); tip(g, (c) => c.t === 'visit'); landOn(g, 2); assert.equal(g.players[0].pos, 35); assert.equal(g.stage, 'bonus');
g = two(); g.plots[10].owner = 'a'; tip(g, (c) => c.t === 'visit'); landOn(g, 2); assert.equal(g.stage, 'visit'); G.apply(g, 'a', { type: 'visit', n: 10 }); assert.equal(g.players[0].pos, 10); assert.equal(g.stage, 'post');
// Stegkort kan gå in i banken: framåt förbi Bankentré och bakåt från Bankutgång.
{ const saved = D.SQUARES[34]; D.SQUARES[34] = { kind: 'bor', name: 'Test' }; g = two(); tip(g, (c) => c.t === 'forward'); landOn(g, 34); D.SQUARES[34] = saved; assert.equal(g.players[0].pos, 36); assert.equal(g.players[0].lapDone, true); assert.equal(g.stage, 'bonus'); const c = g.players[0].cash; const sh = g.shares[0]; sh.owner = 'a'; Math.random = () => 0; G.apply(g, 'a', { type: 'bonus' }); Math.random = orig; assert.equal(g.players[0].cash, c + 20000 + 12500); assert.equal(g.stage, 'post'); }
g = two(); tip(g, (c) => c.t === 'gain'); tip(g, (c) => c.t === 'back'); landOn(g, 48); assert.equal(g.players[0].pos, 46);
// Frikort sparas, tas ur kortleken och kan användas för att slippa fängelset.
g = two(); { const i = D.BORSTIPS.findIndex((c) => c.t === 'jailfree'); const p = g.players[0]; tip(g, (c) => c.t === 'jailfree'); landOn(g, 2); assert.equal(p.jailFree.length, 1); assert.ok(!g.tipDeck.includes(i));
  g.stage = 'post'; G.apply(g, 'a', { type: 'end' }); g.stage = 'post'; G.apply(g, 'b', { type: 'end' }); g.stage = 'post'; G.apply(g, 'c', { type: 'end' });
  landOn(g, 30); assert.equal(g.stage, 'sentence'); G.apply(g, 'a', { type: 'useJailFree' }); assert.equal(p.pos, 30); assert.equal(p.jail, 0); assert.equal(p.jailFree.length, 0); assert.ok(g.tipDeck.includes(i)); assert.equal(g.stage, 'post'); }
// Överlämning går till föregående spelare, och kompletta grupper är skyddade.
g = two(); g.plots[10].owner = 'a'; tip(g, (c) => c.t === 'handover'); landOn(g, 2); assert.equal(g.stage, 'handover'); G.apply(g, 'a', { type: 'handover', kind: 'plot', n: 10 }); assert.equal(g.plots[10].owner, 'c');
g = two(); [1, 3].forEach((n) => { g.plots[n].owner = 'a'; }); g.shares.filter((v) => v.group === 'S').forEach((v) => { v.owner = 'a'; }); tip(g, (c) => c.t === 'handover'); landOn(g, 2); assert.equal(g.stage, 'post');
// Finanstidningar: byggstopp, dubbel hyra och ombyggnad.
g = two(); g.players[0].pos = 17; g.plots[10].owner = 'a'; g.news = { type: 'buildstop' }; rejects(g, 'a', { type: 'build', n: 10 }, /Byggstopp/);
g = two(); { g.plots[10].owner = 'b'; g.news = { type: 'double', group: 'F' }; const c = g.players[0].cash; landOn(g, 10); assert.equal(g.players[0].cash, c - 8000); }
g = two(); { g.players[1].pos = 41; g.players[2].pos = 12; news(g, (c) => c.t === 'rebuild'); landOn(g, 6); assert.equal(g.players[1].pos, 48); assert.equal(g.players[2].pos, 12); }
g = two(); news(g, (c) => c.t === 'double' && c.group === 'I'); landOn(g, 6); assert.equal(g.news.group, 'I');
// Turen går vidare automatiskt, men väntar in gratifikation, köp av obligation och skulder.
const auto = () => G.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
g = auto(); landOn(g, 1); assert.equal(g.current, 1); assert.equal(g.stage, 'pre');
g = auto(); landOn(g, 35); assert.equal(g.current, 0); assert.equal(g.stage, 'bonus'); Math.random = () => 0; G.apply(g, 'a', { type: 'bonus' }); Math.random = orig; assert.equal(g.current, 1);
g = auto(); landOn(g, 42); assert.equal(g.current, 0); assert.ok(g.bondRound); G.apply(g, 'a', { type: 'skipBond' }); assert.equal(g.current, 1);
g = auto(); g.plots[10].owner = 'b'; g.players[0].cash = 0; landOn(g, 10); assert.equal(g.current, 0); assert.equal(g.debts.length, 1); G.apply(g, 'a', { type: 'loan' }); assert.equal(g.current, 1);
g = auto(); { const p = g.players[0]; p.car = true; p.pos = 1; Math.random = () => 0; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(g.current, 0); assert.equal(g.stage, 'pre'); }
g = auto(); { const p = g.players[0]; p.pos = 9; p.jail = 2; const q = [0, 0.5]; let i = 0; Math.random = () => q[i++ % 2]; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(g.current, 1); }
// Bygglov sparas och kan användas en gång var som helst, före kastet.
g = two(); { const i = D.BORSTIPS.findIndex((c) => c.t === 'permit'); const p = g.players[0]; g.plots[10].owner = 'a'; g.plots[13].owner = 'a'; tip(g, (c) => c.t === 'permit'); landOn(g, 2); assert.equal(p.permits.length, 1); assert.ok(!g.tipDeck.includes(i));
  g.stage = 'pre'; p.pos = 3; const c = p.cash; G.apply(g, 'a', { type: 'build', n: 10 }); assert.equal(g.plots[10].built, true); assert.equal(p.cash, c - 25000); assert.equal(p.permits.length, 0); assert.ok(g.tipDeck.includes(i)); rejects(g, 'a', { type: 'build', n: 13 }, /inte bygga här/); }
// Goda tider: dubbla steg. Dåliga tider: två tärningar, den lägsta gäller.
g = two(); { const p = g.players[0]; p.pos = 1; g.news = { type: 'good' }; Math.random = () => 0.5; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(p.pos, 9); }
g = two(); { const p = g.players[0]; p.pos = 2; g.news = { type: 'good' }; p.car = true; const q = [0, 0.5]; let i = 0; Math.random = () => q[i++ % 2]; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(p.pos, 12); }
g = two(); { const p = g.players[0]; p.pos = 1; g.news = { type: 'bad' }; const q = [0.99, 0.2]; let i = 0; Math.random = () => q[i++ % 2]; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(g.lastRoll.dice.length, 2); assert.equal(p.pos, 3); }
g = two(); { const p = g.players[0]; p.pos = 30; g.news = { type: 'good' }; Math.random = () => 0.99; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(p.pos, 35); }
// Nya kort: per tomt, minst kontanter, vattenskada, bilstöld och Bankutgång.
g = two(); { const p = g.players[0]; g.plots[10].owner = 'a'; g.plots[13].owner = 'a'; const c = p.cash; tip(g, (x) => x.t === 'perplot'); landOn(g, 2); assert.equal(p.cash, c + 6000); }
g = two(); { g.players[2].cash = 100; tip(g, (x) => x.t === 'poorest'); landOn(g, 2); assert.equal(g.players[2].cash, 30100); }
g = two(); { const p = g.players[0]; g.plots[10].owner = 'a'; g.plots[10].built = true; g.plots[13].owner = 'a'; const c = p.cash; tip(g, (x) => x.t === 'perbuild' && x.a === 5000); landOn(g, 2); assert.equal(p.cash, c - 5000); }
g = two(); { const p = g.players[0]; p.car = true; const i = D.BORSTIPS.findIndex((x) => x.t === 'carloss'); g.tipDeck = [i, ...g.tipDeck.filter((v) => v !== i)]; p.pos = 49; const q = [0, 0.2]; let k = 0; Math.random = () => q[k++ % 2]; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(p.pos, 52); assert.equal(p.car, false); }
g = two(); { const p = g.players[0]; p.loans = 1; const c = p.cash; const before = g.tipDeck.length; tip(g, (x) => x.t === 'toexit'); landOn(g, 2); assert.equal(p.pos, 48); assert.equal(p.cash, c - 10000); assert.equal(g.tipDeck.length, before); assert.equal(g.stage, 'post'); }
g = two(); { const p = g.players[0]; p.cash = 100000; tip(g, (x) => x.t === 'audit'); landOn(g, 2); assert.equal(p.cash, 95000); }
// Hyresfrihet ger ett val när hyra ska betalas.
g = two(); { const p = g.players[0]; const i = D.BORSTIPS.findIndex((x) => x.t === 'rentfree'); p.rentFree = [i]; g.tipDeck = g.tipDeck.filter((v) => v !== i); g.plots[10].owner = 'b'; const c = p.cash; landOn(g, 10); assert.equal(g.stage, 'rentchoice'); G.apply(g, 'a', { type: 'useRentFree' }); assert.equal(p.cash, c); assert.equal(p.rentFree.length, 0); assert.ok(g.tipDeck.includes(i)); assert.equal(g.stage, 'post'); }
g = two(); { const p = g.players[0]; p.rentFree = [3]; g.plots[10].owner = 'b'; const c = p.cash; landOn(g, 10); G.apply(g, 'a', { type: 'payRent' }); assert.equal(p.cash, c - 4000); assert.equal(p.rentFree.length, 1); }
// Köptips: en gång var som helst, men inte på första varvet.
g = two(); { const p = g.players[0]; const i = D.BORSTIPS.findIndex((x) => x.t === 'tradepass'); p.tradePass = [i]; g.tipDeck = g.tipDeck.filter((v) => v !== i); p.pos = 3; rejects(g, 'a', { type: 'buyPlot', n: 10 }, /första varvet/); p.lapDone = true; G.apply(g, 'a', { type: 'buyPlot', n: 10 }); assert.equal(g.plots[10].owner, 'a'); assert.equal(p.tradePass.length, 0); rejects(g, 'a', { type: 'buyShare', id: 'A0' }, /banken/); }
// Nya Finanstidningar.
g = two(); { g.plots[10].owner = 'b'; g.news = { type: 'rentcontrol' }; const c = g.players[0].cash; landOn(g, 10); assert.equal(g.players[0].cash, c - 2000); }
g = two(); { g.plots[10].owner = 'b'; g.plots[10].built = true; g.news = { type: 'shortage' }; const c = g.players[0].cash; landOn(g, 10); assert.equal(g.players[0].cash, c - 32000); }
g = two(); { g.plots[10].owner = 'b'; g.news = { type: 'shortage' }; const c = g.players[0].cash; landOn(g, 10); assert.equal(g.players[0].cash, c - 4000); }
g = two(); g.news = { type: 'creditstop' }; rejects(g, 'a', { type: 'loan' }, /Kreditstopp/);
g = two(); { const p = g.players[0]; p.lapDone = true; p.pos = 12; g.shares[0].owner = null; g.shares[1].owner = 'a'; g.news = { type: 'stockclose' }; rejects(g, 'a', { type: 'buyShare', id: g.shares[0].id }, /Börsen/); rejects(g, 'a', { type: 'sellShare', id: g.shares[1].id }, /Börsen/); G.apply(g, 'a', { type: 'buyPlot', n: 10 }); }
g = two(); { const p = g.players[0]; p.cash = 0; g.shares[1].owner = 'a'; g.news = { type: 'stockclose' }; g.debts.push({ from: 'a', to: null, amount: 100, why: 'test' }); G.apply(g, 'a', { type: 'sellShare', id: g.shares[1].id }); assert.equal(g.shares[1].owner, null); }
for (const [t, want] of [['divup', 25000], ['divdown', 6250]]) { g = two(); const p = g.players[0]; g.shares[0].owner = 'a'; g.news = { type: t }; const c = p.cash; landOn(g, 4); assert.equal(p.cash, c + want); }
g = two(); { const p = g.players[0]; p.car = true; p.pos = 1; g.news = { type: 'fuel' }; Math.random = () => 0.2; G.apply(g, 'a', { type: 'roll' }); Math.random = orig; assert.equal(g.lastRoll.dice.length, 1); assert.equal(p.pos, 3); }
console.log('Alla regeltester klara');
// Alla kort har en egen visning med rubrik och effekt.
{ const D = require('../public/data.js'); const view = require('../public/cards.js');
  for (const c of D.BORSTIPS.concat(D.FINANS)) { const v = view(c.x); assert.ok(v.d && v.e && v.h, 'Kort saknar visning: ' + c.x); } }
// It-Säkerhet AB: betala 5 000, eller slå. 3 eller lägre kostar 15 000, 4 eller högre klarar sig.
{ const it = () => { const q = two(); q.players[0].pos = 32; const o = Math.random; Math.random = () => 0; G.apply(q, 'a', { type: 'roll' }); Math.random = o; assert.equal(q.players[0].pos, 33); assert.equal(q.stage, 'itsec'); return q; };
  rejects(it(), 'a', { type: 'end' }, /./);
  let q = it(); let c = q.players[0].cash; G.apply(q, 'a', { type: 'itPay' }); assert.equal(q.players[0].cash, c - 5000); assert.equal(q.stage, 'post');
  for (const [r, cost] of [[0.45, 15000], [0.5, 0], [0, 15000], [0.99, 0]]) { q = it(); c = q.players[0].cash; const o = Math.random; Math.random = () => r; G.apply(q, 'a', { type: 'itRoll' }); Math.random = o; assert.equal(q.players[0].cash, c - cost); assert.equal(q.stage, 'post'); }
  q = it(); rejects(q, 'a', { type: 'roll' }, /./); }
// Pengaregn bara när man landar på en utdelningsruta och faktiskt får pengar.
{ const roll = (q, pos) => { q.players[0].pos = pos; const o = Math.random; Math.random = () => 0; G.apply(q, 'a', { type: 'roll' }); Math.random = o; };
  let q = two(); roll(q, 3); assert.equal(q.lastRain, undefined);
  q = two(); q.shares[0].owner = 'a'; roll(q, 3); assert.equal(q.players[0].pos, 4); assert.deepEqual(q.lastRain, { id: 1, player: 'a', pos: 4 }); }
// Köp av bil visas bara en sekund.
{ const q = two(); q.players[0].cash = 100000; G.apply(q, 'a', { type: 'buyCar' }); assert.equal(q.events[q.events.length - 1].ms, 1000); }
// Lika ut ur fängelset ger nytt kast och räknas som det första av tre.
{ const q = two(); const p = q.players[0]; p.pos = 9; p.jail = 2; p.car = true; const o = Math.random; Math.random = () => 0.2; G.apply(q, 'a', { type: 'roll' }); assert.equal(p.jail, 0); assert.equal(p.pos, 13); assert.equal(q.doubles, 1); assert.equal(q.stage, 'pre'); assert.equal(q.current, 0);
  p.cash = 500000; Object.keys(q.plots).forEach((n) => { q.plots[n].owner = null; }); Math.random = () => 0.2; G.apply(q, 'a', { type: 'roll' }); assert.equal(q.doubles, 2); assert.equal(q.stage, 'pre'); q.players[0].pos = 1; G.apply(q, 'a', { type: 'roll' }); Math.random = o; assert.equal(p.pos, 9); assert.equal(q.stage, 'sentence'); }
// Utan bil får man också slå igen, men nästa kast är en tärning och kan inte bli lika.
{ const q = two(); const p = q.players[0]; p.pos = 9; p.jail = 1; const o = Math.random; Math.random = () => 0.5; G.apply(q, 'a', { type: 'roll' }); assert.equal(q.stage, 'pre'); G.apply(q, 'a', { type: 'roll' }); Math.random = o; assert.equal(q.doubles, 1); assert.notEqual(q.stage, 'pre'); }
// Industrikoncernens aktier ger 50 %: 150 000 kr ger 75 000 kr och 75 000 kr ger 37 500 kr.
{ const q = two(); const ind = q.shares.filter((x) => x.group === 'I'); assert.deepEqual(ind.map((x) => x.value), [150000, 75000, 75000]); assert.ok(ind.every((x) => x.pct === 50)); ind[0].owner = 'a'; ind[1].owner = 'a'; const p = q.players[0], c = p.cash; p.pos = 3; const o = Math.random; Math.random = () => 0; G.apply(q, 'a', { type: 'roll' }); Math.random = o; assert.equal(p.cash, c + 112500); }
// Hantverkshuset och Servicekompaniet har tre aktier, varav en fondaktie på 20 000 kr med 20 %.
{ const q = two(); for (const k of ['H', 'S']) { const v = q.shares.filter((x) => x.group === k); assert.deepEqual(v.map((x) => x.value), [50000, 25000, 20000]); assert.deepEqual(v.map((x) => x.pct), [25, 25, 20]); } const f = q.shares.find((x) => x.value === 20000); f.owner = 'a'; const p = q.players[0], c = p.cash; p.pos = 3; const o = Math.random; Math.random = () => 0; G.apply(q, 'a', { type: 'roll' }); Math.random = o; assert.equal(p.cash, c + 4000); }
// Fondaktien säljs för hela köpesumman, andra aktier för 75 %.
{ const q = two(); const p = q.players[0]; const f = q.shares.find((x) => x.value === 20000); f.owner = 'a'; const c = p.cash; G.apply(q, 'a', { type: 'sellShare', id: f.id }); assert.equal(p.cash, c + 20000); const a50 = q.shares.find((x) => x.value === 50000); a50.owner = 'a'; const c2 = p.cash; G.apply(q, 'a', { type: 'sellShare', id: a50.id }); assert.equal(p.cash, c2 + 37500); }
// Börstips: gratis fondaktie, och inget när alla redan är utdelade.
{ const q = two(); tip(q, (x) => x.t === 'fundshare'); landOn(q, 2); assert.equal(q.shares.filter((x) => x.value === 20000 && x.owner === 'a').length, 1); const r = two(); r.shares.filter((x) => x.value === 20000).forEach((x) => { x.owner = 'b'; }); tip(r, (x) => x.t === 'fundshare'); landOn(r, 2); assert.equal(r.shares.filter((x) => x.value === 20000 && x.owner === 'a').length, 0); }
// Kursras och börskrasch: alla spelares aktier med rätt procent går tillbaka till banken utan ersättning.
for (const pct of [30, 40]) { const q = two(); q.shares.forEach((x, i) => { x.owner = ['a', 'b', 'c'][i % 3]; }); const cash = q.players.map((p) => p.cash); tip(q, (x) => x.t === 'sharecrash' && x.pct === pct); landOn(q, 2); assert.equal(q.shares.filter((x) => x.pct === pct && x.owner).length, 0); assert.ok(q.shares.filter((x) => x.pct !== pct && x.owner).length > 0); assert.deepEqual(q.players.map((p) => p.cash), cash); }
// Rutan efter Bankutgång är nr 1 och Bankutgång är sist. Numren täcker 1 till 54 exakt en gång.
{ const n = D.displayNo; assert.equal(n(49), 1); assert.equal(n(54), 6); assert.equal(n(1), 7); assert.equal(n(21), 27); assert.equal(n(48), 54); const all = new Set(); for (let i = 1; i <= 54; i++) all.add(n(i)); assert.equal(all.size, 54); assert.equal(Math.min(...all), 1); assert.equal(Math.max(...all), 54); }
// Skatteverket: 10 % av kontanterna, högst 50 000 kr. Avrundas nedåt till hela 500-lappar.
{ const D2 = require('../public/data.js'); assert.equal(D2.SQUARES[20].kind, 'tax'); assert.equal(D2.displayNo(20), 26); assert.equal(D2.SQUARES[26].kind, 'news');
  for (const [cash, want] of [[100000, 10000], [1000000, 50000], [12300, 1000], [400, 0]]) { const q = two(); const p = q.players[0]; p.cash = cash; p.pos = 19; const o = Math.random; Math.random = () => 0; G.apply(q, 'a', { type: 'roll' }); Math.random = o; assert.equal(p.pos, 20); assert.equal(p.cash, cash - want); } }
// Återlämna en tomt: spelaren väljer, ingen ersättning, byggnaden följer med.
{ const q = two(); const p = q.players[0]; q.plots[5] = { owner: 'a', built: true, mort: false }; q.plots[7].owner = 'a'; const c = p.cash; tip(q, (x) => x.t === 'returnplot'); landOn(q, 2); assert.equal(q.stage, 'returnplot'); rejects(q, 'a', { type: 'roll' }, /./); rejects(q, 'a', { type: 'returnplot', n: 10 }, /äger inte/); G.apply(q, 'a', { type: 'returnplot', n: 5 }); assert.equal(q.plots[5].owner, null); assert.equal(q.plots[5].built, false); assert.equal(q.plots[7].owner, 'a'); assert.equal(p.cash, c); assert.equal(q.stage, 'post'); }
{ const q = two(); tip(q, (x) => x.t === 'returnplot'); landOn(q, 2); assert.notEqual(q.stage, 'returnplot'); }
{ const q = two(); q.plots[5] = { owner: 'a', built: true, mort: false }; q.plots[1].owner = 'a'; tip(q, (x) => x.t === 'returnplot'); landOn(q, 2); assert.deepEqual(G.botAction(q, 'a', true), { type: 'returnplot', n: 1 }); }
// Fastighetsreform: alla lämnar en tomt i tur och ordning och får köpesumman, även för byggnaden. Spelare utan tomt hoppas över.
{ const q = two(); const [a, b, c] = q.players; q.plots[5] = { owner: 'a', built: true, mort: false }; q.plots[1].owner = 'c'; q.plots[3] = { owner: 'c', built: false, mort: true }; a.cash = b.cash = c.cash = 100000; const news = (g, f) => { const i = D.FINANS.findIndex(f); g.newsDeck = [i, ...g.newsDeck.filter((v) => v !== i)]; }; news(q, (x) => x.t === 'returnall'); a.pos = 5; const o = Math.random; Math.random = () => 0; G.apply(q, 'a', { type: 'roll' }); Math.random = o; assert.equal(a.pos, 6); assert.deepEqual(q.returnRound.queue, ['a', 'b', 'c']); assert.equal(G.actor(q), 'a');
  rejects(q, 'c', { type: 'returnAll', n: 1 }, /inte din tur/); G.apply(q, 'a', { type: 'returnAll', n: 5 }); assert.equal(a.cash, 100000 + 40000); assert.equal(q.plots[5].owner, null); assert.equal(q.plots[5].built, false); assert.equal(G.actor(q), 'c'); assert.deepEqual(q.returnRound.queue, ['c']);
  G.apply(q, 'c', { type: 'returnAll', n: 3 }); assert.equal(c.cash, 100000 + 12000 - D.plotInfo(3).mortgage); assert.equal(q.returnRound, null); assert.equal(q.plots[1].owner, 'c'); }
// Baisse: aktier köps och säljs för halva värdet och ingen utdelning betalas. Gäller tills nästa tidning.
{ const q = two(); const p = q.players[0]; p.lapDone = true; p.pos = 12; p.cash = 100000; q.news = { type: 'baisse' }; const a100 = q.shares.find((x) => x.value === 50000); G.apply(q, 'a', { type: 'buyShare', id: a100.id }); assert.equal(p.cash, 75000); G.apply(q, 'a', { type: 'sellShare', id: a100.id }); assert.equal(p.cash, 100000); const f = q.shares.find((x) => x.value === 20000); f.owner = 'a'; G.apply(q, 'a', { type: 'sellShare', id: f.id }); assert.equal(p.cash, 110000);
  const r = two(); const rp = r.players[0]; r.news = { type: 'baisse' }; r.shares[0].owner = 'a'; const c = rp.cash; rp.pos = 3; const o = Math.random; Math.random = () => 0; G.apply(r, 'a', { type: 'roll' }); Math.random = o; assert.equal(rp.pos, 4); assert.equal(rp.cash, c); assert.equal(r.lastRain, undefined); const card = D.FINANS.find((x) => x.t === 'baisse'); assert.ok(card && card.until); }
// Banken säger upp ett lån: 50 000 kr direkt om man har lån, annars inget.
{ const q = two(); const p = q.players[0]; p.loans = 2; p.cash = 80000; tip(q, (x) => x.t === 'loancall'); landOn(q, 2); assert.equal(p.loans, 1); assert.equal(p.cash, 30000); const r = two(); const c = r.players[0].cash; tip(r, (x) => x.t === 'loancall'); landOn(r, 2); assert.equal(r.players[0].cash, c); assert.equal(r.players[0].loans, 0); }
// Räntan är 10 000 kr per lån vid Bankutgång.
{ const q = two(); const p = q.players[0]; p.loans = 2; p.cash = 100000; tip(q, (x) => x.t === 'carloss'); landOn(q, 48); assert.equal(p.pos, 48); assert.equal(p.cash, 80000); }

// Polisjakten: vägen går kortaste vägen till fängelset och alla klienter får veta att den ska spelas.
{
  const { prisonRoute, chaseTime } = require('../public/data.js');
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
  eq(prisonRoute(9), [9], 'står redan i fängelset');
  eq(prisonRoute(8), [8, 9], 'ett steg framåt');
  eq(prisonRoute(12), [12, 11, 10, 9], 'kortast bakåt');
  eq(prisonRoute(53), [53, 54, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'runt över ruta 54');
  eq(prisonRoute(30).length, 22, 'från Gå direkt i fängelse');
  for (let n = 1; n <= 54; n++) { const r = prisonRoute(n); if (r[0] !== n || r[r.length - 1] !== 9 || r.length > 28) throw new Error('fel väg från ' + n); r.slice(1).forEach((v, i) => { const d = (v - r[i] + 54) % 54; if (d !== 1 && d !== 53) throw new Error('hopp i vägen från ' + n); }); if (chaseTime(r) < 1800 || chaseTime(r) > 3400) throw new Error('fel tid'); }
  const G2 = require('../game.js'); const g = G2.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
  const a = g.players[g.current]; a.pos = 29; const orig = Math.random; Math.random = () => 0; // Tärningen visar 1.
  try { G2.apply(g, a.id, { type: 'roll' }); } finally { Math.random = orig; }
  if (a.pos !== 9 || g.stage !== 'sentence') throw new Error('skulle åka i fängelse');
  eq(g.lastPrison.player, a.id, 'jakten gäller rätt spelare'); eq(g.lastPrison.route[0], 30, 'jakten börjar på rutan'); eq(g.lastPrison.route[g.lastPrison.route.length - 1], 9, 'jakten slutar i fängelset');
  console.log('Polisjakten klar');
}
