import type { CSSProperties } from 'react';

// Il fogliame che invade le fasce della pagina.
//
// STORIA DEGLI ERRORI, perché spiegano com'è fatto adesso.
//
// 1. Prima le foglie stavano solo NEGLI ANGOLI. Con quattro posizioni la
//    simmetria non era un difetto di gusto, era obbligata.
// 2. Poi crescevano lungo il bordo alto o quello basso. Meglio, ma due bordi
//    su quattro danno righe: sparse in orizzontale, allineate in verticale.
//    Adesso spuntano da TUTTI E QUATTRO i lati, in punti irregolari.
// 3. Le foglie uscivano dal bordo di una percentuale messa a occhio e di
//    alcune restava dentro il solo picciolo. Misurando l'inchiostro riga per
//    riga si scopre che il gambo è il 9-20% del disegno: oltre quella soglia
//    si taglia la lamina. Ora ogni disegno ha il suo PICCIOLO misurato.
//
// LA REGOLA CHE COMANDA TUTTO: una pianta entra dal picciolo e punta verso il
// centro. In natura il gambo viene da fuori — dal vaso, dal terreno — e la
// foglia si apre verso l'interno. In tutti e cinque i disegni il picciolo sta
// in basso, quindi la rotazione la decide il lato:
//   basso 0°, alto 180°, sinistro 90°, destro -90°
// più uno scarto di una ventina di gradi, che toglie l'aria di griglia senza
// mai girare la punta verso l'esterno.
//
// LA PROFONDITÀ: una foresta non è una fila, sono piani. Le piccole stanno
// più dentro e la maschera — che si spegne andando verso il centro — le
// sbiadisce da sola, come la foschia con gli alberi in fondo. Nell'elenco il
// fondale viene per primo: chi è disegnato prima finisce sotto.
//
// Il disordine è scritto a mano una volta e resta sempre quello. Non è
// casuale a ogni caricamento: la pagina ballerebbe a ogni visita e non si
// potrebbe più correggere una pianta venuta male.
//
// Sono SVG: 18-34 kB compressi, nitidi a qualunque misura, e le stesse cinque
// immagini ripetute cinquanta volte restano cinque scaricamenti.
//
// Incisioni botaniche — attribuzione nel piede del sito.

type Disegno =
  | 'foglia-lancia'
  | 'foglia-larga'
  | 'foglia-sottile'
  | 'monstera-incisa'
  | 'palma';

type Bordo = 'alto' | 'basso' | 'sinistro' | 'destro';

/** Proporzione di ogni disegno, dal suo viewBox. */
const RAPPORTO: Record<Disegno, number> = {
  'foglia-lancia': 1232 / 1885,
  'foglia-larga': 1204 / 1305,
  'foglia-sottile': 1012 / 1756,
  'monstera-incisa': 1204 / 1305,
  palma: 1584 / 2041,
};

/**
 * Quanta parte del disegno, dal basso, è picciolo o spazio vuoto.
 *
 * Misurato sull'inchiostro riga per riga: si guarda da sotto quante righe
 * hanno un tratto stretto — meno del 18% della larghezza massima — prima che
 * cominci la lamina. È la quota che può uscire dal bordo senza perdere niente
 * di quello che si deve vedere.
 */
const PICCIOLO: Record<Disegno, number> = {
  'foglia-lancia': 9,
  'foglia-larga': 20,
  'foglia-sottile': 11,
  'monstera-incisa': 9,
  palma: 9,
};

/** Rotazione che mette il picciolo fuori e la punta verso il centro. */
const VERSO: Record<Bordo, number> = {
  basso: 0,
  alto: 180,
  sinistro: 90,
  destro: -90,
};

/**
 * Le misure sono in vw: con una misura fissa la stessa foglia era un
 * dettaglio su un monitor da 2000 px e mezza pagina su un portatile da 800.
 * Sul telefono la frazione è più grande perché lo schermo è stretto.
 */
type Misura = 'grande' | 'media' | 'piccola' | 'minuta';
const LARGHEZZA: Record<Misura, [telefono: number, schermo: number]> = {
  grande: [64, 21],
  media: [50, 16],
  piccola: [38, 12],
  minuta: [28, 8],
};

type Pianta = {
  disegno: Disegno;
  misura: Misura;
  /** da quale lato spunta */
  bordo: Bordo;
  /** dove sta lungo quel lato, in percentuale */
  lungo: number;
  /** scarto dalla rotazione del lato, in gradi: mai oltre ±25 */
  giro: number;
  /** quanto esce OLTRE il picciolo, in punti percentuali dell'altezza */
  extra?: number;
  /** quanto rientra rispetto al bordo: è quello che dà la profondità */
  dentro?: number;
  specchia?: boolean;
  /** le piante di contorno: sul telefono coprirebbero il testo */
  soloDaTablet?: boolean;
};

