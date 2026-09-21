// Le icone delle app. Sono DUE app, non una:
//
//  - quella dei clienti, fondo verde e monogramma "A": si apre sul salone;
//  - quella del titolare, fondo cuoio scuro e un calendario: si apre
//    sull'agenda (vedi public/manifest-agenda.json).
//
// Stanno sulla stessa schermata Home dello stesso telefono, quindi non
// possono somigliarsi: cambia il colore del fondo E il segno sopra. Due
// icone verdi con dentro due lettere diverse sarebbero indistinguibili a
// colpo d'occhio, che è l'unico modo in cui un'icona viene guardata.
//
// Nessuna dipendenza esterna: solo zlib. I bordi sono puliti perché ogni
// icona viene disegnata a quadrupla risoluzione e poi rimpicciolita.
//
// Uso: node scripts/genera-icone.mjs
//
// Restano icone provvisorie: se il titolare ha un'insegna o un marchio,
// vanno rifatte da quelle. Ma almeno sembrano un'icona e non un quadrato
// vuoto (vedi SPECIFICA.md § 11).

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CARTELLA = 'public/icons';
const VERDE = [46, 89, 73]; // #2e5949
const CREMA = [251, 248, 241]; // #fbf8f1
const CUOIO_SCURO = [78, 52, 28]; // #4e341c
const SUPERCAMPIONAMENTO = 4;

// ---------------------------------------------------------------- PNG
function crc32(buf) {
  const tabella =
    crc32.tabella ??
    (crc32.tabella = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
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

function scriviPng(percorso, dimensione, pixel) {
  const righe = [];
  for (let y = 0; y < dimensione; y++) {
    const riga = Buffer.alloc(1 + dimensione * 4);
    riga[0] = 0;
    for (let x = 0; x < dimensione; x++) {
      const [r, g, b] = pixel(x, y);
      const i = 1 + x * 4;
      riga[i] = r;
      riga[i + 1] = g;
      riga[i + 2] = b;
      riga[i + 3] = 255;
    }
    righe.push(riga);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(dimensione, 0);
  ihdr.writeUInt32BE(dimensione, 4);
  ihdr[8] = 8; // bit per canale
  ihdr[9] = 6; // RGBA
  writeFileSync(
    percorso,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(Buffer.concat(righe), { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

// ------------------------------------------------------------ geometria
function distanzaDaSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lung2 = dx * dx + dy * dy;
  let t = lung2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lung2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Vero dentro il rettangolo, bordi compresi. */
function dentroRettangolo(u, v, x1, y1, x2, y2) {
  return u >= x1 && u <= x2 && v >= y1 && v <= y2;
}

/** Il segno è disegnato su una tela ideale 100x100, poi scalato. */
function dentroIlSegno(u, v) {
  const spessore = 11;

  // monogramma "A"
  const apiceX = 50;
  const apiceY = 20;
  const baseY = 76;
  const semiLarghezza = 21;

  if (distanzaDaSegmento(u, v, apiceX, apiceY, apiceX - semiLarghezza, baseY) < spessore / 2) return true;
  if (distanzaDaSegmento(u, v, apiceX, apiceY, apiceX + semiLarghezza, baseY) < spessore / 2) return true;

  // traversa
  const yTraversa = 60;
  const meta = semiLarghezza * ((yTraversa - apiceY) / (baseY - apiceY));
  if (distanzaDaSegmento(u, v, apiceX - meta, yTraversa, apiceX + meta, yTraversa) < spessore / 2 - 1)
    return true;

  return false;
}

/**
 * Il segno dell'agenda: un calendario da parete.
 *
 * Non una "P" di pannello e non una forbice: un calendario si riconosce
 * anche senza leggerlo, ed è esattamente quello che l'app fa vedere appena
 * si apre. Il fascione in cima è pieno perché è la parte che si distingue
 * quando l'icona è piccola: a 48 pixel le griglie sottili sparirebbero e
 * resterebbe un quadrato vuoto.
 */
function dentroIlSegnoAgenda(u, v) {
  const spessore = 7;

  // i due anelli che tengono il calendario appeso
  if (distanzaDaSegmento(u, v, 37, 15, 37, 27) < spessore / 2) return true;
  if (distanzaDaSegmento(u, v, 63, 15, 63, 27) < spessore / 2) return true;

  const x1 = 20;
  const y1 = 24;
  const x2 = 80;
  const y2 = 83;

  // fuori dalla carta: niente
  if (!dentroRettangolo(u, v, x1, y1, x2, y2)) return false;

  // il fascione in cima, pieno
  if (v <= y1 + 15) return true;

  // la cornice
  if (!dentroRettangolo(u, v, x1 + spessore, y1 + spessore, x2 - spessore, y2 - spessore)) {
    return true;
  }

  // i giorni: due file di tre caselle
  for (const cx of [30, 45.5, 61]) {
    for (const cy of [50, 65]) {
      if (dentroRettangolo(u, v, cx, cy, cx + 9, cy + 9)) return true;
    }
  }

  return false;
}

function generaIcona(percorso, dimensione, { zonaSicura = 1, segno = dentroIlSegno, fondo = VERDE } = {}) {
  const s = SUPERCAMPIONAMENTO;
  scriviPng(percorso, dimensione, (x, y) => {
    let dentro = 0;
    for (let sy = 0; sy < s; sy++) {
      for (let sx = 0; sx < s; sx++) {
        // coordinate sulla tela 100x100, con eventuale rientro per le maschere
        const fx = ((x + (sx + 0.5) / s) / dimensione - 0.5) / zonaSicura + 0.5;
        const fy = ((y + (sy + 0.5) / s) / dimensione - 0.5) / zonaSicura + 0.5;
        if (segno(fx * 100, fy * 100)) dentro++;
      }
    }
    const a = dentro / (s * s);
    return [
      Math.round(fondo[0] + (CREMA[0] - fondo[0]) * a),
      Math.round(fondo[1] + (CREMA[1] - fondo[1]) * a),
      Math.round(fondo[2] + (CREMA[2] - fondo[2]) * a),
    ];
  });
  console.log('  scritta', percorso);
}

mkdirSync(CARTELLA, { recursive: true });

// --- l'app dei clienti -------------------------------------------------
generaIcona(`${CARTELLA}/icon-192.png`, 192);
generaIcona(`${CARTELLA}/icon-512.png`, 512);
// Le icone mascherabili vengono ritagliate da Android: il segno sta più stretto.
generaIcona(`${CARTELLA}/icon-maskable-512.png`, 512, { zonaSicura: 0.72 });
// iOS ignora il manifest e usa questa (vedi index.html).
generaIcona(`${CARTELLA}/apple-touch-icon.png`, 180);

// --- l'agenda del titolare --------------------------------------------
const AGENDA = { segno: dentroIlSegnoAgenda, fondo: CUOIO_SCURO };
generaIcona(`${CARTELLA}/agenda-192.png`, 192, AGENDA);
generaIcona(`${CARTELLA}/agenda-512.png`, 512, AGENDA);
generaIcona(`${CARTELLA}/agenda-maskable-512.png`, 512, { ...AGENDA, zonaSicura: 0.72 });
generaIcona(`${CARTELLA}/agenda-apple-touch.png`, 180, AGENDA);

console.log('fatto');
