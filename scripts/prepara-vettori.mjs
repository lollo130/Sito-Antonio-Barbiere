// Prepara le piante della cornice per il sito.
//
// Due lotti di originali, due strade.
//
// LOTTO "incisioni" — le cinque foglie a due toni della prima cornice.
// SVG ricalcati da incisioni: bellissimi e pesantissimi, 270-500 kB l'uno,
// perche' il ricalco automatico scrive le coordinate con sei decimali che
// nessuno vedra' mai. Vengono ripuliti con SVGO e arrotondati agli interi.
//
// Perche' interi e non un decimale: le foglie hanno un viewBox da ~1200
// unita' e sul sito si vedono al massimo a 600 px, cioe' due unita' per
// pixel. Arrotondare alla singola unita' sposta i punti di mezzo pixel.
// Confrontate a 900 px, ben oltre la misura d'uso, originale e versione
// arrotondata sono indistinguibili anche sul gambo, dove le curve sono
// piu' strette. Il guadagno e' cinque volte: 103 kB compressi diventano 19.
//
// LOTTO "dipinte" — le sei piante a colori aggiunte dopo, per variare il
// fogliame. Stesso problema di peso, piu' due particolarita':
//
//   1. Sotto il disegno vettoriale c'e' un rettangolo bianco raster, il
//      fondo lasciato li' dall'esportazione. Non si vede — "multiply" lo
//      cancella comunque — ma e' un'immagine a piena pagina incorporata in
//      base64. Va tolto, e va tolto solo dopo aver VERIFICATO che sia
//      davvero bianco uniforme: se un giorno un originale ci nascondesse
//      dentro una parte del disegno, buttarlo via lo rovinerebbe in
//      silenzio. Per questo il controllo e' un errore, non un avviso.
//
//   2. Una delle sei non ha path: e' un'immagine e basta. Quella non puo'
//      diventare un vettore, e prende la strada del raster — WebP con
//      trasparenza, ritagliato sul disegno. La scelta la fa lo script
//      guardando il file, non un elenco scritto a mano: se un originale
//      cambia, cambia da solo anche la strada.
//
// Uso: node scripts/prepara-vettori.mjs <cartella-originali> <lotto>
// Gli originali NON stanno nel repository: nel sito finisce solo il
// risultato in public/sfondi/.

import { gzipSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { optimize } from 'svgo';
import sharp from 'sharp';

// Nomi in chiaro: "image.svg" e "foglia 4.svg" non dicono niente a chi
// aprira' questa cartella fra un anno. I due lotti sono separati perche' i
// nomi degli originali si accavallano — in tutti e due c'e' una "foglia
// 3.svg", e sono due piante diverse.
// I nomi sono SENZA estensione: quale sia la decide la strada che prende il
// file, non chi scrive l'elenco.
const LOTTI = {
  incisioni: {
    'foglia 3.svg': 'foglia-lancia',
    'foglia 4.svg': 'monstera-incisa',
    'foglia 5.svg': 'foglia-larga',
    'foglia 6.svg': 'foglia-sottile',
    'image.svg': 'palma',
  },
  dipinte: {
    'foglia 1.svg': 'foglia-zebrata',
    'foglia 2.svg': 'foglia-nastro',
    'foglia 3.svg': 'ciuffo-variegato',
    'foglia 4.svg': 'foglie-appuntite',
    'foglia 5.svg': 'sansevieria',
    'foglia 6.svg': 'calatea-tonda',
  },
};

const sorgente = process.argv[2];
const lotto = process.argv[3];
if (!sorgente || !LOTTI[lotto]) {
  console.error('Uso: node scripts/prepara-vettori.mjs <cartella-originali> <lotto>');
  console.error(`Lotti: ${Object.keys(LOTTI).join(', ')}`);
  process.exit(1);
}

const NOMI = LOTTI[lotto];
const destinazione = 'public/sfondi';
mkdirSync(destinazione, { recursive: true });

/** Le immagini incorporate in base64, nell'ordine in cui compaiono. */
function immaginiIncorporate(svg) {
  return [...svg.matchAll(/href="data:image\/\w+;base64,([^"]+)"/g)].map((m) =>
    Buffer.from(m[1], 'base64'),
  );
}

/** Vero se ogni pixel e' bianco pieno: allora e' solo il fondo. */
async function eBiancoUniforme(png) {
  const { channels } = await sharp(png).stats();
  return channels.every((c) => c.min === 255 && c.max === 255);
}

/**
 * Toglie il fondo bianco raster e rimpicciolisce il vettore.
 * Restituisce null se sotto il fondo non c'era niente da salvare.
 */
async function comeVettore(originale, file) {
  const senzaFondo = originale
    .replace(/<image[^>]*id="img1"[^>]*\/>/g, '')
    .replace(/<use[^>]*href="#img1"[^>]*\/>/g, '');
  if (!senzaFondo.includes('<path')) return null;

  const { data } = optimize(senzaFondo, { path: file, multipass: true, floatPrecision: 0 });
  return data;
}

/**
 * La strada del raster: si prende l'immagine col disegno — non il fondo —,
 * la si ritaglia sul contenuto e la si porta alla misura d'uso.
 * 900 px di larghezza: sul sito la pianta piu' grande sta sotto i 600 px
 * di schermo, e il margine serve solo agli schermi a densita' doppia.
 */
async function comeRaster(immagini) {
  const disegno = immagini.at(-1);
  return sharp(disegno)
    .trim({ threshold: 1 })
    .resize({ width: 900, withoutEnlargement: true, kernel: 'lanczos3' })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
}

for (const file of readdirSync(sorgente)) {
  if (!file.toLowerCase().endsWith('.svg')) continue;
  const nuovo = NOMI[file.toLowerCase()];
  if (!nuovo) {
    console.warn(`  ${file} — nome non previsto, lo salto`);
    continue;
  }

  const originale = readFileSync(join(sorgente, file), 'utf8');
  const immagini = immaginiIncorporate(originale);

  // Il fondo si butta solo dopo averlo guardato (vedi § 1 in cima).
  if (immagini.length > 0 && !(await eBiancoUniforme(immagini[0]))) {
    console.error(
      `  ${file} — la prima immagine incorporata NON e' bianca uniforme: ` +
        `potrebbe essere parte del disegno. Mi fermo invece di buttarla via.`,
    );
    process.exitCode = 1;
    continue;
  }

  // La strada la sceglie il file: se sotto il fondo c'erano dei path e'
  // un vettore, altrimenti e' un'immagine e va servita come tale.
  const vettore = await comeVettore(originale, file);

  if (vettore) {
    writeFileSync(join(destinazione, nuovo + '.svg'), vettore);
    console.log(
      `  ${(nuovo + '.svg').padEnd(24)} vettore ${String(Math.round(vettore.length / 1024)).padStart(4)} kB ` +
        `(${Math.round(gzipSync(vettore).length / 1024)} kB compressi, erano ` +
        `${Math.round(gzipSync(originale).length / 1024)})`,
    );
  } else {
    const webp = await comeRaster(immagini);
    writeFileSync(join(destinazione, nuovo + '.webp'), webp);
    const { width, height } = await sharp(webp).metadata();
    console.log(
      `  ${(nuovo + '.webp').padEnd(24)} raster  ${String(Math.round(webp.length / 1024)).padStart(4)} kB ` +
        `(${width}x${height}, niente vettori nell'originale)`,
    );
  }
}
