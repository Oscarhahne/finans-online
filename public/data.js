// Allt speldata samlat. Ändra namn, priser och korttexter här.
// Delas av servern och webbläsaren.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GAME_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const GAME_NAME = 'Finans'; // Byt till ett eget namn innan publik lansering, se README.

  const GROUPS = {
    H: { name: 'Hantverkshuset', color: '#92400e', text: '#fff', plot: 10000, build: 10000, rent: 1500, rentBuilt: 6000, shares: [50000, 25000, 20000] },
    S: { name: 'Servicekompaniet', color: '#d9480f', text: '#fff', plot: 12000, build: 12000, rent: 2000, rentBuilt: 8000, shares: [50000, 25000, 20000] },
    A: { name: 'Affärscentrum', color: '#be185d', text: '#fff', plot: 20000, build: 20000, rent: 3000, rentBuilt: 12000, shares: [100000, 75000, 75000] },
    F: { name: 'Finanstrusten', color: '#2563eb', text: '#fff', plot: 25000, build: 25000, rent: 4000, rentBuilt: 16000, shares: [100000, 75000, 75000] },
    T: { name: 'Teknikföretagen', color: '#0f766e', text: '#fff', plot: 30000, build: 30000, rent: 5000, rentBuilt: 20000, shares: [100000, 75000, 75000] },
    K: { name: 'Kemibolaget', color: '#7c3aed', text: '#fff', plot: 40000, build: 40000, rent: 7000, rentBuilt: 28000, shares: [100000, 75000, 75000], industry: true },
    I: { name: 'Industrikoncernen', color: '#dc2626', text: '#fff', plot: 50000, build: 50000, rent: 9000, rentBuilt: 36000, shares: [150000, 75000, 75000], sharePct: 50, industry: true },
  };
  // Utdelning i procent per aktievärde: billiga aktier ger mindre.
  const sharePct = (v) => (v >= 100000 ? 40 : v >= 75000 ? 30 : v >= 25000 ? 25 : 20);
  // Numret spelaren ser. Rutan efter Bankutgång är nr 1 och Bankutgång är sist. Internt behåller rutorna sina id.
  const displayNo = (n) => (n >= 49 ? n - 48 : n + 6);
  const shareName = (v) => (v === 20000 ? 'Fondaktie' : 'Aktie');
  // Fondaktien återköps för hela köpesumman, andra aktier för 75 %.
  const shareSellPrice = (v) => (v === 20000 ? v : Math.round(v * 0.75 / 500) * 500);

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
    20: { kind: 'tax', name: 'Skatteverket' }, 21: plot('Datakonsult', 'T'), 22: plot('Ingenjörsbyrå', 'T'), 23: BOR,
    24: plot('Plastfabrik', 'K'), 25: plot('Bensinbolag', 'K'), 26: NEWS, 27: plot('Raffinaderi', 'K'), 28: BOR, 29: DIV,
    30: { kind: 'gotoprison', name: 'Gå direkt i fängelse' },
    31: plot('Sågverk', 'I'), 32: plot('Pappersbruk', 'I'),
    33: { kind: 'itsec', name: 'It-Säkerhet AB' },
    34: plot('Järnverk', 'I'),
    35: { kind: 'entry', name: 'Bankentré', sub: 'gratifikation' },
    36: DIV, 37: BOR, 38: NEWS,
    39: { kind: 'repay', name: 'Återbetala ett av dina lån' },
    40: { kind: 'give', name: 'Ge motspelarna 20 % utdelning' },
    41: { kind: 'buildsq', name: 'Banken förmedlar byggnadsaffärerna' },
    42: { kind: 'lilla', name: 'Lilla obligationsdragningen' },
    43: BOR, 44: NEWS, 45: DIV, 46: BOR,
    47: { kind: 'bonddiv', name: 'Utdelning och obligation' },
    48: { kind: 'exit', name: 'Bankutgång', sub: 'start, börstips' },
    49: plot('Snickeri', 'H'), 50: NEWS, 51: plot('Smedja', 'H'), 52: BOR,
    53: { kind: 'lilla', name: 'Lilla obligationsdragningen' },
    54: plot('Skrädderi', 'H'),
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
    { t: 'goto', to: 35, x: 'Bråttom till mötet! Gå till Bankentré.' },
    { t: 'goto', to: 12, x: 'Gå till Bankfilialen.' },
    { t: 'goto', to: 17, x: 'Gå till Byggprojekt AB.' },
    { t: 'news', x: 'Något stort är på gång. Ta en Finanstidning.' },
    { t: 'prison', x: 'Skatteverket vill prata. Gå till Fängelset.' },
    { t: 'car', a: 5000, x: 'Bilen behöver service. Bilägare betalar 5 000 kr.' },
    { t: 'collect', a: 5000, x: 'Du fyller år. Varje motspelare ger dig 5 000 kr.' },
    { t: 'perbuild', a: 2000, x: 'Fastighetsunderhåll. Betala 2 000 kr per byggnad.' },
    { t: 'gain', a: 25000, x: 'Ett arv från en okänd släkting. Du får 25 000 kr.' },
  ];
  // Nya kort finns i ett exemplar var.
  const TIPS_EXTRA = [
    { t: 'bondwin', n: 1, a: 10000, x: 'Obligation nr 1 har utfallit med vinst. Ägaren inkasserar 10 000 kr.' },
    { t: 'smalldraw', x: 'Lilla obligationsdragningen! Köp en obligation, sedan sker dragningen.' },
    { t: 'back', n: 2, x: 'Du glömde portföljen. Gå 2 steg bakåt.' },
    { t: 'forward', n: 2, x: 'Bra fart i affärerna. Gå 2 steg framåt.' },
    { t: 'prison', x: 'Gå direkt i fängelse.' },
    { t: 'jailfree', x: 'Frikort! Spara kortet. Du kan använda det för att slippa fängelset.' },
    { t: 'permit', x: 'Bygglov! Spara kortet. Du kan använda det en gång för att bygga när du vill, före ditt kast.' },
    { t: 'goto', to: 12, x: 'Gå direkt till Bankfilialen.' },
    { t: 'goto', to: 21, x: 'Gå direkt till ruta 27.' },
    { t: 'visit', x: 'Besök en av dina egna tomter. Har du ingen tomt går du direkt till Bankentré.' },
    { t: 'handover', x: 'Överlämna valfri tomt eller aktie till föregående spelare.' },
    { t: 'perplot', a: 3000, x: 'Hyresgäster flyttar in. Du får 3 000 kr per tomt du äger.' },
    { t: 'poorest', a: 30000, x: 'Årets företagare! Spelaren med minst kontanter får 30 000 kr av banken.' },
    { t: 'perbuild', a: 5000, x: 'Vattenskada! Betala 5 000 kr per bebyggd tomt.' },
    { t: 'audit', pct: 5, x: 'Revision! Betala 5 % av dina kontanter till banken.' },
    { t: 'sharecrash', pct: 30, x: 'Kursras! Alla spelares 30 %-aktier blir värdelösa och går tillbaka till banken utan ersättning.' },
    { t: 'sharecrash', pct: 40, x: 'Börskrasch! Alla spelares 40 %-aktier blir värdelösa och går tillbaka till banken utan ersättning.' },
    { t: 'returnplot', x: 'Återlämna en tomt! Välj en av dina tomter som går tillbaka till banken utan ersättning.' },
    { t: 'fundshare', x: 'Gratis fondaktie! Du får en fondaktie på 20 000 kr som ger 20 % i utdelning.' },
    { t: 'carloss', x: 'Bilstöld! Har du bil förlorar du den utan ersättning.' },
    { t: 'toexit', x: 'Gå direkt till Bankutgång. Du drar inget nytt kort, men betalar eventuell låneränta.' },
    { t: 'rentfree', x: 'Hyresfrihet! Spara kortet. Du kan använda det en gång när du ska betala hyra.' },
    { t: 'tradepass', x: 'Köptips! Spara kortet. Du kan köpa en tomt eller aktie en gång var du än står, före ditt kast.' },
  ];
  const BORSTIPS = TIPS.concat(TIPS, TIPS_EXTRA);
  const FINANS = [].concat(
    Array(3).fill({ t: 'good', until: true, x: 'Goda tider! Du går dubbelt så många steg som tärningarna visar, gratifikationen räknas dubbelt och utdelningsrutan gäller alla. Gäller tills nästa tidning.' }),
    Array(3).fill({ t: 'bad', until: true, x: 'Dåliga tider! Du slår två tärningar och går efter den lägsta, och gratifikationen räknas till hälften. Gäller tills nästa tidning.' }),
    Array(3).fill({ t: 'largedraw', x: 'Stora obligationsdragningen! Alla får köpa en obligation före dragningen.' }),
    Array(3).fill({ t: 'alldiv', x: 'Hausse på börsen! Alla spelare får aktieutdelning.' }),
    Array(2).fill({ t: 'inflation', x: 'Inflation och kursfall! Alla betalar 10 % av sitt aktiekapital.' }),
    Array(2).fill({ t: 'proptax', x: 'Ny fastighetsskatt! Alla betalar 1 000 kr per tomt och 3 000 kr per byggnad.' }),
    Array(2).fill({ t: 'boom', x: 'Byggboom! Alla får 5 000 kr per byggnad.' }),
    Array(2).fill({ t: 'rate', x: 'Räntehöjning! Alla betalar 5 000 kr per banklån.' }),
    Array(2).fill({ t: 'grant', x: 'Företagsstöd! Alla spelare får 10 000 kr.' }),
    { t: 'rentcontrol', until: true, x: 'Hyresreglering! Alla hyror halveras. Gäller tills nästa tidning.' },
    { t: 'shortage', until: true, x: 'Bostadsbrist! Hyrorna fördubblas på alla bebyggda tomter. Gäller tills nästa tidning.' },
    { t: 'creditstop', until: true, x: 'Kreditstopp! Banken ger inga nya lån. Gäller tills nästa tidning.' },
    { t: 'stockclose', until: true, x: 'Börsstängning! Ingen får köpa eller sälja aktier. Gäller tills nästa tidning.' },
    { t: 'divup', until: true, x: 'Högkonjunktur på börsen! All aktieutdelning från banken fördubblas. Gäller tills nästa tidning.' },
    { t: 'divdown', until: true, x: 'Lågkonjunktur på börsen! All aktieutdelning från banken halveras. Gäller tills nästa tidning.' },
    { t: 'fuel', until: true, x: 'Bränslebrist! Bilägare slår bara en tärning. Gäller tills nästa tidning.' },
    { t: 'buildstop', until: true, x: 'Byggstopp! Ingen får bygga. Gäller tills nästa tidning.' },
    { t: 'returnall', x: 'Fastighetsreform! Alla spelare lämnar tillbaka valfri tomt till banken och får tillbaka köpesumman, även för byggnaden.' },
    { t: 'rebuild', x: 'Ombyggnad i banken! Alla som är inne i banken hamnar direkt på Bankutgång.' },
    Object.keys(GROUPS).map((k) => ({ t: 'double', group: k, until: true, x: `Högkonjunktur för ${GROUPS[k].name}! Dubbel hyra på gruppens tomter. Gäller tills nästa tidning.` }))
  );

  const RULES = {
    startCash: 75000, carPrice: 50000, carSell: 25000, loan: 50000, loanInterest: 5000, maxLoans: 3,
    bondPrice: 500, bonusPerPip: 10000, largeDraw: [100000, 50000, 25000], smallDraw: [50000, 25000, 15000],
    redeemPct: 1.1, givePct: 0.2, target: 1000000, feeMin: 30000, feeMax: 120000, feeBank: 30000, taxPct: 10, taxMax: 50000, groupsToWin: 0, maxDoubles: 3, itCost: 5000, itVirus: 15000, itSafeFrom: 4,
  };
  const round500 = (v) => Math.round(v / 500) * 500;
  const plotInfo = (n) => {
    const s = SQUARES[n]; const g = GROUPS[s.group];
    return { price: g.plot, build: g.build, rent: g.rent, rentBuilt: g.rentBuilt,
      mortgage: round500(g.plot * 0.5), mortgageBuilt: round500((g.plot + g.build) * 0.5),
      sell: round500(g.plot * 0.75), sellBuilt: round500(g.plot * 0.75 + g.build * 0.5) };
  };
  return { GAME_NAME, GROUPS, SQUARES, BORSTIPS, FINANS, RULES, sharePct, shareName, shareSellPrice, displayNo, plotInfo };
});
