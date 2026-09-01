// Genera i QR da stampare per la vetrina e da mandare su WhatsApp.
// Uso: node scripts/genera-qr.mjs [indirizzo-del-sito]
//
// Produce, nella cartella qr/:
//   - qr-installa.svg   solo il codice, per metterlo dentro altre grafiche
//   - vetrina-installa.svg   foglio A5 pronto da stampare (installa l'app)
//   - vetrina-prenota.svg    foglio A5 pronto da stampare (prenota subito)
//
// Gli SVG si stampano da qualsiasi browser: aprili e premi Ctrl+P.

import { mkdirSync, writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

const SITO = (process.argv[2] ?? 'https://barbieresolarino.netlify.app').replace(/\/$/, '');

const VERDE = '#2e5949';
const CARTA = '#fbf8f1';
const INCHIOSTRO = '#2a241e';
const MARRONE = '#6b4a2b';

function qrSvg(url, lato) {
  // livello di correzione alto: il codice resta leggibile anche se il foglio
  // si sporca, si piega o prende sole in vetrina.
  return renderToStaticMarkup(
    createElement(QRCodeSVG, {
      value: url,
      size: lato,
      level: 'H',
      marginSize: 0,
      bgColor: CARTA,
      fgColor: INCHIOSTRO,
    }),
  );
}

// A5 a 96 dpi: 559 x 794
function volantino({ occhiello, titolo, sottotitolo, url, piede }) {
  const lato = 300;
  const qr = qrSvg(url, lato).replace(/^<svg /, '<svg x="129" y="330" ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="559" height="794" viewBox="0 0 559 794">
  <rect width="559" height="794" fill="${CARTA}"/>
  <rect x="24" y="24" width="511" height="746" fill="none" stroke="${VERDE}" stroke-width="4"/>

  <text x="279" y="112" text-anchor="middle" font-family="'Courier New', monospace" font-size="15" letter-spacing="4" fill="${MARRONE}">DAL 1982 A SOLARINO</text>
  <text x="279" y="172" text-anchor="middle" font-family="'Courier New', monospace" font-size="46" font-weight="bold" fill="${INCHIOSTRO}">ANTONIO</text>
  <text x="279" y="204" text-anchor="middle" font-family="'Courier New', monospace" font-size="16" letter-spacing="5" fill="${MARRONE}">BARBIERE</text>

  <line x1="180" y1="238" x2="379" y2="238" stroke="${VERDE}" stroke-width="2"/>

  <text x="279" y="286" text-anchor="middle" font-family="'Courier New', monospace" font-size="27" font-weight="bold" fill="${VERDE}">${titolo}</text>
  <text x="279" y="316" text-anchor="middle" font-family="Verdana, sans-serif" font-size="16" fill="${INCHIOSTRO}">${sottotitolo}</text>

  <rect x="119" y="320" width="320" height="320" fill="${CARTA}" stroke="${VERDE}" stroke-width="2"/>
  ${qr}

  <text x="279" y="684" text-anchor="middle" font-family="Verdana, sans-serif" font-size="15" fill="${INCHIOSTRO}">${occhiello}</text>
  <text x="279" y="716" text-anchor="middle" font-family="'Courier New', monospace" font-size="14" fill="${MARRONE}">${url.replace(/^https:\/\//, '')}</text>
  <text x="279" y="748" text-anchor="middle" font-family="Verdana, sans-serif" font-size="13" fill="${MARRONE}">${piede}</text>
</svg>
`;
}

mkdirSync('qr', { recursive: true });

writeFileSync('qr/qr-installa.svg', qrSvg(`${SITO}/installa`, 600));

writeFileSync(
  'qr/vetrina-installa.svg',
  volantino({
    titolo: 'METTI IL SALONE',
    sottotitolo: 'sul tuo telefono',
    url: `${SITO}/installa`,
    occhiello: 'Inquadra con la fotocamera',
    piede: 'Niente da scaricare, niente password',
  }),
);

writeFileSync(
  'qr/vetrina-prenota.svg',
  volantino({
    titolo: 'PRENOTA IL TAGLIO',
    sottotitolo: 'quando vuoi, anche di sera',
    url: `${SITO}/prenota`,
    occhiello: 'Inquadra con la fotocamera',
    piede: 'Bastano nome e numero di telefono',
  }),
);

console.log('Creati in qr/ :');
console.log('  qr-installa.svg        solo il codice');
console.log('  vetrina-installa.svg   A5 da stampare — installa l\'app');
console.log('  vetrina-prenota.svg    A5 da stampare — prenota subito');
console.log('\nPuntano a:', SITO);
