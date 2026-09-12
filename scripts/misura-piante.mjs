// Misura i due numeri che servono a src/components/Decoro.tsx per ogni pianta:
// la proporzione e la quota di picciolo.
//
// Erano stati ricavati a mano. Metterli qui serve a due cose: chi aggiunge una
// pianta non deve piu' indovinare, e chi trova un numero strano puo' rifare la
// misura invece di fidarsi.
//
// LA PROPORZIONE e' larghezza/altezza del disegno. Serve al componente per
// riservare lo spazio giusto prima che l'immagine arrivi, cosi' la pagina non
// salta.
//
// IL PICCIOLO e' quanta parte del disegno, dal basso, e' gambo o vuoto —
// cioe' quanto puo' uscire dal bordo della fascia senza perdere niente di
// quello che si deve vedere. Si misura sull'inchiostro riga per riga: da
// sotto, si contano le righe il cui tratto e' piu' stretto del 18% della
// larghezza massima. Sotto quella soglia si e' ancora nel gambo; appena la
// lamina si apre, la riga si allarga di colpo e il conteggio si ferma.
//
// Uso: node scripts/misura-piante.mjs [nome ...]
// Senza argomenti misura tutte le piante di public/sfondi.

import { readdirSync } from 'node:fs';
import sharp from 'sharp';

/** Sopra questa quota della larghezza massima non si e' piu' nel gambo. */
const SOTTILE = 0.18;

/** Quanto sotto il bianco un pixel conta come inchiostro. */
const INCHIOSTRO = 200;

/** Altezza a cui si misura: abbastanza fine da vedere il gambo, e veloce. */
const ALTEZZA = 400;

async function misura(file) {
  // density alta perche' i vettori vanno rasterizzati per essere misurati.
  const meta = await sharp(file, { density: 200 }).metadata();
  const proporzione = meta.width / meta.height;
  const larghezza = Math.max(8, Math.round(ALTEZZA * proporzione));

  const { data, info } = await sharp(file, { density: 200 })
    .resize(larghezza, ALTEZZA, { fit: 'fill' })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Larghezza del tratto riga per riga: dal primo all'ultimo pixel scuro.
  const tratto = [];
  for (let y = 0; y < info.height; y++) {
    let primo = -1;
    let ultimo = -1;
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < INCHIOSTRO) {
        if (primo < 0) primo = x;
        ultimo = x;
      }
    }
    tratto.push(primo < 0 ? 0 : ultimo - primo + 1);
  }

  const massimo = Math.max(...tratto);
  let righe = 0;
  for (let y = info.height - 1; y >= 0 && tratto[y] < massimo * SOTTILE; y--) righe++;

  return {
    proporzione: `${meta.width} / ${meta.height}`,
    picciolo: Math.round((righe / info.height) * 100),
  };
}

const chiesti = process.argv.slice(2);
const piante = readdirSync('public/sfondi')
  .filter((f) => /\.(svg|webp)$/.test(f))
  .filter((f) => chiesti.length === 0 || chiesti.includes(f.replace(/\.\w+$/, '')));

for (const file of piante.sort()) {
  const { proporzione, picciolo } = await misura(`public/sfondi/${file}`);
  console.log(
    `  ${file.replace(/\.\w+$/, '').padEnd(20)} proporzione ${proporzione.padEnd(13)} picciolo ${picciolo}`,
  );
}
