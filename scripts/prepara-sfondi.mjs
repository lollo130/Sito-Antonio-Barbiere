// Prepara gli sfondi botanici per il sito.
//
// Gli originali sono illustrazioni Freepik da 3000 e 5000 px, 2 e 6 MB:
// impensabili da servire. Qui vengono rimpicciolite, convertite in WebP e
// portate a un peso da decorazione.
//
// Uso: node scripts/prepara-sfondi.mjs <cartella-originali>
// Gli originali NON stanno nel repository: sono file di stock, si tengono
// da parte. Nel sito finisce solo il risultato in public/sfondi/.

import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const sorgenti = [
  { nome: 'floreale', file: process.argv[2] ?? 'public/tmp-originali/floreale.jpg' },
  { nome: 'tropicale', file: process.argv[3] ?? 'public/tmp-originali/tropicale.jpg' },
];

mkdirSync('public/sfondi', { recursive: true });

for (const s of sorgenti) {
  const out = `public/sfondi/${s.nome}.webp`;
  const info = await sharp(s.file)
    .resize({ width: 900, withoutEnlargement: true })
    // in scala di grigi: sono disegni a linea, il colore lo mette il sito
    // con la tinta verde in sovrapposizione, e così pesano molto meno
    .grayscale()
    .webp({ quality: 48, effort: 6 })
    .toFile(out);
  console.log(`  ${out.padEnd(30)} ${info.width}x${info.height}  ${Math.round(info.size / 1024)} kB`);
}
