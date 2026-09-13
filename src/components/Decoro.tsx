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
// 2. NIENTE ACCAVALLAMENTI FRA CESPI DIVERSI — ma DENTRO un cespo sì.
//    Le foglie di uno stesso cespo si coprono, e devono: è quello che le fa
//    leggere come una pianta sola invece che come esemplari da erbario messi
//    in fila. L'occlusione viene giusta da sé, perché il fondo bianco del
//    disegno davanti nasconde quello dietro e "multiply" lo cancella solo
//    dove non c'è niente sotto.
//    Quello che non deve succedere è che due CESPI si tocchino: lì la
//    distanza fra i due cuori deve superare la somma delle loro estensioni,
//    e lo verifica `controllaDistanze()`. Sui bordi orizzontali resta libero
//    solo lo spicchio fuori dalla colonna del testo, quindi lì di cespi ce
//    ne sta uno per angolo e basta.
//    Il controllo confronta solo cespi sullo STESSO bordo, e non è una
//    dimenticanza: due cespi su bordi diversi che si fondono lo fanno in un
//    angolo, ed è esattamente la massa d'angolo che la regola 8 vuole. Lì il
//    fogliame deve accumularsi, non scansarsi.
//
// 3. IL PICCIOLO ESCE, LA PUNTA GUARDA DENTRO. In natura il gambo viene da
//    fuori e la foglia si apre verso l'interno. In tutti i disegni — anche nei
//    sei aggiunti dopo — il picciolo sta in basso: è la condizione per
//    entrare in questo elenco. Quindi la rotazione la decide il lato: 0° in
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
// 7. DUE FAMIGLIE DI DISEGNI, E NON VANNO NELLO STESSO POSTO. Le prime cinque
//    sono incisioni a due toni: quasi tutto bianco, con il tratto scuro
//    sottile. Le sei aggiunte dopo sono dipinti a colori, con larghe campiture
//    verdi. Sulle fasce chiare convivono bene — "multiply" cancella il bianco
//    e restano tratto e campitura, due pesi diversi che fanno profondità. Sul
//    verde scuro no: lì il disegno viene invertito (vedi index.css), e
//    l'inversione di un'incisione è un disegno a linee chiare, mentre
//    l'inversione di un dipinto è una macchia piena. Accostate sulla stessa
//    fascia sembrano due errori. Per questo le dipinte stanno SOLO sulle
//    fasce chiare, ed è un controllo, non un promemoria: vedi `DIPINTE`.
//
// 8. LA COMPOSIZIONE. Le foglie non stanno una ogni tanto lungo il bordo:
//    stanno in CESPI, e i cespi stanno negli angoli. Prima erano distribuite
//    a intervalli regolari, una per volta, e il risultato era un fregio —
//    un motivo ripetuto. Nessuna pianta cresce a intervalli regolari.
//
//    - UN CESPO NASCE DA UN PUNTO SOLO del bordo, e le sue foglie si aprono a
//      ventaglio: più una foglia nasce lontana dal cuore, più è inclinata, e
//      inclinata DALLA PARTE in cui si è spostata. È come si apre una pianta
//      dal colletto, e da solo basta a togliere l'aria di roba appoggiata lì.
//    - DENTRO IL CESPO LA FOGLIA PIÙ GRANDE STA DAVANTI, le piccole dietro.
//      Al contrario si legge come un errore di prospettiva, perché le cose
//      vicine sono più grandi. Qui "davanti" e "dietro" sono i due piani
//      della regola 4, quindi la grandezza e la profondità dicono la stessa
//      cosa invece di contraddirsi.
//    - OGNI FASCIA HA TRE PESI DIVERSI: una massa principale a un angolo, un
//      contrappunto più piccolo dalla parte opposta, e una foglia sola come
//      terzo accento. Tre pesi uguali disposti bene si riconoscono subito
//      come una cosa disegnata a tavolino.
//    - L'ANGOLO CHE PRENDE LA MASSA CAMBIA da una fascia all'altra, così
//      scorrendo la pagina la composizione non si ripete.
//    - UN ANGOLO PER FASCIA RESTA SPOGLIO, di proposito. In natura non c'è
//      niente di distribuito uniformemente, e un fogliame che pareggia i
//      quattro angoli torna a sembrare una cornice stampata.
//
// Il disordine è scritto a mano una volta e resta sempre quello. Non è
// casuale a ogni caricamento: la pagina ballerebbe a ogni visita e non si
// potrebbe più correggere una pianta venuta male.
//
// Illustrazioni botaniche — attribuzione nel piede del sito.

