// Hur korten visas: rubrik, kort text, effekt, ton (+, - eller 0), bild och ikon. Reglerna finns i data.js och game.js.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.cardView = factory(); })(this, function () {
  const V = (h, d, e, f, tone, scene, i) => ({ h, d, e, f, tone, scene, i });
  const VIEWS = {
    // Börstips
    'Lyckad affär i utlandet. Du får 10 000 kr.': V('Lyckad affär i utlandet!', 'Exporten går över förväntan och pengarna rullar in.', '+10 000 kr', 'till dig från banken.', '+', 'up'),
    'Din konsultfirma går med vinst. Du får 15 000 kr.': V('Konsultfirman går med vinst!', 'Kunderna står på kö och året slutar starkt.', '+15 000 kr', 'till dig från banken.', '+', 'up'),
    'Du säljer en patentidé. Du får 20 000 kr.': V('Du säljer en patentidé!', 'Din uppfinning väcker stort intresse hos industrin.', '+20 000 kr', 'till dig från banken.', '+', 'up'),
    'Skatteåterbäring! Du får 5 000 kr.': V('Skatteåterbäring!', 'Deklarationen visar att du har betalat för mycket.', '+5 000 kr', 'till dig från banken.', '+', 'coins'),
    'Revisorn skickar räkningen. Betala 5 000 kr.': V('Revisorn skickar räkningen', 'Årets genomgång av bokföringen blev dyrare än väntat.', '−5 000 kr', 'betalas till banken.', '-', 'down'),
    'En felinvestering. Betala 10 000 kr.': V('En felinvestering', 'Affären såg lovande ut men slutade med förlust.', '−10 000 kr', 'betalas till banken.', '-', 'down'),
    'Böter för sen årsredovisning. Betala 15 000 kr.': V('Böter för sen årsredovisning', 'Papperen kom fram för sent och myndigheten agerar.', '−15 000 kr', 'betalas till banken.', '-', 'down'),
    'Bolagen går bra. Du får aktieutdelning.': V('Bolagen går bra!', 'Starka resultat ger pengar till aktieägarna.', 'Aktieutdelning', 'på dina aktier.', '+', 'coins', 'div'),
    'Extra utdelning från banken på dina aktier.': V('Extra utdelning!', 'Banken delar ut mer än vanligt i år.', 'Aktieutdelning', 'från banken på dina aktier.', '+', 'coins', 'div'),
    'Ge dina motspelare 20 % utdelning på aktier i grupper där du har tomter.': V('Dina motspelare får utdelning', 'Dina tomter gör att bolagen går bra för fler än dig.', '20 % utdelning', 'till motspelare med aktier i grupper där du har tomter.', '-', 'down', 'give'),
    'Bråttom till mötet! Gå till Bankentré.': V('Bråttom till mötet!', 'Banken väntar och du får skynda dig dit.', 'Gå till Bankentré', 'direkt.', '0', 'city', 'entry'),
    'Gå till Bankfilialen.': V('Besök Bankfilialen', 'Rådgivaren vill träffa dig om dina affärer.', 'Gå till Bankfilialen', 'direkt.', '0', 'city', 'branch'),
    'Gå till Byggprojekt AB.': V('Besök Byggprojekt AB', 'Byggbolaget har förslag på nya projekt.', 'Gå till Byggprojekt AB', 'direkt.', '0', 'crane', 'buildsq'),
    'Något stort är på gång. Ta en Finanstidning.': V('Något stort är på gång', 'Ryktena går på börsen. Läs mer i tidningen.', 'Ta en Finanstidning', 'direkt.', '0', 'city', 'news'),
    'Skatteverket vill prata. Gå till Fängelset.': V('Skatteverket vill prata', 'Dina affärer granskas och du blir kvar ett tag.', 'Gå till Fängelset', 'direkt.', '-', 'bars', 'prison'),
    'Bilen behöver service. Bilägare betalar 5 000 kr.': V('Bilen behöver service', 'Verkstaden hittar mer än du hade räknat med.', '−5 000 kr', 'för dig som har bil.', '-', 'car', 'repay'),
    'Du fyller år. Varje motspelare ger dig 5 000 kr.': V('Grattis på födelsedagen!', 'Dina motspelare hör av sig med en gåva.', '+5 000 kr', 'från varje motspelare.', '+', 'coins'),
    'Fastighetsunderhåll. Betala 2 000 kr per byggnad.': V('Fastighetsunderhåll', 'Tak och fasader behöver ses över.', '−2 000 kr', 'per byggnad du äger.', '-', 'crane', 'repay'),
    'Ett arv från en okänd släkting. Du får 25 000 kr.': V('Ett oväntat arv!', 'En okänd släkting har tänkt på dig i sitt testamente.', '+25 000 kr', 'till dig från banken.', '+', 'coins'),
    'Obligation nr 1 har utfallit med vinst. Ägaren inkasserar 10 000 kr.': V('Obligation nr 1 ger vinst!', 'Numret har utfallit och pengarna kan hämtas.', '+10 000 kr', 'till ägaren av obligation nr 1.', '+', 'bond', 'lilla'),
    'Lilla obligationsdragningen! Köp en obligation, sedan sker dragningen.': V('Lilla obligationsdragningen!', 'Det är dags att dra vinnande nummer.', 'Köp en obligation', 'sedan sker dragningen.', '0', 'bond', 'lilla'),
    'Du glömde portföljen. Gå 2 steg bakåt.': V('Du glömde portföljen', 'Det är bara att vända och hämta den.', '2 steg bakåt', 'med din pjäs.', '-', 'down', 'entry'),
    'Bra fart i affärerna. Gå 2 steg framåt.': V('Bra fart i affärerna!', 'Allt flyter på och du kommer snabbare fram.', '2 steg framåt', 'med din pjäs.', '+', 'up', 'exit'),
    'Gå direkt i fängelse.': V('Gå direkt i fängelse', 'Dina affärer har gått över gränsen.', 'Gå till Fängelset', 'direkt.', '-', 'bars', 'prison'),
    'Frikort! Spara kortet. Du kan använda det för att slippa fängelset.': V('Frikort!', 'Goda kontakter kan rädda dig när det behövs.', 'Slipp fängelset', 'en gång när du använder kortet.', '+', 'bars', 'prison'),
    'Bygglov! Spara kortet. Du kan använda det en gång för att bygga när du vill, före ditt kast.': V('Bygglov!', 'Kommunen säger ja till dina planer.', 'Bygg när du vill', 'en gång, före ditt kast.', '+', 'crane', 'buildsq'),
    'Gå direkt till Bankfilialen.': V('Till Bankfilialen', 'Ett viktigt ärende väntar på banken.', 'Gå till Bankfilialen', 'direkt.', '0', 'city', 'branch'),
    'Gå direkt till ruta 27.': V('Nytt uppdrag', 'En affärskontakt vill träffa dig på ruta 27.', 'Gå till ruta 27', 'direkt.', '0', 'city', 'exit'),
    'Besök en av dina egna tomter. Har du ingen tomt går du direkt till Bankentré.': V('Besök din egen tomt', 'Det är dags att se hur det går med din fastighet.', 'Gå till en egen tomt', 'Har du ingen går du till Bankentré.', '0', 'city', 'exit'),
    'Överlämna valfri tomt eller aktie till föregående spelare.': V('En gåva till grannen', 'En gammal affär måste göras upp.', 'Lämna bort', 'valfri tomt eller aktie till föregående spelare.', '-', 'down', 'give'),
    'Hyresgäster flyttar in. Du får 3 000 kr per tomt du äger.': V('Hyresgäster flyttar in!', 'Lokalerna fylls och hyrorna börjar komma.', '+3 000 kr', 'per tomt du äger.', '+', 'up'),
    'Årets företagare! Spelaren med minst kontanter får 30 000 kr av banken.': V('Årets företagare!', 'Priset går till den som behöver det mest.', '+30 000 kr', 'till spelaren med minst kontanter.', '+', 'coins'),
    'Vattenskada! Betala 5 000 kr per bebyggd tomt.': V('Vattenskada!', 'Läckan har gjort stor skada i dina hus.', '−5 000 kr', 'per bebyggd tomt.', '-', 'down'),
    'Revision! Betala 5 % av dina kontanter till banken.': V('Revision!', 'Granskningen visar att du måste betala mer.', '−5 %', 'av dina kontanter till banken.', '-', 'down'),
    'Kursras! Alla spelares 30 %-aktier blir värdelösa och går tillbaka till banken utan ersättning.': V('Kursras!', 'Marknaden tappar förtroendet för de här bolagen.', '30 %-aktier värdelösa', 'för alla spelare. Tillbaka till banken utan ersättning.', '-', 'down', 'repay'),
    'Börskrasch! Alla spelares 40 %-aktier blir värdelösa och går tillbaka till banken utan ersättning.': V('Börskrasch!', 'De största bolagen rasar på börsen.', '40 %-aktier värdelösa', 'för alla spelare. Tillbaka till banken utan ersättning.', '-', 'down', 'repay'),
    'Återlämna en tomt! Välj en av dina tomter som går tillbaka till banken utan ersättning.': V('Återlämna en tomt!', 'Banken säger upp ett av dina fastighetsavtal.', 'Lämna tillbaka en tomt', 'Du väljer själv. Ingen ersättning, byggnaden följer med.', '-', 'down', 'repay'),
    'Banken säger upp ditt lån! Har du ett banklån betalar du tillbaka 50 000 kr direkt.': V('Banken säger upp ditt lån!', 'Banken vill ha tillbaka sina pengar, och den vill ha dem nu.', '−50 000 kr', 'för dig som har ett banklån. Lånet är sedan betalt.', '-', 'down'),
    'Gratis fondaktie! Du får en fondaktie på 20 000 kr som ger 20 % i utdelning.': V('Gratis fondaktie!', 'Din bank bjuder på en andel i sin fond.', 'Fondaktie på 20 000 kr', 'gratis, med 20 % utdelning.', '+', 'bond', 'lilla'),
    'Bilstöld! Har du bil förlorar du den utan ersättning.': V('Bilstöld!', 'Parkeringen är tom när du kommer tillbaka.', 'Bilen försvinner', 'utan ersättning, om du har bil.', '-', 'car', 'repay'),
    'Gå direkt till Bankutgång. Du drar inget nytt kort, men betalar eventuell låneränta.': V('Snabbt ut ur banken', 'Du tar genvägen till utgången.', 'Gå till Bankutgång', 'Inget nytt kort, men du betalar eventuell låneränta.', '0', 'city', 'exit'),
    'Hyresfrihet! Spara kortet. Du kan använda det en gång när du ska betala hyra.': V('Hyresfrihet!', 'En uppgörelse med hyresvärden ger dig ett andrum.', 'Slipp en hyra', 'en gång när du ska betala.', '+', 'coins', 'div'),
    'Köptips! Spara kortet. Du kan köpa en tomt eller aktie en gång var du än står, före ditt kast.': V('Köptips!', 'Din mäklare hör av sig om ett bra läge.', 'Köp var du än står', 'en tomt eller aktie en gång, före ditt kast.', '+', 'up', 'branch'),
    // Finanstidningen
    'Goda tider! Du går dubbelt så många steg som tärningarna visar, gratifikationen räknas dubbelt och utdelningsrutan gäller alla. Gäller tills nästa tidning.': V('Goda tider!', 'Ekonomin går på högvarv och affärerna blomstrar.', 'Dubbla steg', 'Dubbel gratifikation, och utdelningsrutan gäller alla.', '+', 'up'),
    'Dåliga tider! Du slår två tärningar och går efter den lägsta, och gratifikationen räknas till hälften. Gäller tills nästa tidning.': V('Dåliga tider!', 'Marknaden tvekar och affärerna går trögt.', 'Lägsta tärningen', 'gäller av två, och gratifikationen halveras.', '-', 'down'),
    'Stora obligationsdragningen! Alla får köpa en obligation före dragningen.': V('Stora obligationsdragningen!', 'Hela marknaden väntar på de vinnande numren.', 'Alla får köpa', 'en obligation före dragningen.', '0', 'bond', 'lilla'),
    'Hausse på börsen! Alla spelare får aktieutdelning.': V('Hausse på börsen!', 'Kurserna stiger och bolagen delar ut mer.', 'Aktieutdelning', 'till alla spelare.', '+', 'up', 'div'),
    'Inflation och kursfall! Alla betalar 10 % av sitt aktiekapital.': V('Inflation och kursfall!', 'Priserna stiger medan aktierna tappar i värde.', '−10 %', 'av aktiekapitalet, för alla.', '-', 'down'),
    'Ny fastighetsskatt! Alla betalar 1 000 kr per tomt och 3 000 kr per byggnad.': V('Ny fastighetsskatt!', 'Riksdagen vill ha mer av fastighetsägarna.', '−1 000 kr per tomt', 'och −3 000 kr per byggnad, för alla.', '-', 'down'),
    'Byggboom! Alla får 5 000 kr per byggnad.': V('Byggboom!', 'Kranarna snurrar och fastigheterna ökar i värde.', '+5 000 kr', 'per byggnad, till alla.', '+', 'crane'),
    'Räntehöjning! Alla betalar 5 000 kr per banklån.': V('Räntehöjning!', 'Riksbanken höjer och lånen blir dyrare.', '−5 000 kr', 'per banklån, för alla.', '-', 'down'),
    'Företagsstöd! Alla spelare får 10 000 kr.': V('Företagsstöd!', 'Staten vill få fart på näringslivet.', '+10 000 kr', 'till alla spelare.', '+', 'coins'),
    'Baisse på börsen! Banken säljer och återköper aktier till halva värdet. Ingen aktieutdelning. Gäller tills nästa tidning.': V('Baisse på börsen!', 'Kurserna rasar och bolagen sparar sina pengar.', 'Aktier till halva värdet', 'vid köp och försäljning. Ingen aktieutdelning.', '-', 'down'),
    'Hyresreglering! Alla hyror halveras. Gäller tills nästa tidning.': V('Hyresreglering!', 'Nya regler sätter tak på hyresmarknaden.', 'Halv hyra', 'på alla tomter.', '-', 'down'),
    'Bostadsbrist! Hyrorna fördubblas på alla bebyggda tomter. Gäller tills nästa tidning.': V('Bostadsbrist!', 'Lokaler och bostäder räcker inte till.', 'Dubbel hyra', 'på alla bebyggda tomter.', '+', 'up'),
    'Kreditstopp! Banken ger inga nya lån. Gäller tills nästa tidning.': V('Kreditstopp!', 'Bankerna drar åt svångremmen.', 'Inga nya lån', 'från banken.', '-', 'down', 'repay'),
    'Börsstängning! Ingen får köpa eller sälja aktier. Gäller tills nästa tidning.': V('Börsstängning!', 'Handeln stoppas efter stor oro på marknaden.', 'Ingen aktiehandel', 'Ingen får köpa eller sälja aktier.', '-', 'down', 'repay'),
    'Högkonjunktur på börsen! All aktieutdelning från banken fördubblas. Gäller tills nästa tidning.': V('Högkonjunktur på börsen!', 'Bolagen tjänar mer än någonsin.', 'Dubbel utdelning', 'på all aktieutdelning från banken.', '+', 'up', 'div'),
    'Lågkonjunktur på börsen! All aktieutdelning från banken halveras. Gäller tills nästa tidning.': V('Lågkonjunktur på börsen!', 'Vinsterna sjunker i hela näringslivet.', 'Halv utdelning', 'på all aktieutdelning från banken.', '-', 'down', 'repay'),
    'Bränslebrist! Bilägare slår bara en tärning. Gäller tills nästa tidning.': V('Bränslebrist!', 'Macken är tom och bilarna blir stående.', 'En tärning', 'för alla bilägare.', '-', 'car', 'repay'),
    'Byggstopp! Ingen får bygga. Gäller tills nästa tidning.': V('Byggstopp!', 'Kommunerna fryser alla nya byggprojekt.', 'Ingen får bygga', 'på sina tomter.', '-', 'crane', 'buildsq'),
    'Fastighetsreform! Alla spelare lämnar tillbaka valfri tomt till banken och får tillbaka köpesumman, även för byggnaden.': V('Fastighetsreform!', 'Staten köper in mark och ersätter ägarna.', 'Alla lämnar en tomt', 'Du väljer själv och får tillbaka köpesumman, även för byggnaden.', '0', 'crane', 'buildsq'),
    'Ombyggnad i banken! Alla som är inne i banken hamnar direkt på Bankutgång.': V('Ombyggnad i banken!', 'Hantverkarna tar över och lokalerna måste tömmas.', 'Till Bankutgång', 'för alla som är inne i banken.', '0', 'crane', 'exit'),
  };
  return function cardView(text) {
    if (VIEWS[text]) return VIEWS[text];
    const m = /^Högkonjunktur för (.+)! Dubbel hyra/.exec(text);
    if (m) return V(`Högkonjunktur för ${m[1]}!`, `Marknaden går starkt och efterfrågan ökar kraftigt i ${m[1]}.`, 'Dubbel hyra', 'på gruppens tomter.', '+', 'up');
    const i = text.indexOf('!');
    return V(i > 0 ? text.slice(0, i + 1) : 'Nytt kort', '', i > 0 ? text.slice(i + 1).trim() : text, '', '0', 'city');
  };
});
