// Stämmer motorn med de viktigaste reglerna?
const assert = require('assert');
const G = require('../game.js');
const two = () => G.newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]);
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
g = two(); const [A, B, C] = g.players; A.lapDone = true; A.pos = 40; A.cash = 500000; B.cash = 0; C.cash = 0;
g.plots[5] = { owner: 'b', built: true, mort: false }; g.plots[7].owner = 'a'; g.plots[8].owner = 'a';
g.shares.find((s) => s.id === 'A0').owner = 'a'; g.shares.find((s) => s.id === 'A1').owner = 'b'; g.shares.find((s) => s.id === 'A2').owner = 'c';
G.apply(g, 'a', { type: 'meeting', group: 'A', fee: 120000 });
assert.equal(A.cash, 500000 - 140000 - 120000); assert.equal(B.cash, 90000 + 45000); assert.equal(C.cash, 50000 + 45000);
assert.equal(g.plots[5].owner, 'a');
// Hyra fördubblas med komplett grupp.
A.cash = 100000; g.current = 1; B.pos = 4; B.cash = 100000; B.car = false; g.stage = 'pre';
const orig = Math.random; Math.random = () => 0; G.apply(g, 'b', { type: 'roll' }); Math.random = orig;
assert.equal(B.pos, 5); assert.equal(B.cash, 100000 - 24000); assert.equal(A.cash, 124000);
// Tvingad återbetalning: 50 000 + 5 000.
g = two(); g.players[0].pos = 37; g.players[0].loans = 1; g.players[0].cash = 60000; Math.random = () => 0; G.apply(g, 'a', { type: 'roll' }); Math.random = orig;
assert.equal(g.players[0].pos, 38); assert.equal(g.players[0].cash, 5000); assert.equal(g.players[0].loans, 0);
// Obligationsdragning: två fyror ger 8, 4 och 3. Två ettor ger 2, 1 och 12.
g = two(); g.players[0].pos = 40; g.bonds[2] = 'a'; g.bonds[1] = 'b'; g.bonds[12] = 'c';
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
  g = two(); const p = g.players[0]; p.pos = 33; p.cash = 0; g.news = news ? { type: news } : null; Math.random = () => 0;
  G.apply(g, 'a', { type: 'roll' }); assert.equal(p.pos, 34); assert.equal(g.stage, 'bonus'); assert.equal(p.lapDone, true);
  Math.random = () => 0.99; G.apply(g, 'a', { type: 'bonus' }); Math.random = orig; assert.equal(p.cash, want); assert.equal(g.stage, 'post');
}
// Lika tärningar in till Bankentré ger både gratifikation och nytt kast.
g = two(); { const p = g.players[0]; p.car = true; p.pos = 32; Math.random = () => 0; G.apply(g, 'a', { type: 'roll' }); assert.equal(p.pos, 34); assert.equal(g.stage, 'bonus'); G.apply(g, 'a', { type: 'bonus' }); Math.random = orig; assert.equal(g.stage, 'pre'); }
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
console.log('Alla regeltester klara');
