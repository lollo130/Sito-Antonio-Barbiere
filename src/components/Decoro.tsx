import type { CSSProperties } from 'react';

// La cornice di fogliame lungo i bordi della fascia (border-blooming).
//
// LE REGOLE, in ordine di importanza.
//
// 1. ANCORAGGIO AI QUATTRO LATI. Ogni pianta nasce da un bordo — alto, basso,
//    sinistro o destro — e ci resta attaccata. Non ci sono piante a mezz'aria
//    dentro la fascia: quello che si vuole è una cornice, e una cornice sta
//    sul perimetro. È l'errore che ha fatto sembrare "buttata lì" la versione
//    precedente: le piante si staccavano dal bordo di quantità diverse e il
//    perimetro spariva.
//
// 2. IL PICCIOLO ESCE, LA PUNTA GUARDA DENTRO. In natura il gambo viene da
//    fuori — dal terreno, dal vaso, dal ramo — e la foglia si apre verso
//    l'interno. In tutti e cinque i disegni il picciolo sta in basso, quindi
//    la rotazione la decide il lato: 0° in basso, 180° in alto, 90° a
//    sinistra, -90° a destra. Lo scarto sta fra -25° e +35°: abbastanza da
//    non sembrare stampini, mai tanto da girare la punta verso l'esterno.
//    Quanto esce è misurato e non messo a occhio: il gambo è il 9-20% del
//    disegno a seconda di quale, e oltre quella soglia si taglia la lamina.
//
// 3. DUE PIANI DI PROFONDITÀ. Lo sfondo è più sbiadito (0.12) e il primo
//    piano più netto (0.25). Sono due gruppi separati, non due opacità sulle
//    singole foglie, e la differenza conta: dentro un gruppo le foglie si
//    COPRONO — quella sopra nasconde quella sotto, come due foglie vere —
//    perché la fusione agisce sul gruppo intero. Con l'opacità messa su ogni
//    foglia si vedrebbero di nuovo l'una attraverso l'altra. Fra i due gruppi
//    invece la trasparenza resta, ed è giusta: è la foschia che separa quello
//    che sta dietro da quello che sta davanti.
//
// 4. IL CONTENUTO NON SI TOCCA. `pointer-events: none` e z-index esplicito:
//    la cornice sta sotto (z-0), il contenuto sopra (z-10). Le foglie non
//    intercettano mai un tocco e non passano mai davanti a un testo, a un
//    bottone o a una scheda. La maschera le spegne comunque prima che
//    arrivino al centro.
//
// Il disordine è scritto a mano una volta e resta sempre quello. Non è
// casuale a ogni caricamento: la pagina ballerebbe a ogni visita e non si
// potrebbe più correggere una pianta venuta male.
//
// Sono SVG: 18-34 kB compressi, nitidi a qualunque misura, e le stesse cinque
// immagini ripetute quaranta volte restano cinque scaricamenti.
//
// Incisioni botaniche — attribuzione nel piede del sito.

type Disegno =
  | 'foglia-lancia'
  | 'foglia-larga'
  | 'foglia-sottile'
  | 'monstera-incisa'
  | 'palma';

type Bordo = 'alto' | 'basso' | 'sinistro' | 'destro';
type Piano = 'sfondo' | 'primo';

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

/** Da dove parte la sfumatura, per ognuno dei quattro lati. */
const SFUMATURA: Record<Bordo, string> = {
  basso: 'to top',
  alto: 'to bottom',
  sinistro: 'to right',
  destro: 'to left',
};

type Pianta = {
  disegno: Disegno;
  /** da quale lato nasce */
  bordo: Bordo;
  /** dove sta lungo quel lato, in percentuale */
  lungo: number;
  /** scarto dalla rotazione del lato: fra -25 e +35 gradi */
  giro: number;
  /**
   * Larghezza su schermo grande, in vw. Numero libero e non una taglia
   * prestabilita: sono le misure tutte leggermente diverse a togliere la
   * ripetizione, e con quattro taglie fisse tornavano gli stampini.
   * Sul telefono la stessa foglia va molto più larga in proporzione, perché
   * lo schermo è stretto: ci pensa `PER_TELEFONO`.
   */
  vw: number;
  piano: Piano;
  /** quanto esce OLTRE il picciolo, in punti percentuali dell'altezza */
  extra?: number;
  specchia?: boolean;
  /** le piante di contorno: sul telefono coprirebbero il testo */
  soloDaTablet?: boolean;
};

/** Quanto ingrandire le foglie sul telefono. */
const PER_TELEFONO = 2.9;

