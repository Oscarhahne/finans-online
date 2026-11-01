// Spelar hela partier med datorspelare och letar efter fel och ogiltiga tillstånd.
const G = require('../game.js');
const N = Number(process.argv[2] || 500);
let wins = 0; let stuck = 0; const turns = [];
for (let i = 0; i < N; i++) {
  const n = 2 + (i % 5);
  const g = G.newGame([...Array(n).keys()].map((k) => ({ id: 'p' + k, name: 'P' + k, bot: true })));
  let steps = 0;
  while (g.phase === 'play' && steps < 200000) {
    const id = G.actor(g);
    G.apply(g, id, G.botAction(g, id, false));
    for (const p of g.players) {
      if (!Number.isFinite(p.cash) || p.cash < 0) throw new Error('Ogiltig kassa ' + p.cash);
      if (p.pos < 1 || p.pos > 53) throw new Error('Ogiltig ruta ' + p.pos);
      if (p.loans > 3) throw new Error('För många lån');
    }
    if (g.players.reduce((a, p) => a + p.loans, 0) > 6) throw new Error('Banken har lånat ut för mycket');
    steps++;
  }
  if (g.phase === 'over') { wins++; turns.push(g.turnNo); } else stuck++;
}
turns.sort((a, b) => a - b);
console.log(`Partier ${N}, avgjorda ${wins}, ej avgjorda ${stuck}, drag i mitten ${turns[turns.length >> 1]}`);
if (stuck > N * 0.05) process.exit(1);
