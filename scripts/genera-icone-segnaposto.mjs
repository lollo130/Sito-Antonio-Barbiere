// Icone segnaposto (il cliente fornirà quelle vere — vedi SPECIFICA.md § 11).
// Genera PNG a tinta unita, senza dipendenze esterne: solo zlib.
// Uso: node scripts/genera-icone-segnaposto.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CARTELLA = 'public/icons';
const COLORE_SFONDO = [26, 26, 26]; // #1a1a1a, come theme_color del manifest
const COLORE_LETTERA = [255, 255, 255];

function crc32(buf) {
  let c;
  const tabella = crc32.tabella ?? (crc32.tabella = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = tabella[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dati) {
  const lunghezza = Buffer.alloc(4);
  lunghezza.writeUInt32BE(dati.length, 0);
  const tipoBuf = Buffer.from(tipo, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tipoBuf, dati])), 0);
  return Buffer.concat([lunghezza, tipoBuf, dati, crcBuf]);
}

// "S" molto semplice, disegnata a blocchi su una griglia 7x9 (stile display a segmenti).
const GRIGLIA_S = [
  '0111110',
  '1000000',
  '1000000',
  '0111100',
  '0000010',
  '0000001',
  '1000001',
  '1000001',
  '0111110',
];

function pixelE(x, y, dimensione) {
  const margine = Math.round(dimensione * 0.28);
  const areaUtile = dimensione - margine * 2;
  const colonne = GRIGLIA_S[0].length;
  const righe = GRIGLIA_S.length;
  const cella = areaUtile / Math.max(colonne, righe);
  const offsetX = margine + (areaUtile - cella * colonne) / 2;
  const offsetY = margine + (areaUtile - cella * righe) / 2;
  const col = Math.floor((x - offsetX) / cella);
  const riga = Math.floor((y - offsetY) / cella);
  if (col < 0 || col >= colonne || riga < 0 || riga >= righe) return false;
  return GRIGLIA_S[riga][col] === '1';
}

function generaPng(dimensione, { sicurezzaMascherabile = false } = {}) {
  const righe = [];
  for (let y = 0; y < dimensione; y++) {
    const riga = Buffer.alloc(1 + dimensione * 4);
    riga[0] = 0; // filtro "nessuno"
    for (let x = 0; x < dimensione; x++) {
      const dentroZonaSicura = !sicurezzaMascherabile || (
        x > dimensione * 0.1 && x < dimensione * 0.9 &&
        y > dimensione * 0.1 && y < dimensione * 0.9
      );
      const lettera = dentroZonaSicura && pixelE(x, y, dimensione);
      const colore = lettera ? COLORE_LETTERA : COLORE_SFONDO;
      const i = 1 + x * 4;
      riga[i] = colore[0];
      riga[i + 1] = colore[1];
      riga[i + 2] = colore[2];
      riga[i + 3] = 255;
    }
    righe.push(riga);
  }
  const raw = Buffer.concat(righe);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(dimensione, 0);
  ihdr.writeUInt32BE(dimensione, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colore: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    firma,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(CARTELLA, { recursive: true });
writeFileSync(`${CARTELLA}/icon-192.png`, generaPng(192));
writeFileSync(`${CARTELLA}/icon-512.png`, generaPng(512));
writeFileSync(`${CARTELLA}/icon-maskable-512.png`, generaPng(512, { sicurezzaMascherabile: true }));
console.log('Icone segnaposto generate in', CARTELLA);
