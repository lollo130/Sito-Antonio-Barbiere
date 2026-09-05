// Prepara le foglie incise per il sito.
//
// Gli originali sono SVG ricalcati da incisioni: bellissimi e pesantissimi,
// 270-500 kB l'uno, perche' il ricalco automatico scrive le coordinate con
// sei decimali che nessuno vedra' mai. Qui vengono ripuliti con SVGO e
// arrotondati agli interi.
//
// Perche' interi e non un decimale: le foglie hanno un viewBox da ~1200
// unita' e sul sito si vedono al massimo a 600 px, cioe' due unita' per
// pixel. Arrotondare alla singola unita' sposta i punti di mezzo pixel.
// Confrontate a 900 px, ben oltre la misura d'uso, originale e versione
// arrotondata sono indistinguibili anche sul gambo, dove le curve sono
// piu' strette. Il guadagno e' cinque volte: 103 kB compressi diventano 19.
//
// Uso: node scripts/prepara-vettori.mjs <cartella-originali>
// Gli originali NON stanno nel repository: nel sito finisce solo il
// risultato in public/sfondi/.

import { gzipSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { optimize } from 'svgo';

const sorgente = process.argv[2];
if (!sorgente) {
  console.error('Uso: node scripts/prepara-vettori.mjs <cartella-originali>');
  process.exit(1);
}

// Nomi in chiaro: "image.svg" e "foglia 4.svg" non dicono niente a chi
// aprira' questa cartella fra un anno.
const NOMI = {
  'foglia 3.svg': 'foglia-lancia.svg',
  'foglia 4.svg': 'monstera-incisa.svg',
  'foglia 5.svg': 'foglia-larga.svg',
  'foglia 6.svg': 'foglia-sottile.svg',
  'image.svg': 'palma.svg',
};

const destinazione = 'public/sfondi';
mkdirSync(destinazione, { recursive: true });

for (const file of readdirSync(sorgente)) {
  if (!file.endsWith('.svg')) continue;
  const nuovo = NOMI[file];
  if (!nuovo) {
    console.warn(`  ${file} — nome non previsto, lo salto`);
    continue;
  }

  const originale = readFileSync(join(sorgente, file), 'utf8');
  const { data } = optimize(originale, {
    path: file,
    multipass: true,
    floatPrecision: 0,
  });

  const arrivo = join(destinazione, nuovo);
  writeFileSync(arrivo, data);
  const compresso = gzipSync(data).length;
  console.log(
    `  ${nuovo.padEnd(22)} ${String(Math.round(data.length / 1024)).padStart(4)} kB  ` +
      `(${Math.round(compresso / 1024)} kB compressi, erano ` +
      `${Math.round(gzipSync(originale).length / 1024)})`,
  );
}
