// Prepara gli sfondi botanici per il sito.
//
// Gli originali sono illustrazioni Freepik da 3000 e 5000 px (2 e 6 MB):
// impensabili da servire. Qui vengono ridotte a due misure — una per il
// telefono e una per lo schermo grande — in scala di grigi, perché la tinta
// verde la mette il CSS. Il sito sceglie da solo quale scaricare, e le carica
// solo quando si arriva a quel punto della pagina.
//
// Uso: node scripts/prepara-sfondi.mjs <floreale.jpg> <tropicale.jpg>
// Gli originali NON stanno nel repository: sono file di stock, si tengono
// da parte. Nel sito finisce solo il risultato in public/sfondi/.

import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const sorgenti = [
  { nome: 'floreale', file: process.argv[2] },
  { nome: 'tropicale', file: process.argv[3] },
];

if (sorgenti.some((s) => !s.file)) {
  console.error('Servono i due file originali:');
  console.error('  node scripts/prepara-sfondi.mjs floreale.jpg tropicale.jpg');
  process.exit(1);
}

const misure = [
  { suffisso: '-800', larghezza: 800, qualita: 70 },
  { suffisso: '', larghezza: 1600, qualita: 75 },
];

mkdirSync('public/sfondi', { recursive: true });

for (const s of sorgenti) {
  for (const m of misure) {
    const out = `public/sfondi/${s.nome}${m.suffisso}.webp`;
    const info = await sharp(s.file)
      .resize({ width: m.larghezza, kernel: 'lanczos3' })
      .grayscale()
      .webp({ quality: m.qualita, effort: 6 })
      .toFile(out);
    console.log(`  ${out.padEnd(34)} ${info.width}x${info.height}  ${Math.round(info.size / 1024)} kB`);
  }
}