/**
 * Le macchie di vegetazione. Le posizioni non sono mai equidistanti e i lati
 * si alternano: bastano due piante alla stessa distanza dai due bordi per far
 * tornare l'aria di aiuola. Prima il fondale, poi il primo piano.
 */
const MACCHIE = {
  // Il bosco fitto dell'apertura: piante da tutti e quattro i lati.
  bosco: [
    { disegno: 'foglia-larga', misura: 'minuta', bordo: 'basso', lungo: 17, giro: -9, dentro: 8, soloDaTablet: true },
    { disegno: 'palma', misura: 'piccola', bordo: 'sinistro', lungo: 68, giro: 14, dentro: 5, soloDaTablet: true },
    { disegno: 'foglia-sottile', misura: 'minuta', bordo: 'alto', lungo: 57, giro: 17, dentro: 6, soloDaTablet: true },
    { disegno: 'monstera-incisa', misura: 'piccola', bordo: 'destro', lungo: 31, giro: -12, dentro: 7, soloDaTablet: true },
    { disegno: 'foglia-lancia', misura: 'minuta', bordo: 'basso', lungo: 71, giro: 21, dentro: 11, soloDaTablet: true },
    { disegno: 'palma', misura: 'minuta', bordo: 'alto', lungo: 12, giro: -16, dentro: 9, soloDaTablet: true },
    { disegno: 'foglia-sottile', misura: 'piccola', bordo: 'sinistro', lungo: 24, giro: -20, soloDaTablet: true },
    { disegno: 'foglia-larga', misura: 'piccola', bordo: 'destro', lungo: 78, giro: 11, extra: 3, soloDaTablet: true },
    { disegno: 'monstera-incisa', misura: 'media', bordo: 'alto', lungo: 29, giro: 8, extra: 2 },
    { disegno: 'foglia-lancia', misura: 'media', bordo: 'destro', lungo: 56, giro: -6, soloDaTablet: true },
    { disegno: 'palma', misura: 'grande', bordo: 'basso', lungo: 8, giro: 9 },
    { disegno: 'palma', misura: 'media', bordo: 'basso', lungo: 87, giro: -13, extra: 3, specchia: true },
  ],
  // Più rada, per le fasce dove il contenuto arriva vicino ai bordi.
  radura: [
    { disegno: 'foglia-sottile', misura: 'minuta', bordo: 'sinistro', lungo: 27, giro: 13, dentro: 7, soloDaTablet: true },
    { disegno: 'palma', misura: 'minuta', bordo: 'alto', lungo: 63, giro: -11, dentro: 9, soloDaTablet: true },
    { disegno: 'foglia-larga', misura: 'piccola', bordo: 'destro', lungo: 19, giro: 16, dentro: 4, soloDaTablet: true },
    { disegno: 'foglia-lancia', misura: 'piccola', bordo: 'basso', lungo: 41, giro: -18, extra: 4, soloDaTablet: true },
    { disegno: 'monstera-incisa', misura: 'media', bordo: 'sinistro', lungo: 82, giro: -7 },
    { disegno: 'palma', misura: 'media', bordo: 'destro', lungo: 64, giro: 10, extra: 2 },
    { disegno: 'foglia-larga', misura: 'media', bordo: 'basso', lungo: 93, giro: 6, soloDaTablet: true },
  ],
  // Sottobosco: tutto in basso e ai lati, niente in cima.
  sottobosco: [
    { disegno: 'palma', misura: 'minuta', bordo: 'basso', lungo: 31, giro: 15, dentro: 10, soloDaTablet: true },
    { disegno: 'foglia-sottile', misura: 'minuta', bordo: 'destro', lungo: 74, giro: -13, dentro: 6, soloDaTablet: true },
    { disegno: 'foglia-lancia', misura: 'piccola', bordo: 'sinistro', lungo: 46, giro: 19, dentro: 3, soloDaTablet: true },
    { disegno: 'monstera-incisa', misura: 'piccola', bordo: 'basso', lungo: 58, giro: -9, extra: 3, soloDaTablet: true },
    { disegno: 'foglia-larga', misura: 'media', bordo: 'destro', lungo: 28, giro: 12, soloDaTablet: true },
    { disegno: 'palma', misura: 'grande', bordo: 'basso', lungo: 12, giro: -7 },
    { disegno: 'monstera-incisa', misura: 'media', bordo: 'basso', lungo: 84, giro: 11, extra: 2 },
  ],
  // Chioma: tutto in alto e ai lati, per le fasce che poggiano su un'altra.
  chioma: [
    { disegno: 'foglia-sottile', misura: 'minuta', bordo: 'alto', lungo: 22, giro: -14, dentro: 8, soloDaTablet: true },
    { disegno: 'palma', misura: 'piccola', bordo: 'sinistro', lungo: 34, giro: 17, dentro: 5, soloDaTablet: true },
    { disegno: 'foglia-lancia', misura: 'minuta', bordo: 'destro', lungo: 61, giro: -20, dentro: 7, soloDaTablet: true },
    { disegno: 'monstera-incisa', misura: 'piccola', bordo: 'alto', lungo: 76, giro: 9, extra: 4, soloDaTablet: true },
    { disegno: 'foglia-larga', misura: 'media', bordo: 'alto', lungo: 14, giro: 13 },
    { disegno: 'palma', misura: 'media', bordo: 'destro', lungo: 24, giro: -8, soloDaTablet: true },
    { disegno: 'foglia-larga', misura: 'grande', bordo: 'alto', lungo: 68, giro: -11, extra: 2 },
  ],
} satisfies Record<string, Pianta[]>;