type Disegno =
  // incisioni a due toni
  | 'foglia-lancia'
  | 'foglia-larga'
  | 'foglia-sottile'
  | 'monstera-incisa'
  | 'palma'
  // dipinti a colori
  | 'foglia-zebrata'
  | 'foglia-nastro'
  | 'ciuffo-variegato'
  | 'foglie-appuntite'
  | 'sansevieria'
  | 'calatea-tonda';

/**
 * Le dipinte. Fuori di qui è solo un elenco di nomi; qui è la regola 7.
 */
const DIPINTE = new Set<Disegno>([
  'foglia-zebrata',
  'foglia-nastro',
  'ciuffo-variegato',
  'foglie-appuntite',
  'sansevieria',
  'calatea-tonda',
]);

/**
 * Il formato di ognuna.
 *
 * Cinque delle sei dipinte erano vettori veri sotto un fondo bianco, e vettori
 * sono rimaste. La sesta era un'immagine e basta — nessun tracciato da
 * salvare — e viene servita come WebP con trasparenza. Un'eccezione sola, e
 * dichiarata: il resto del componente non deve sapere che esiste.
 */
const FORMATO: Partial<Record<Disegno, 'webp'>> = {
  'calatea-tonda': 'webp',
};

const fileDi = (d: Disegno) => `/sfondi/${d}.${FORMATO[d] ?? 'svg'}`;

type Bordo = 'alto' | 'basso' | 'sinistro' | 'destro';
type Piano = 'sfondo' | 'primo';

/**
 * Proporzione di ogni disegno, dal suo viewBox.
 * `node scripts/misura-piante.mjs` li rilegge tutti dai file veri.
 */
const RAPPORTO: Record<Disegno, number> = {
  'foglia-lancia': 1232 / 1885,
  'foglia-larga': 1204 / 1305,
  'foglia-sottile': 1012 / 1756,
  'monstera-incisa': 1204 / 1305,
  palma: 1584 / 2041,
  'foglia-zebrata': 1001 / 2078,
  'foglia-nastro': 639 / 1267,
  'ciuffo-variegato': 758 / 749,
  'foglie-appuntite': 543 / 1672,
  sansevieria: 919 / 1578,
  'calatea-tonda': 900 / 884,
};

/**
 * Quanta parte del disegno, dal basso, è picciolo o spazio vuoto.
 *
 * Misurato sull'inchiostro riga per riga: si guarda da sotto quante righe
 * hanno un tratto stretto — meno del 18% della larghezza massima — prima che
 * cominci la lamina. È la quota che può uscire dal bordo senza perdere niente
 * di quello che si deve vedere.
 *
 * La misura sta in `scripts/misura-piante.mjs`, che su queste cinque ritrova
 * esattamente i numeri che erano stati ricavati a mano.
 *
 * I due cespugli — ciuffo e calatea — hanno quote basse non per sbaglio: non
 * hanno un gambo, poggiano a terra. Escono dal bordo di pochissimo, ed è
 * giusto così.
 */