/**
 * La cornice, lato per lato.
 *
 * Le posizioni non sono mai equidistanti e non si specchiano fra i lati
 * opposti: bastano due piante alla stessa distanza dai due bordi per far
 * tornare l'aria di griglia. Gli angoli sono un po' più fitti, come in una
 * ghirlanda vera, e i lati lunghi hanno vuoti larghi in mezzo.
 */
const MACCHIE = {
  // Cornice piena su tutti e quattro i lati: per l'apertura, che è alta e non
  // ha contenuto vicino ai bordi.
  cornicePiena: [
    // --- sfondo ---
    { disegno: 'foglia-larga', bordo: 'basso', lungo: 21, giro: -14, vw: 11, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-sottile', bordo: 'alto', lungo: 47, giro: 22, vw: 9.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'sinistro', lungo: 61, giro: 31, vw: 12, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'monstera-incisa', bordo: 'destro', lungo: 37, giro: -19, vw: 10.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-lancia', bordo: 'basso', lungo: 66, giro: 27, vw: 8.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'alto', lungo: 81, giro: -11, vw: 10, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-sottile', bordo: 'destro', lungo: 72, giro: 16, vw: 9, piano: 'sfondo', soloDaTablet: true },
    // --- primo piano ---
    { disegno: 'palma', bordo: 'basso', lungo: 7, giro: 12, vw: 20, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'alto', lungo: 16, giro: -8, vw: 15, extra: 2, piano: 'primo' },
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 14, giro: 24, vw: 13, piano: 'primo', soloDaTablet: true },
    { disegno: 'foglia-lancia', bordo: 'sinistro', lungo: 28, giro: -21, vw: 12.5, piano: 'primo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'basso', lungo: 43, giro: -17, vw: 14, specchia: true, piano: 'primo', soloDaTablet: true },
    { disegno: 'foglia-sottile', bordo: 'alto', lungo: 63, giro: 33, vw: 11.5, piano: 'primo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'basso', lungo: 89, giro: -13, vw: 17, extra: 3, specchia: true, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'destro', lungo: 88, giro: 9, vw: 12, piano: 'primo', soloDaTablet: true },
  ],
  // Cornice bassa: niente in cima, per le fasce col titolo in alto.
  corniceBassa: [
    { disegno: 'foglia-sottile', bordo: 'basso', lungo: 34, giro: 19, vw: 9, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'sinistro', lungo: 71, giro: -16, vw: 10.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'destro', lungo: 48, giro: 28, vw: 11, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-lancia', bordo: 'basso', lungo: 76, giro: -23, vw: 8.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'monstera-incisa', bordo: 'basso', lungo: 11, giro: 14, vw: 16, piano: 'primo' },
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 82, giro: -12, vw: 12.5, piano: 'primo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'basso', lungo: 57, giro: 31, vw: 13.5, piano: 'primo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'sinistro', lungo: 33, giro: -18, vw: 12, piano: 'primo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'basso', lungo: 93, giro: 8, vw: 15, extra: 2, piano: 'primo' },
  ],
  // Cornice alta: niente in fondo, per le fasce che poggiano su un'altra.
  corniceAlta: [
    { disegno: 'foglia-lancia', bordo: 'alto', lungo: 29, giro: -20, vw: 9.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'destro', lungo: 63, giro: 25, vw: 11, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-sottile', bordo: 'sinistro', lungo: 42, giro: -13, vw: 10, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'alto', lungo: 71, giro: 17, vw: 10.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'alto', lungo: 13, giro: 11, vw: 16, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'alto', lungo: 52, giro: -15, vw: 13, piano: 'primo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'sinistro', lungo: 18, giro: 34, vw: 12.5, piano: 'primo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'alto', lungo: 86, giro: -9, vw: 15, extra: 2, piano: 'primo' },
    { disegno: 'foglia-lancia', bordo: 'destro', lungo: 24, giro: 21, vw: 11.5, piano: 'primo', soloDaTablet: true },
  ],
  // Seconda cornice bassa: stesse regole, numeri tutti diversi. Due fasce
  // con la stessa disposizione si riconoscono a colpo d'occhio scorrendo, ed
  // e' esattamente l'effetto griglia che si vuole togliere.
  corniceBassaBis: [
    { disegno: 'foglia-lancia', bordo: 'basso', lungo: 26, giro: -22, vw: 9.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'sinistro', lungo: 55, giro: 23, vw: 11.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 36, giro: -10, vw: 10, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-sottile', bordo: 'basso', lungo: 68, giro: 30, vw: 8, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'basso', lungo: 15, giro: 18, vw: 17, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'destro', lungo: 69, giro: -24, vw: 13, piano: 'primo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'basso', lungo: 47, giro: -7, vw: 12.5, piano: 'primo', soloDaTablet: true },
    { disegno: 'foglia-lancia', bordo: 'sinistro', lungo: 22, giro: 35, vw: 11, piano: 'primo', soloDaTablet: true },
    { disegno: 'monstera-incisa', bordo: 'basso', lungo: 86, giro: 26, vw: 15.5, extra: 2, piano: 'primo' },
  ],
  // Seconda cornice alta, stesso ragionamento.
  corniceAltaBis: [
    { disegno: 'foglia-larga', bordo: 'alto', lungo: 38, giro: 29, vw: 10, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-sottile', bordo: 'destro', lungo: 52, giro: -17, vw: 9.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'sinistro', lungo: 66, giro: 20, vw: 11, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'monstera-incisa', bordo: 'alto', lungo: 79, giro: -6, vw: 10.5, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'monstera-incisa', bordo: 'alto', lungo: 19, giro: -25, vw: 15.5, piano: 'primo' },
    { disegno: 'foglia-lancia', bordo: 'destro', lungo: 31, giro: 15, vw: 12, piano: 'primo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'sinistro', lungo: 47, giro: -4, vw: 11.5, piano: 'primo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'alto', lungo: 58, giro: 32, vw: 13, piano: 'primo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'alto', lungo: 91, giro: -19, vw: 14.5, extra: 2, piano: 'primo' },
  ],
} satisfies Record<string, Pianta[]>;

export type NomeMacchia = keyof typeof MACCHIE;

/**
 * Dove finisce una pianta.
 *
 * Il centro della foglia si mette sul bordo, poi la si tira indietro finché
 * fuori resta solo il picciolo. Un unico calcolo per tutti e quattro i lati,
 * perché la `translateY` viene DOPO la rotazione: agisce lungo l'asse della
 * foglia — dalla punta al gambo — e non lungo quello dello schermo. Con
 * l'ordine invertito servirebbero quattro formule diverse.
 */
function posizione(p: Pianta): CSSProperties {
  const ancoraggio: Record<Bordo, { left: string; top: string }> = {
    basso: { left: `${p.lungo}%`, top: '100%' },
    alto: { left: `${p.lungo}%`, top: '0%' },
    sinistro: { left: '0%', top: `${p.lungo}%` },
    destro: { left: '100%', top: `${p.lungo}%` },
  };
  const rientro = PICCIOLO[p.disegno] + (p.extra ?? 0) - 50;

  return {
    ...ancoraggio[p.bordo],
    transform:
      `translate(-50%, -50%) rotate(${VERSO[p.bordo] + p.giro}deg) ` +
      `translateY(${rientro}%)${p.specchia ? ' scaleX(-1)' : ''}`,
  };
}

function Strato({
  piante,
  piano,
  suScuro,
}: {
  piante: Pianta[];
  piano: Piano;
  suScuro: boolean;
}) {
  if (piante.length === 0) return null;

  // Una sfumatura per ogni lato da cui nasce qualcosa, tutte unite: "add"
  // (in index.css) tiene quel che è visibile in una QUALUNQUE di esse.
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
      className={`decoro ${piano === 'sfondo' ? 'decoro-sfondo' : ''} ${
        suScuro ? 'decoro-su-scuro' : ''
      } pointer-events-none absolute inset-0 z-0 block overflow-hidden`}
      style={{ '--sfuma': maschera } as CSSProperties}
    >
      {piante.map((p, i) => (
        <img
          key={`${p.disegno}-${i}`}
          src={`/sfondi/${p.disegno}.svg`}
          alt=""
          loading="lazy"
          decoding="async"
          style={
            {
              ...posizione(p),
              '--larga-telefono': `${(p.vw * PER_TELEFONO).toFixed(1)}vw`,
              '--larga-schermo': `${p.vw}vw`,
              aspectRatio: String(RAPPORTO[p.disegno]),
            } as CSSProperties
          }
          className={`absolute max-w-none select-none ${
            p.soloDaTablet ? 'hidden md:block' : 'block'
          }`}
        />
      ))}
    </span>
  );
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

  return (
    <>
      <Strato piante={piante.filter((p) => p.piano === 'sfondo')} piano="sfondo" suScuro={suScuro} />
      <Strato piante={piante.filter((p) => p.piano === 'primo')} piano="primo" suScuro={suScuro} />
    </>
  );
}