export type NomeMacchia = keyof typeof MACCHIE;

/** Da dove parte la sfumatura, per ognuno dei quattro lati. */
const SFUMATURA: Record<Bordo, string> = {
  basso: 'to top',
  alto: 'to bottom',
  sinistro: 'to right',
  destro: 'to left',
};

/**
 * Dove finisce una pianta.
 *
 * Il centro della foglia si mette sul bordo, poi la si tira indietro finché
 * fuori resta solo il picciolo. Un unico calcolo per tutti e quattro i lati,
 * perché la `translateY` viene DOPO la rotazione: agisce lungo l'asse della
 * foglia — dalla punta al gambo — e non lungo quello dello schermo.
 */
function posizione(p: Pianta): CSSProperties {
  const ancoraggio: Record<Bordo, { left: string; top: string }> = {
    basso: { left: `${p.lungo}%`, top: '100%' },
    alto: { left: `${p.lungo}%`, top: '0%' },
    sinistro: { left: '0%', top: `${p.lungo}%` },
    destro: { left: '100%', top: `${p.lungo}%` },
  };
  const rientro = PICCIOLO[p.disegno] + (p.extra ?? 0) - 50 - (p.dentro ?? 0);

  return {
    ...ancoraggio[p.bordo],
    transform:
      `translate(-50%, -50%) rotate(${VERSO[p.bordo] + p.giro}deg) ` +
      `translateY(${rientro}%)${p.specchia ? ' scaleX(-1)' : ''}`,
  };
}

export default function Decoro({
  macchia,
  suScuro = false,
}: {
  macchia: NomeMacchia;
  /** true sulle fasce scure: il tratto va schiarito invece che scurito */
  suScuro?: boolean;
}) {
  const piante = MACCHIE[macchia] as Pianta[];

  // Una sfumatura per ogni lato da cui spunta qualcosa, tutte unite: "add"
  // (in index.css) tiene quel che è visibile nell'uno O nell'altro.
  // Sovrapposte normalmente, l'ultima cancellerebbe le altre.
  const lati = [...new Set(piante.map((p) => p.bordo))];
  const maschera = lati
    .map(
      (b) =>
        `linear-gradient(${SFUMATURA[b]}, transparent 0, #000 2.5rem, #000 30%, transparent 78%)`,
    )
    .join(', ');

  return (
    <span
      aria-hidden="true"
      className={`decoro ${suScuro ? 'decoro-su-scuro' : ''} pointer-events-none absolute inset-0 block overflow-hidden`}
      style={{ '--sfuma': maschera } as CSSProperties}
    >
      {piante.map((p, i) => {
        const [telefono, schermo] = LARGHEZZA[p.misura];
        return (
          <img
            key={`${p.disegno}-${i}`}
            src={`/sfondi/${p.disegno}.svg`}
            alt=""
            loading="lazy"
            decoding="async"
            style={
              {
                ...posizione(p),
                '--larga-telefono': `${telefono}vw`,
                '--larga-schermo': `${schermo}vw`,
                aspectRatio: String(RAPPORTO[p.disegno]),
              } as CSSProperties
            }
            className={`absolute max-w-none select-none ${
              p.soloDaTablet ? 'hidden md:block' : 'block'
            }`}
          />
        );
      })}
    </span>
  );
}