const PICCIOLO: Record<Disegno, number> = {
  'foglia-lancia': 9,
  'foglia-larga': 20,
  'foglia-sottile': 11,
  'monstera-incisa': 9,
  palma: 9,
  'foglia-zebrata': 11,
  'foglia-nastro': 6,
  'ciuffo-variegato': 10,
  'foglie-appuntite': 4,
  sansevieria: 14,
  'calatea-tonda': 2,
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
  /**
   * Da quale cespo viene, es. "sinistro@76". Finisce in `data-cespo` sul
   * disegno: e' l'unico modo, guardando la pagina resa, di sapere quali
   * foglie dovrebbero coprirsi e quali no. Senza, la composizione si puo'
   * solo leggere nel sorgente e sperare.
   */
  cespo: string;
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
 * Una foglia dentro un cespo.
 *
 * Non sa dove si trova sulla fascia: sa solo quanto nasce più in là del cuore
 * del cespo e di quanto si apre. È il punto di tutta la struttura — spostando
 * il cuore si sposta la pianta intera senza toccare un solo rapporto interno,
 * e quei rapporti sono la ragione per cui la pianta sembra una pianta.
 */
type Foglia = {
  disegno: Disegno;
  /**
   * Di quanto nasce più avanti o più indietro del cuore, lungo il bordo, in
   * punti percentuali. Zero è la foglia centrale.
   */
  scarto: number;
  /**
   * Apertura del ventaglio: quanto si scosta dalla perpendicolare al bordo,
   * fra -30 e +35 gradi. Deve avere lo STESSO SEGNO dello scarto e crescere
   * con lui: una foglia nata di lato si apre verso quel lato (regola 8).
   */
  apertura: number;
  ingombro: number;
  piano: Piano;
  extra?: number;
  specchia?: boolean;
  soloDaTablet?: boolean;
};

/**
 * Un cespo: più foglie che nascono dallo stesso punto del bordo.
 *
 * È l'unità della composizione. Le distanze si misurano fra cespi, non fra
 * foglie (regola 2), e la massa di una fascia è un cespo, non una foglia.
 */
type Cespo = {
  bordo: Bordo;
  /** dove sta il cuore del cespo lungo quel bordo, in percentuale */
  ancora: number;
  foglie: Foglia[];
};

/** Dal cespo alle singole piante che il resto del componente sa disegnare. */
function spiega(cespo: Cespo): Pianta[] {
  const identita = `${cespo.bordo}@${cespo.ancora}`;
  return cespo.foglie.map((f) => ({
    disegno: f.disegno,
    cespo: identita,
    bordo: cespo.bordo,
    lungo: cespo.ancora + f.scarto,
    giro: f.apertura,
    ingombro: f.ingombro,
    piano: f.piano,
    extra: f.extra,
    specchia: f.specchia,
    soloDaTablet: f.soloDaTablet,
  }));
}

/**
 * Quanto sporge un cespo dal proprio cuore, in punti percentuali del bordo.
 * Serve a tenere separati due cespi vicini senza guardarne le foglie una a una.
 */
function estensione(cespo: Cespo): number {
  return Math.max(...cespo.foglie.map((f) => Math.abs(f.scarto) + f.ingombro / 2));
}

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
 * Distanziate: lungo ogni bordo la distanza fra due vicine supera la somma dei
 * loro mezzi ingombri, con margine. Non è più una cosa da ricontrollare a
 * mano a ogni ritocco — la verifica `controllaDistanze()`, qui sotto.
 *
 * I bordi orizzontali hanno foglie solo negli spicchi fuori dalla colonna del
 * testo (sotto il 18% e sopra l'82%), quindi ne reggono due per lato e non di
 * più. I bordi verticali invece sono liberi per tutta la loro lunghezza: ne
 * reggono due, e prima ne portavano una sola, piantata esattamente a metà.
 *
 * Quel `lungo: 50` ripetuto era il difetto della vecchia disposizione: dieci
 * fianchi, dieci foglie tutte alla stessa quota, ognuna in faccia alla sua
 * gemella dall'altra parte. Da lontano si leggeva come una simmetria fatta col
 * righello, non come una pianta cresciuta lì. Adesso ogni fianco ne porta due,
 * a quote diverse, di due misure diverse e su due piani diversi; e le quote di
 * sinistra sono sfalsate rispetto a quelle di destra, così la fascia non si
 * specchia mai su sé stessa.
 */
const MACCHIE = {
  // APERTURA — massa in basso a sinistra, contrappunto in alto a destra,
  // accento in basso a destra. In alto a sinistra non c'e' niente, ed e' li'
  // che comincia a leggersi l'insegna.
  // Solo incisioni: e' la fascia scura (regola 7).
  cornicePiena: [
    {
      bordo: 'sinistro',
      ancora: 76,
      foglie: [
        { disegno: 'palma', scarto: 0, apertura: 16, ingombro: 33, piano: 'primo' },
        { disegno: 'foglia-larga', scarto: -12, apertura: -16, ingombro: 22, piano: 'sfondo' },
        { disegno: 'foglia-lancia', scarto: 11, apertura: 32, ingombro: 18, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'basso',
      ancora: 9,
      foglie: [
        { disegno: 'palma', scarto: 0, apertura: -14, ingombro: 13, piano: 'primo', soloDaTablet: true },
      ],
    },
    {
      bordo: 'destro',
      ancora: 28,
      foglie: [
        { disegno: 'foglia-sottile', scarto: 0, apertura: -18, ingombro: 28, piano: 'primo' },
        { disegno: 'monstera-incisa', scarto: 10, apertura: 14, ingombro: 17, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'alto',
      ancora: 91,
      foglie: [
        { disegno: 'foglia-larga', scarto: 0, apertura: 12, ingombro: 12, piano: 'sfondo', soloDaTablet: true },
      ],
    },
    {
      bordo: 'basso',
      ancora: 92,
      foglie: [
        { disegno: 'foglia-lancia', scarto: 0, apertura: -9, ingombro: 13, piano: 'primo', soloDaTablet: true },
      ],
    },
  ],

  // I SERVIZI — massa in basso a destra. Niente in cima: la fascia porta il
  // titolo li'. Il contrappunto sta a meta' del fianco sinistro perche' un
  // angolo alto non c'e'.
  corniceBassa: [
    {
      bordo: 'destro',
      ancora: 74,
      foglie: [
        { disegno: 'sansevieria', scarto: 0, apertura: 10, ingombro: 30, piano: 'primo' },
        { disegno: 'foglia-larga', scarto: -12, apertura: -15, ingombro: 22, piano: 'sfondo' },
        { disegno: 'foglia-lancia', scarto: 10, apertura: 28, ingombro: 17, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'basso',
      ancora: 90,
      foglie: [
        { disegno: 'foglia-lancia', scarto: 0, apertura: 20, ingombro: 12, piano: 'sfondo', soloDaTablet: true },
      ],
    },
    {
      bordo: 'sinistro',
      ancora: 30,
      foglie: [
        { disegno: 'ciuffo-variegato', scarto: 0, apertura: -12, ingombro: 28, piano: 'primo' },
        { disegno: 'monstera-incisa', scarto: 11, apertura: 20, ingombro: 18, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'basso',
      ancora: 9,
      foglie: [
        { disegno: 'palma', scarto: 0, apertura: -11, ingombro: 11, piano: 'primo', soloDaTablet: true },
      ],
    },
  ],

  // LA BOTTEGA — la massa passa in alto a sinistra: e' la prima fascia chiara
  // dopo il verde, e mettere il peso dall'altra parte rompe il ritmo.
  corniceAlta: [
    {
      bordo: 'sinistro',
      ancora: 26,
      foglie: [
        { disegno: 'foglia-zebrata', scarto: 0, apertura: -12, ingombro: 28, piano: 'primo' },
        { disegno: 'palma', scarto: 13, apertura: 20, ingombro: 24, piano: 'sfondo' },
        { disegno: 'foglia-lancia', scarto: -9, apertura: -30, ingombro: 16, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'alto',
      ancora: 8,
      foglie: [
        { disegno: 'foglia-sottile', scarto: 0, apertura: -22, ingombro: 11, piano: 'sfondo', soloDaTablet: true },
      ],
    },
    {
      bordo: 'destro',
      ancora: 72,
      foglie: [
        { disegno: 'foglia-nastro', scarto: 0, apertura: 18, ingombro: 28, piano: 'primo' },
        { disegno: 'foglia-larga', scarto: -12, apertura: -10, ingombro: 22, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'alto',
      ancora: 92,
      foglie: [
        { disegno: 'monstera-incisa', scarto: 0, apertura: 30, ingombro: 13, extra: 2, piano: 'primo', soloDaTablet: true },
      ],
    },
  ],

  // I TAGLI — la fascia piu' alta della pagina. Massa in basso a sinistra,
  // dalla parte opposta a quella della bottega qui sopra.
  corniceBassaBis: [
    {
      bordo: 'sinistro',
      ancora: 76,
      foglie: [
        { disegno: 'foglie-appuntite', scarto: 0, apertura: 14, ingombro: 26, piano: 'primo' },
        { disegno: 'foglia-sottile', scarto: -13, apertura: -20, ingombro: 22, piano: 'sfondo' },
        { disegno: 'palma', scarto: 11, apertura: 30, ingombro: 17, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'basso',
      ancora: 88,
      foglie: [
        { disegno: 'palma', scarto: 0, apertura: 12, ingombro: 13, piano: 'sfondo', soloDaTablet: true },
      ],
    },
    {
      bordo: 'destro',
      ancora: 30,
      foglie: [
        { disegno: 'calatea-tonda', scarto: 0, apertura: -10, ingombro: 28, piano: 'primo' },
        { disegno: 'foglia-larga', scarto: 12, apertura: 18, ingombro: 22, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'basso',
      ancora: 11,
      foglie: [
        { disegno: 'monstera-incisa', scarto: 0, apertura: -14, ingombro: 11, piano: 'primo', soloDaTablet: true },
      ],
    },
  ],

  // DOVE SIAMO — la fascia piu' bassa, e l'ultima prima del piede. Massa in
  // alto a destra: il quarto angolo diverso in quattro fasce.
  corniceAltaBis: [
    {
      bordo: 'destro',
      ancora: 26,
      foglie: [
        { disegno: 'sansevieria', scarto: 0, apertura: -12, ingombro: 28, piano: 'primo' },
        { disegno: 'foglia-larga', scarto: 12, apertura: 16, ingombro: 22, piano: 'sfondo' },
        { disegno: 'monstera-incisa', scarto: -10, apertura: -28, ingombro: 16, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'alto',
      ancora: 89,
      foglie: [
        { disegno: 'foglia-lancia', scarto: 0, apertura: 15, ingombro: 12, piano: 'sfondo', soloDaTablet: true },
      ],
    },
    {
      bordo: 'sinistro',
      ancora: 70,
      foglie: [
        { disegno: 'foglia-zebrata', scarto: 0, apertura: 14, ingombro: 28, piano: 'primo' },
        { disegno: 'monstera-incisa', scarto: -12, apertura: -12, ingombro: 20, piano: 'sfondo' },
      ],
    },
    {
      bordo: 'alto',
      ancora: 10,
      foglie: [
        { disegno: 'palma', scarto: 0, apertura: -8, ingombro: 11, extra: 2, piano: 'primo', soloDaTablet: true },
      ],
    },
  ],
} satisfies Record<string, Cespo[]>;

export type NomeMacchia = keyof typeof MACCHIE;

/**
 * La regola 2, verificata invece che raccomandata.
 *
 * Due foglie sullo stesso bordo non si toccano se la distanza fra i loro
 * centri supera la somma dei mezzi ingombri. Il margine in più serve perché
 * l'ingombro è la larghezza del disegno, e una foglia ruotata di 30 gradi
 * occupa lungo il bordo qualcosa in più della sua larghezza.
 *
 * Gira solo in sviluppo, una volta sola al caricamento del modulo: chi sposta
 * un numero lo scopre subito, invece di accorgersene da uno screenshot fatto a
 * una sola larghezza di finestra.
 *
 * E controlla TUTTE E DUE LE SCALE. Sul telefono gli ingombri vengono
 * moltiplicati (`PER_TELEFONO`) mentre le distanze restano quelle: è lì che
 * due foglie si pestano per prime, e un controllo fatto solo sui numeri dello
 * schermo grande direbbe che va tutto bene proprio nel caso peggiore.
 */
const MARGINE = 1.15;

function controllaDistanze() {
  const scale = [
    { nome: 'schermo', fattore: { orizzontale: 1, verticale: 1 } },
    { nome: 'telefono', fattore: PER_TELEFONO },
  ];

  for (const [macchia, cespi] of Object.entries(MACCHIE) as [string, Cespo[]][]) {
    for (let i = 0; i < cespi.length; i++) {
      for (let j = i + 1; j < cespi.length; j++) {
        const a = cespi[i];
        const b = cespi[j];
        if (a.bordo !== b.bordo) continue;
        // Due cespi che non compaiono mai insieme non possono pestarsi. Un
        // cespo o e' tutto da tablet in su o non lo e': mescolarli renderebbe
        // la pianta meta' presente sul telefono, che non e' una pianta.
        const soloA = a.foglie.every((f) => f.soloDaTablet);
        const soloB = b.foglie.every((f) => f.soloDaTablet);
        if (soloA !== soloB) continue;

        const distanza = Math.abs(a.ancora - b.ancora);
        for (const scala of scale) {
          // Sul telefono i nascosti non ci sono: quella scala non li riguarda.
          if (scala.nome === 'telefono' && soloA) continue;
          const k = eVerticale(a.bordo) ? scala.fattore.verticale : scala.fattore.orizzontale;
          const minima = (estensione(a) + estensione(b)) * k * MARGINE;
          if (distanza < minima) {
            const nomi = (c: Cespo) => c.foglie.map((f) => f.disegno).join('+');
            console.warn(
              `Decoro "${macchia}" (${scala.nome}): i cespi [${nomi(a)}] e [${nomi(b)}] sul ` +
                `bordo ${a.bordo} distano ${distanza} ma ne servono ${minima.toFixed(1)} — ` +
                `si toccano (regola 2 in cima al file).`,
            );
          }
        }
      }
    }
  }
}

/**
 * La regola 8, per la parte che si puo' verificare da sola: il ventaglio.
 * Una foglia nata di lato deve aprirsi verso quel lato, altrimenti il cespo
 * si chiude su se stesso e torna a sembrare un mazzo legato.
 */
function controllaVentagli() {
  for (const [macchia, cespi] of Object.entries(MACCHIE) as [string, Cespo[]][]) {
    for (const cespo of cespi) {
      for (const f of cespo.foglie) {
        if (f.scarto !== 0 && Math.sign(f.scarto) !== Math.sign(f.apertura)) {
          console.warn(
            `Decoro "${macchia}": ${f.disegno} nasce a ${f.scarto} dal cuore del cespo ma si ` +
              `apre di ${f.apertura}° dalla parte opposta — il ventaglio si chiude ` +
              `(regola 8 in cima al file).`,
          );
        }
      }
      const davanti = cespo.foglie.filter((f) => f.piano === 'primo');
      const dietro = cespo.foglie.filter((f) => f.piano === 'sfondo');
      if (davanti.length > 0 && dietro.length > 0) {
        const piuGrandeDavanti = Math.max(...davanti.map((f) => f.ingombro));
        const piuGrandeDietro = Math.max(...dietro.map((f) => f.ingombro));
        if (piuGrandeDietro > piuGrandeDavanti) {
          console.warn(
            `Decoro "${macchia}": nel cespo su ${cespo.bordo} la foglia più grande sta ` +
              `DIETRO (${piuGrandeDietro} contro ${piuGrandeDavanti}) — si legge come un ` +
              `errore di prospettiva (regola 8 in cima al file).`,
          );
        }
      }
    }
  }
}

if (import.meta.env.DEV) {
  controllaDistanze();
  controllaVentagli();
}

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

  // DUE MASCHERE ANNIDATE, e non una sola con più strati.
  //
  // Questa, sul contenitore, dice DA DOVE nasce il fogliame: una sfumatura per
  // ogni lato da cui spunta qualcosa, tutte UNITE ("add" in index.css), meno
  // la zona sicura del testo.
  //
  // Quella dentro (`.bordi-morbidi`) dice tutt'altro: che niente deve finire
  // contro uno spigolo. Sono due cose separate, e tenerle separate non è
  // pignoleria — impilare due gradienti in più in questo stesso elenco
  // vorrebbe dire farli convivere con le operazioni di `mask-composite`, il
  // cui ordine è la parte più facile da sbagliare di tutto il file. Annidate,
  // ognuna fa un mestiere solo e si moltiplicano da sole.
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
      <span className="bordi-morbidi absolute inset-0 block">
      {piante.map((p, i) => {
        const verticale = eVerticale(p.bordo);
        const dipinta = DIPINTE.has(p.disegno);
        const fattore = verticale ? PER_TELEFONO.verticale : PER_TELEFONO.orizzontale;
        // cqh = percentuale dell'altezza della fascia, cqw della larghezza.
        const unita = verticale ? 'cqh' : 'cqw';
        return (
          <img
            key={`${p.disegno}-${i}`}
            src={fileDi(p.disegno)}
            data-cespo={p.cespo}
            alt=""
            loading="lazy"
            decoding="async"
            style={
              {
                ...posizione(p),
                '--ingombro-telefono': `${(p.ingombro * fattore).toFixed(1)}${unita}`,
                '--ingombro-schermo': `${p.ingombro}${unita}`,
                // Serve al CSS per trasformare un tetto sull'altezza in un
                // tetto sulla larghezza, che rimpicciolisce invece di
                // schiacciare (vedi .pianta-orizzontale in index.css).
                '--rapporto': String(RAPPORTO[p.disegno]),
                aspectRatio: String(RAPPORTO[p.disegno]),
              } as CSSProperties
            }
            className={`absolute max-w-none select-none ${
              verticale ? 'pianta-verticale' : 'pianta-orizzontale'
            } ${dipinta ? 'pianta-dipinta' : ''} ${
              p.soloDaTablet ? 'hidden md:block' : 'block'
            }`}
          />
        );
      })}
      </span>
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
  // I cespi si aprono qui: da qui in giu' il componente disegna foglie.
  const piante = (MACCHIE[macchia] as Cespo[]).flatMap(spiega);

  // Regola 7, fatta rispettare. Non taglio via la pianta sbagliata: chi
  // modifica una macchia deve VEDERE l'errore, non trovarsi un buco nella
  // cornice senza capire perché. In produzione il controllo sparisce.
  if (import.meta.env.DEV && suScuro) {
    const sbagliate = piante.filter((p) => DIPINTE.has(p.disegno)).map((p) => p.disegno);
    if (sbagliate.length > 0) {
      console.warn(
        `Decoro "${macchia}": ${sbagliate.join(', ')} ${sbagliate.length === 1 ? 'è un dipinto' : 'sono dipinti'} ` +
          `su una fascia scura. Invertiti diventano macchie piene invece di disegni a linee ` +
          `(regola 7 in cima al file): su fondo scuro vanno solo le incisioni.`,
      );
    }
  }

  return (
    <>
      <Strato piante={piante.filter((p) => p.piano === 'sfondo')} piano="sfondo" suScuro={suScuro} />
      <Strato piante={piante.filter((p) => p.piano === 'primo')} piano="primo" suScuro={suScuro} />
    </>
  );
}
