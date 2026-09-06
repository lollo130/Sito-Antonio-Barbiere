import type { CSSProperties } from 'react';

// La cornice di fogliame lungo i bordi della fascia (border-blooming).
//
// LE REGOLE, in ordine di importanza.
//
// 1. OGNI FOGLIA SI MISURA SULL'ASSE DEL PROPRIO BORDO. Quelle sopra e sotto
//    in percentuale della LARGHEZZA, quelle a sinistra e a destra in
//    percentuale dell'ALTEZZA. Sembra un dettaglio ed è invece la regola che
//    tiene in piedi tutto il resto: lungo un bordo, l'ingombro di una foglia
//    e la distanza dalla vicina diventano grandezze omogenee, quindi due
//    foglie che non si toccano su un monitor non si toccano nemmeno su un
//    telefono. Misurando tutto in `vw`, come si faceva prima, l'ingombro
//    verticale di una foglia laterale dipendeva dalla larghezza dello schermo
//    e la distanza dall'altezza della fascia: due grandezze scollegate, e le
//    sovrapposizioni ricomparivano appena si cambiava finestra.
//
// 2. NIENTE ACCAVALLAMENTI. Lungo ogni bordo le foglie sono distanziate più
//    della somma dei loro mezzi ingombri. È il motivo per cui sono poche: su
//    un bordo orizzontale restano liberi solo gli spicchi fuori dalla colonna
//    del testo, e in 18 punti percentuali non ci stanno cinque foglie larghe
//    15 senza pestarsi.
//
// 3. IL PICCIOLO ESCE, LA PUNTA GUARDA DENTRO. In natura il gambo viene da
//    fuori e la foglia si apre verso l'interno. In tutti e cinque i disegni il
//    picciolo sta in basso, quindi la rotazione la decide il lato: 0° in
//    basso, 180° in alto, 90° a sinistra, -90° a destra, più uno scarto fra
//    -25° e +35°. L'ancoraggio cade 20 px OLTRE il bordo: la pianta parte da
//    fuori inquadratura e penetra verso l'interno.
//
// 4. DUE PIANI DI PROFONDITÀ. Sfondo a 0.12, primo piano a 0.25. Sono due
//    gruppi separati e non due opacità sulle singole foglie: la fusione
//    agisce sull'insieme, ed è anche quello che permette alle foglie di
//    dissolversi davvero invece di sbiadire una sopra l'altra.
//
// 5. NIENTE TAGLI NETTI. La maschera parte trasparente sul bordo, diventa
//    piena poco dentro, e poi si spegne con una rampa lunga: la foglia si
//    dissolve fino a sparire, non finisce di colpo. Al centro si SOTTRAE la
//    zona sicura del testo, anche quella col bordo sfumato.
//
// 6. IL CONTENUTO NON SI TOCCA. `pointer-events: none` e z-index dichiarati:
//    cornice a 0, contenuto a 10.
//
// Il disordine è scritto a mano una volta e resta sempre quello. Non è
// casuale a ogni caricamento: la pagina ballerebbe a ogni visita e non si
// potrebbe più correggere una pianta venuta male.
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

const eVerticale = (b: Bordo) => b === 'sinistro' || b === 'destro';

type Pianta = {
  disegno: Disegno;
  /** da quale lato nasce */
  bordo: Bordo;
  /** dove sta lungo quel lato, in percentuale */
  lungo: number;
  /** scarto dalla rotazione del lato: fra -25 e +35 gradi */
  giro: number;
  /**
   * Quanto occupa LUNGO IL PROPRIO BORDO, in percentuale della lunghezza di
   * quel bordo. Sui bordi orizzontali è la larghezza, su quelli verticali
   * l'altezza. Così è confrontabile con `lungo`, ed è quello che permette di
   * dire "queste due non si toccano" e che resti vero su ogni schermo.
   */
  ingombro: number;
  piano: Piano;
  /** quanto esce OLTRE il picciolo, in punti percentuali dell'altezza */
  extra?: number;
  specchia?: boolean;
  /** le piante che sul telefono coprirebbero il testo */
  soloDaTablet?: boolean;
};

/**
 * Quanto ingrandire le foglie sul telefono.
 *
 * Uno schermo stretto ha bisogno di frazioni più grandi perché la stessa
 * percentuale vale molti meno pixel. Il fattore è diverso per i due assi: in
 * larghezza il telefono è molto più stretto di un monitor, in altezza no.
 */
const PER_TELEFONO = { orizzontale: 2.4, verticale: 1.15 };

/**
 * La zona al centro dove il testo deve restare pulito, come misure
 * dell'ellisse da sottrarre alla maschera. Generosa di proposito: meglio
 * qualche foglia in meno che una parola coperta, e il pubblico di questo sito
 * legge male già di suo.
 */
const ZONA_SICURA = '46% 48%';

/**
 * La cornice, lato per lato.
 *
 * Poche e distanziate: lungo ogni bordo la distanza fra due vicine supera la
 * somma dei loro mezzi ingombri, con margine. I bordi orizzontali hanno
 * foglie solo negli spicchi fuori dalla colonna del testo (sotto il 18% e
 * sopra l'82%), quindi ne reggono due per lato e non di più.
 */
