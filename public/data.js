// Allt speldata samlat. Ändra namn, priser och korttexter här.
// Delas av servern och webbläsaren.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GAME_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const GAME_NAME = 'Finans'; // Byt till ett eget namn innan publik lansering, se README.

  const GROUPS = {
    H: { name: 'Hantverkshuset', color: '#92400e', text: '#fff', plot: 10000, build: 10000, rent: 1500, rentBuilt: 6000, shares: [50000, 50000, 25000] },
    S: { name: 'Servicekompaniet', color: '#fb923c', text: '#1a1740', plot: 12000, build: 12000, rent: 2000, rentBuilt: 8000, shares: [25000, 25000] },
    A: { name: 'Affärscentrum', color: '#be185d', text: '#fff', plot: 20000, build: 20000, rent: 3000, rentBuilt: 12000, shares: [75000, 50000, 50000] },
    F: { name: 'Finanstrusten', color: '#2563eb', text: '#fff', plot: 25000, build: 25000, rent: 4000, rentBuilt: 16000, shares: [75000, 75000, 50000] },
    T: { name: 'Teknikföretagen', color: '#0f766e', text: '#fff', plot: 30000, build: 30000, rent: 5000, rentBuilt: 20000, shares: [100000, 75000, 50000] },
    K: { name: 'Kemibolaget', color: '#7c3aed', text: '#fff', plot: 40000, build: 40000, rent: 7000, rentBuilt: 28000, shares: [100000, 75000, 75000], industry: true },
    I: { name: 'Industrikoncernen', color: '#dc2626', text: '#fff', plot: 50000, build: 50000, rent: 9000, rentBuilt: 36000, shares: [100000, 100000, 75000], industry: true },
  };
  // Utdelning i procent per aktievärde: billiga aktier ger mindre.
  const sharePct = (v) => (v >= 100000 ? 40 : v >= 75000 ? 30 : 25);

  const plot = (name, group) => ({ kind: 'plot', name, group });
  const BOR = { kind: 'bor', name: 'Börstips' };
  const NEWS = { kind: 'news', name: 'Finanstidning' };
  const DIV = { kind: 'div', name: 'Aktieutdelning' };

  // Rutorna 1-53. Spelet går i nummerordning. 34 = in i banken, 47 = ut ur banken.
  const SQUARES = {
    1: plot('Bilverkstad', 'S'), 2: BOR, 3: plot('Tvätteri', 'S'), 4: DIV, 5: plot('Bokhandel', 'A'),
    6: NEWS, 7: plot('Möbelaffär', 'A'), 8: plot('Livsmedelsbutik', 'A'),
    9: { kind: 'prison', name: 'Fängelse' },
    10: plot('Kontorshus', 'F'), 11: BOR, 12: { kind: 'branch', name: 'Bankfilial', sub: 'köp tomt och aktie' },
    13: plot('Försäkringsbolag', 'F'), 14: NEWS, 15: plot('Mäklarfirma', 'F'), 16: DIV,
    17: { kind: 'buildsq', name: 'Byggprojekt AB', sub: 'bygg här' }, 18: plot('Elektronikfirma', 'T'), 19: BOR,
    20: NEWS, 21: plot('Datakonsult', 'T'), 22: plot('Ingenjörsbyrå', 'T'), 23: BOR,
    24: plot('Plastfabrik', 'K'), 25: plot('Bensinbolag', 'K'), 26: NEWS, 27: plot('Raffinaderi', 'K'), 28: BOR, 29: DIV,
    30: { kind: 'gotoprison', name: 'Gå direkt i fängelse' },
    31: plot('Sågverk', 'I'), 32: plot('Pappersbruk', 'I'), 33: plot('Järnverk', 'I'),
    34: { kind: 'entry', name: 'Bankentré', sub: 'gratifikation' },
    35: DIV, 36: BOR, 37: NEWS,
    38: { kind: 'repay', name: 'Återbetala ett av dina lån' },
    39: { kind: 'give', name: 'Ge motspelarna 20 % utdelning' },
    40: { kind: 'buildsq', name: 'Banken förmedlar byggnadsaffärerna' },
    41: { kind: 'lilla', name: 'Lilla obligationsdragningen' },
    42: BOR, 43: NEWS, 44: DIV, 45: BOR,
    46: { kind: 'bonddiv', name: 'Aktieutdelning och obligationsköp' },
    47: { kind: 'exit', name: 'Bankutgång', sub: 'start, börstips' },
    48: plot('Snickeri', 'H'), 49: NEWS, 50: plot('Smedja', 'H'), 51: BOR,
    52: { kind: 'lilla', name: 'Lilla obligationsdragningen' },
    53: plot('Skrädderi', 'H'),
  };

  // Egna korttexter. Inga originaltexter är kopierade.
  const TIPS = [
    { t: 'gain', a: 10000, x: 'Lyckad affär i utlandet. Du får 10 000 kr.' },
    { t: 'gain', a: 15000, x: 'Din konsultfirma går med vinst. Du får 15 000 kr.' },
    { t: 'gain', a: 20000, x: 'Du säljer en patentidé. Du får 20 000 kr.' },
    { t: 'gain', a: 5000, x: 'Skatteåterbäring! Du får 5 000 kr.' },
    { t: 'lose', a: 5000, x: 'Revisorn skickar räkningen. Betala 5 000 kr.' },
    { t: 'lose', a: 10000, x: 'En felinvestering. Betala 10 000 kr.' },
    { t: 'lose', a: 15000, x: 'Böter för sen årsredovisning. Betala 15 000 kr.' },
    { t: 'dividend', x: 'Bolagen går bra. Du får aktieutdelning.' },
    { t: 'dividend', x: 'Extra utdelning från banken på dina aktier.' },
    { t: 'give', x: 'Ge dina motspelare 20 % utdelning på aktier i grupper där du har tomter.' },
    { t: 'goto', to: 34, x: 'Bråttom till mötet! Gå till Bankentré.' },
    { t: 'goto', to: 12, x: 'Gå till Bankfilialen.' },
    { t: 'goto', to: 17, x: 'Gå till Byggprojekt AB.' },
    { t: 'freebuild', x: 'Bygglov beviljat! Du får bygga en gång när du vill, före ditt kast.' },
    { t: 'news', x: 'Något stort är på gång. Ta en Finanstidning.' },
    { t: 'prison', x: 'Skatteverket vill prata. Gå till Fängelset.' },
    { t: 'car', a: 5000, x: 'Bilen behöver service. Bilägare betalar 5 000 kr.' },
    { t: 'collect', a: 5000, x: 'Du fyller år. Varje motspelare ger dig 5 000 kr.' },
    { t: 'perbuild', a: 2000, x: 'Fastighetsunderhåll. Betala 2 000 kr per byggnad.' },
    { t: 'gain', a: 25000, x: 'Ett arv från en okänd släkting. Du får 25 000 kr.' },
  ];
  const BORSTIPS = TIPS.concat(TIPS); // 40 kort
  const FINANS = [].concat(
    Array(3).fill({ t: 'good', until: true, x: 'Goda tider! Gratifikationen fördubblas och utdelningsrutan gäller alla. Gäller tills nästa tidning.' }),
    Array(3).fill({ t: 'bad', until: true, x: 'Dåliga tider! Vid Bankentré räknas bara den lägsta tärningen. Gäller tills nästa tidning.' }),
    Array(2).fill({ t: 'largedraw', x: 'Stora obligationsdragningen! Alla får köpa en obligation före dragningen.' }),
    Array(3).fill({ t: 'alldiv', x: 'Hausse på börsen! Alla spelare får aktieutdelning.' }),
    Array(2).fill({ t: 'inflation', x: 'Inflation och kursfall! Alla betalar 10 % av sitt aktiekapital.' }),
    Array(2).fill({ t: 'proptax', x: 'Ny fastighetsskatt! Alla betalar 1 000 kr per tomt och 3 000 kr per byggnad.' }),
    Array(2).fill({ t: 'boom', x: 'Byggboom! Alla får 5 000 kr per byggnad.' }),
    Array(2).fill({ t: 'rate', x: 'Räntehöjning! Alla betalar 5 000 kr per banklån.' }),
    Array(2).fill({ t: 'grant', x: 'Företagsstöd! Alla spelare får 10 000 kr.' })
  );

  const RULES = {
    startCash: 75000, carPrice: 50000, carSell: 25000, loan: 50000, loanInterest: 5000, maxLoans: 3, bankLoans: 6,
    bondPrice: 500, bonusPerPip: 5000, largeDraw: [100000, 50000, 25000], smallDraw: [50000, 25000, 15000],
    redeemPct: 1.1, givePct: 0.2, target: 1000000, feeMin: 30000, feeMax: 120000, feeBank: 30000, groupsToWin: 0, maxDoubles: 3,
  };
  const round500 = (v) => Math.round(v / 500) * 500;
  const plotInfo = (n) => {
    const s = SQUARES[n]; const g = GROUPS[s.group];
    return { price: g.plot, build: g.build, rent: g.rent, rentBuilt: g.rentBuilt,
      mortgage: round500(g.plot * 0.5), mortgageBuilt: round500((g.plot + g.build) * 0.5),
      sell: round500(g.plot * 0.75), sellBuilt: round500(g.plot * 0.75 + g.build * 0.5) };
  };
  return { GAME_NAME, GROUPS, SQUARES, BORSTIPS, FINANS, RULES, sharePct, plotInfo };
});
