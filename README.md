# Affärsspel online

Svenskt affärsspel för 2–6 spelare i webbläsaren. Servern håller reda på spelet, så att ingen kan fuska genom att ändra i sin webbläsare.

## Provkör på din dator

Du behöver [Node.js](https://nodejs.org) version 18 eller senare.

```
npm install
npm start
```

Öppna http://localhost:3000. Öppna en till flik för att spela mot dig själv, eller lägg till datorspelare.

## Lägg ut spelet på nätet

Spelet behöver en tjänst som kör Node.js och tillåter WebSocket. En vanlig webbhotellplats för bara HTML räcker inte. Till exempel Render, Railway eller Fly.io fungerar.

Så här gör du på Render:

1. Lägg mappen i ett GitHub-repo.
2. Skapa en ny **Web Service** från repot.
3. Ange build command `npm install` och start command `npm start`.
4. Dela adressen du får.

Pågående spel ligger i serverns minne och försvinner om servern startas om. Kör bara en server åt gången. Gratisnivåer kan somna när ingen spelar.

## Ändra spelet

All speldata finns i `public/data.js`: namn, tomter, priser, hyror, aktier och korttexter. Spelmotorn finns i `game.js`.

## Inställningar

Miljövariabler i millisekunder: `TURN_LIMIT` (120000) är tiden innan spelet gör ett enkelt drag åt en spelare, `GONE_LIMIT` (20000) gäller den som tappat kontakten, och `BOT_DELAY` (2700) styr datorspelarnas tempo.

## Tester

Pjäsbilderna i `public/pawns` skapas med `node tools/pawns.js`. `node test/rules.js` kontrollerar reglerna och `node test/simulate.js` spelar hela partier med datorspelare.

## Innan du lanserar

- Namnet Finans, Alga och originalets design kan vara skyddade. Byt `GAME_NAME` i `public/data.js` till ett eget namn eller be BRIO/Alga om lov, och fråga gärna en jurist.
- Sidan har inga konton. Spelare anger bara ett namn, och namnet syns för andra i samma spel.