const MACCHIE = {
  // Apertura: una foglia per lato verticale a meta' bordo, due per angolo in
  // alto e in basso.
  cornicePiena: [
    { disegno: 'foglia-sottile', bordo: 'destro', lungo: 50, giro: -18, ingombro: 30, piano: 'sfondo' },
    { disegno: 'foglia-larga', bordo: 'alto', lungo: 91, giro: -12, ingombro: 12, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'basso', lungo: 8, giro: 16, ingombro: 13, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'sinistro', lungo: 50, giro: 27, ingombro: 33, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'alto', lungo: 9, giro: 13, ingombro: 11, extra: 2, piano: 'primo', soloDaTablet: true },
    { disegno: 'foglia-lancia', bordo: 'basso', lungo: 92, giro: -9, ingombro: 13, piano: 'primo', soloDaTablet: true },
  ],
  // Cornice bassa: niente in cima, per le fasce col titolo in alto.
  corniceBassa: [
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 50, giro: -15, ingombro: 30, piano: 'sfondo' },
    { disegno: 'foglia-lancia', bordo: 'basso', lungo: 90, giro: 22, ingombro: 12, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'monstera-incisa', bordo: 'sinistro', lungo: 50, giro: 28, ingombro: 30, piano: 'primo' },
    { disegno: 'palma', bordo: 'basso', lungo: 9, giro: -11, ingombro: 11, piano: 'primo', soloDaTablet: true },
  ],
  // Cornice alta: niente in fondo, per le fasce che poggiano su un'altra.
  corniceAlta: [
    { disegno: 'palma', bordo: 'sinistro', lungo: 50, giro: 19, ingombro: 33, piano: 'sfondo' },
    { disegno: 'foglia-sottile', bordo: 'alto', lungo: 8, giro: -23, ingombro: 11, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 50, giro: -7, ingombro: 30, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'alto', lungo: 92, giro: 34, ingombro: 13, extra: 2, piano: 'primo', soloDaTablet: true },
  ],
  // Seconda cornice bassa: stesse regole, numeri diversi. Due fasce con la
  // stessa disposizione si riconoscono a colpo d'occhio scorrendo.
  corniceBassaBis: [
    { disegno: 'foglia-sottile', bordo: 'sinistro', lungo: 50, giro: -26, ingombro: 34, piano: 'sfondo' },
    { disegno: 'palma', bordo: 'basso', lungo: 88, giro: 12, ingombro: 13, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 50, giro: 17, ingombro: 34, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'basso', lungo: 11, giro: -14, ingombro: 11, piano: 'primo', soloDaTablet: true },
  ],
  // Seconda cornice alta, stesso ragionamento.
  corniceAltaBis: [
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 50, giro: -20, ingombro: 30, piano: 'sfondo' },
    { disegno: 'foglia-lancia', bordo: 'alto', lungo: 89, giro: 15, ingombro: 12, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'monstera-incisa', bordo: 'sinistro', lungo: 50, giro: 30, ingombro: 30, piano: 'primo' },
    { disegno: 'palma', bordo: 'alto', lungo: 10, giro: -8, ingombro: 11, extra: 2, piano: 'primo', soloDaTablet: true },
  ],
} satisfies Record<string, Pianta[]>;

export type NomeMacchia = keyof typeof MACCHIE;

/**
 * Dove finisce una pianta.
 *
 * Il centro della foglia si mette 20 px oltre il bordo, poi la si tira
 * indietro finché fuori resta solo il picciolo. Un unico calcolo per tutti e
 * quattro i lati, perché la `translateY` viene DOPO la rotazione: agisce lungo
 * l'asse della foglia — dalla punta al gambo — e non lungo quello dello
 * schermo. Con l'ordine invertito servirebbero quattro formule diverse.
 */
function posizione(p: Pianta): CSSProperties {
  const FUORI = '1.25rem';
  const ancoraggio: Record<Bordo, { left: string; top: string }> = {
    basso: { left: `${p.lungo}%`, top: `calc(100% + ${FUORI})` },
    alto: { left: `${p.lungo}%`, top: `-${FUORI}` },
    sinistro: { left: `-${FUORI}`, top: `${p.lungo}%` },
    destro: { left: `calc(100% + ${FUORI})`, top: `${p.lungo}%` },
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

  // Una sfumatura per ogni lato da cui nasce qualcosa, tutte UNITE ("add" in
  // index.css): un punto si vede se è visibile in una qualunque di esse. Poi
  // si SOTTRAE la zona sicura del testo. Entrambe con rampe lunghe: le foglie
  // si dissolvono fino a sparire invece di finire di colpo.
  const lati = [...new Set(piante.map((p) => p.bordo))];
  const maschera = [
    ...lati.map(
      (b) =>
        `linear-gradient(${SFUMATURA[b]}, transparent 0, #000 2rem, #000 14%, transparent 92%)`,
    ),
    `radial-gradient(${ZONA_SICURA} at 50% 43%, #000 46%, transparent 100%)`,
  ].join(', ');
  const composizione = [...lati.map(() => 'add'), 'subtract'].join(', ');

  return (
    <span
      aria-hidden="true"
      className={`decoro ${piano === 'sfondo' ? 'decoro-sfondo' : ''} ${
        suScuro ? 'decoro-su-scuro' : ''
      } pointer-events-none absolute inset-0 z-0 block overflow-hidden`}
      style={{ '--sfuma': maschera, '--composizione': composizione } as CSSProperties}
    >
      {piante.map((p, i) => {
        const verticale = eVerticale(p.bordo);
        const fattore = verticale ? PER_TELEFONO.verticale : PER_TELEFONO.orizzontale;
        // cqh = percentuale dell'altezza della fascia, cqw della larghezza.
        const unita = verticale ? 'cqh' : 'cqw';
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
                '--ingombro-telefono': `${(p.ingombro * fattore).toFixed(1)}${unita}`,
                '--ingombro-schermo': `${p.ingombro}${unita}`,
                aspectRatio: String(RAPPORTO[p.disegno]),
              } as CSSProperties
            }
            className={`absolute max-w-none select-none ${
              verticale ? 'pianta-verticale' : 'pianta-orizzontale'
            } ${p.soloDaTablet ? 'hidden md:block' : 'block'}`}
          />
        );
      })}
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
