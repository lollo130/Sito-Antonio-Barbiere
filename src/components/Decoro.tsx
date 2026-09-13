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
// 2. QUANDO SI ACCAVALLANO, SI VEDE SOLO QUELLA SOPRA. Le foglie si coprono
//    eccome — un sottobosco in cui non si sovrappone niente non e' un
//    sottobosco — ma chi sta dietro deve sparire, non trasparire.
//    Questo e' il motivo per cui i due piani di profondita' di una volta sono
//    finiti: erano due gruppi fusi SEPARATAMENTE sulla pagina, uno al 12% e
//    uno al 25%, e due veli semitrasparenti sovrapposti si sommano invece di
//    coprirsi. Adesso il gruppo e' UNO SOLO: dentro, le foglie si disegnano
//    una sull'altra in modo normale, e i corpi sono pieni (dal 28% al 58% di
//    pixel opachi, misurati), quindi quella davanti nasconde quella dietro.
//    La fusione con la pagina avviene una volta sola, alla fine, sul gruppo
//    gia' composto.
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
// 8. LA COMPOSIZIONE — UN SOTTOBOSCO, NON UN FREGIO.
//    Le foglie non stanno una ogni tanto lungo il bordo: stanno in CESPI, e un
//    cespo non si scrive foglia per foglia, si DICHIARA e si apre da solo.
//    Di un cespo si dicono quattro cose — da quale bordo nasce, dove, quanto
//    e' grande la sua foglia maggiore, e quali disegni lo compongono — e il
//    ventaglio lo calcola `spiega()`. Il motivo non e' la comodita': scritte
//    a mano, sessanta foglie sono sessanta occasioni di sbagliare un segno e
//    chiudere un ventaglio. Calcolate, le regole valgono per costruzione.
//
//    Cosa garantisce il calcolo:
//    - OGNI FOGLIA E' PIU' PICCOLA DELLA PRECEDENTE, di parecchio. Da una
//      maggiore di 50 vengono 50, 29, 17, 10, 6: dalla foglia che domina la
//      fascia al fiocco che riempie un vuoto. E' la gamma che fa la foresta —
//      foglie tutte uguali, per quante siano, restano un motivo.
//    - IL VENTAGLIO SI APRE SEMPRE VERSO FUORI. Ogni foglia nasce di fianco
//      alla precedente e inclinata un po' di piu', dalla stessa parte. Il
//      passo e' meno della meta' del loro ingombro, quindi si accavallano di
//      proposito: e' li' che si vede se la regola 2 e' rispettata.
//    - LA PIU' GRANDE E' LA PIU' VICINA, e viene disegnata per ultima, quindi
//      sta sopra tutte. Le piccole sono lontane, slavate, e stanno sotto.
//
//    Della composizione restano a mano solo le scelte che sono davvero
//    scelte: quali angoli prendono le masse e quali restano radi.
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
  /** quanto è lontana: decide misura e tono, non opacità (regola 4) */
  tono: Tono;
  /** quanto esce OLTRE il picciolo, in punti percentuali dell'altezza */
  extra?: number;
  specchia?: boolean;
  /** le piante che sul telefono coprirebbero il testo */
  soloDaTablet?: boolean;
};

/**
 * Quanto è lontana una foglia. Non è un'opacità: è un tono.
 * Vedi regola 4 — l'opacità distruggerebbe la copertura della regola 2.
 */
type Tono = 'vicino' | 'medio' | 'lontano';

/**
 * Un cespo, DICHIARATO. Le singole foglie non si scrivono: si dice quanto è
 * grande la maggiore e quali disegni la accompagnano, e `spiega()` apre il
 * ventaglio. Vedi regola 8.
 */
type Cespo = {
  bordo: Bordo;
  /** dove sta il cuore del cespo lungo quel bordo, in percentuale */
  ancora: number;
  /** l'ingombro della foglia maggiore, in percentuale del bordo */
  grandezza: number;
  /** i disegni, dal primo (il più grande) all'ultimo (il più minuto) */
  foglie: Disegno[];
  /** da che parte si apre il ventaglio lungo il bordo */
  verso?: 1 | -1;
  /** i cespi che sul telefono starebbero addosso al testo */
  soloDaTablet?: boolean;
};

/** Quanto rimpicciolisce ogni foglia rispetto a quella prima di lei. */
const DECADIMENTO = 0.58;

/**
 * Quanto si sposta ogni foglia rispetto alla precedente, in frazione della
 * somma dei loro ingombri. Sotto 0.5 si accavallano: è voluto (regola 2).
 */
const PASSO = 0.34;

/** Apertura della prima foglia e di quanto cresce a ogni foglia successiva. */
const APERTURA_BASE = 8;
const APERTURA_PASSO = 11;
const APERTURA_MAX = 34;

/** La foglia più minuta che ha ancora senso disegnare. */
const MINIMA = 5;

/** Apre il cespo: dal ventaglio dichiarato alle singole piante. */
function spiega(cespo: Cespo): Pianta[] {
  const verso = cespo.verso ?? 1;
  const identita = `${cespo.bordo}@${cespo.ancora}`;
  const piante: Pianta[] = [];
  let scarto = 0;
  let precedente = 0;

  cespo.foglie.forEach((disegno, i) => {
    const ingombro = Math.max(MINIMA, Math.round(cespo.grandezza * DECADIMENTO ** i));
    // Ogni foglia nasce di fianco alla precedente, non sopra il suo cuore.
    if (i > 0) scarto += (precedente + ingombro) * PASSO;
    precedente = ingombro;

    piante.push({
      disegno,
      cespo: identita,
      bordo: cespo.bordo,
      lungo: cespo.ancora + scarto * verso,
      giro: Math.min(APERTURA_MAX, APERTURA_BASE + i * APERTURA_PASSO) * verso,
      ingombro,
      tono: i === 0 ? 'vicino' : i === 1 ? 'medio' : 'lontano',
      soloDaTablet: cespo.soloDaTablet,
    });
  });

  return piante;
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
  // APERTURA — massa in basso a sinistra, una seconda in alto a destra, e
  // radure fra l'una e l'altra. Solo incisioni: e' la fascia scura (regola 7).
  cornicePiena: [
    // Il fianco destro: la massa in alto che scende, una piu' piccola in
    // fondo che sale. Le due si incontrano a meta' bordo.
    { bordo: 'destro', ancora: 26, grandezza: 38, verso: 1,
      foglie: ['foglia-sottile', 'monstera-incisa', 'foglia-lancia', 'foglia-larga'] },
    { bordo: 'destro', ancora: 72, grandezza: 22, verso: -1,
      foglie: ['foglia-lancia', 'foglia-larga', 'monstera-incisa'] },

    // Il fianco sinistro: stessa densita', ritmo rovesciato. Qui la massa sta
    // in FONDO e sale, quella piccola scende dall'alto, e le due non si
    // incontrano a meta' — si scavalcano piu' in alto, lasciando libero il
    // tratto sotto il pulsante. Specchiare il destro avrebbe dato
    // un'inquadratura simmetrica, che e' la cosa che si riconosce prima.
    // La monstera grande sta in BASSO — a destra la sua gemella sta in alto —
    // e in cima viene la palma, che ha una sagoma tutta diversa. Due monstere
    // vicine e quasi della stessa misura si leggevano come un disegno
    // ripetuto due volte, non come due piante.
    { bordo: 'sinistro', ancora: 88, grandezza: 52, verso: -1,
      foglie: ['monstera-incisa', 'foglia-larga', 'foglia-sottile', 'foglia-lancia', 'palma'] },
    { bordo: 'sinistro', ancora: 18, grandezza: 34, verso: 1,
      foglie: ['palma', 'foglia-lancia', 'monstera-incisa'] },
    { bordo: 'sinistro', ancora: 55, grandezza: 14, verso: 1,
      foglie: ['foglia-lancia', 'foglia-sottile'] },
    { bordo: 'basso', ancora: 12, grandezza: 24, verso: -1, soloDaTablet: true,
      foglie: ['palma', 'monstera-incisa', 'foglia-lancia'] },
    { bordo: 'alto', ancora: 88, grandezza: 20, verso: 1, soloDaTablet: true,
      foglie: ['foglia-larga', 'palma', 'foglia-lancia'] },
  ],

  // I SERVIZI — massa a destra, contrappunto a sinistra piu' in alto. Niente
  // in cima: la fascia porta il titolo li'.
  corniceBassa: [
    { bordo: 'destro', ancora: 70, grandezza: 48, verso: -1,
      foglie: ['sansevieria', 'foglia-larga', 'foglia-lancia', 'monstera-incisa', 'palma'] },
    { bordo: 'sinistro', ancora: 34, grandezza: 40, verso: 1,
      foglie: ['ciuffo-variegato', 'monstera-incisa', 'foglia-sottile', 'foglia-lancia'] },
    { bordo: 'sinistro', ancora: 80, grandezza: 16, verso: 1,
      foglie: ['foglia-larga', 'palma'] },
    { bordo: 'basso', ancora: 10, grandezza: 22, verso: 1, soloDaTablet: true,
      foglie: ['palma', 'foglia-lancia', 'monstera-incisa'] },
    { bordo: 'basso', ancora: 88, grandezza: 20, verso: -1, soloDaTablet: true,
      foglie: ['foglia-lancia', 'foglia-larga'] },
  ],

  // LA BOTTEGA E DOVE SIAMO — due cornici, quindi una fascia lunga: regge due
  // masse grandi. Niente in fondo, che poggia sul piede.
  corniceAlta: [
    { bordo: 'sinistro', ancora: 28, grandezza: 46, verso: 1,
      foglie: ['foglia-zebrata', 'palma', 'foglia-lancia', 'monstera-incisa', 'foglia-sottile'] },
    { bordo: 'destro', ancora: 66, grandezza: 42, verso: -1,
      foglie: ['foglia-nastro', 'foglia-larga', 'foglia-lancia', 'palma'] },
    { bordo: 'destro', ancora: 22, grandezza: 15, verso: 1,
      foglie: ['foglia-larga', 'foglia-lancia'] },
    { bordo: 'alto', ancora: 10, grandezza: 22, verso: 1, soloDaTablet: true,
      foglie: ['foglia-sottile', 'monstera-incisa', 'foglia-lancia'] },
    { bordo: 'alto', ancora: 90, grandezza: 18, verso: -1, soloDaTablet: true,
      foglie: ['monstera-incisa', 'palma'] },
  ],

  // I TAGLI — la fascia piu' alta della pagina, e quella con piu' vuoto
  // attorno alle foto: prende il sottobosco piu' fitto.
  corniceBassaBis: [
    { bordo: 'sinistro', ancora: 72, grandezza: 50, verso: -1,
      foglie: ['foglie-appuntite', 'foglia-sottile', 'palma', 'foglia-lancia', 'monstera-incisa'] },
    { bordo: 'destro', ancora: 26, grandezza: 44, verso: 1,
      foglie: ['calatea-tonda', 'foglia-larga', 'foglia-lancia', 'foglia-sottile'] },
    { bordo: 'sinistro', ancora: 26, grandezza: 17, verso: 1,
      foglie: ['foglia-larga', 'monstera-incisa'] },
    { bordo: 'destro', ancora: 76, grandezza: 15, verso: -1,
      foglie: ['foglia-lancia', 'foglia-sottile'] },
    { bordo: 'basso', ancora: 12, grandezza: 22, verso: 1, soloDaTablet: true,
      foglie: ['monstera-incisa', 'palma', 'foglia-lancia'] },
    { bordo: 'basso', ancora: 86, grandezza: 20, verso: -1, soloDaTablet: true,
      foglie: ['palma', 'foglia-larga'] },
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
/**
 * La gamma delle misure, che e' quello che fa la foresta (regola 8).
 * Una fascia con foglie tutte della stessa taglia e' un motivo ripetuto, per
 * quante ne abbia. Qui si verifica che ci sia davvero il salto fra la piu'
 * grande e la piu' minuta, e che di minute ce ne siano parecchie.
 */
function controllaComposizione() {
  for (const [macchia, cespi] of Object.entries(MACCHIE) as [string, Cespo[]][]) {
    const piante = cespi.flatMap(spiega);
    const misure = piante.map((p) => p.ingombro).sort((x, y) => y - x);
    const grande = misure[0];
    const minute = misure.filter((m) => m <= grande * 0.2).length;

    if (grande < 30) {
      console.warn(
        `Decoro "${macchia}": la foglia piu' grande e' ${grande} — nessuna domina la fascia, ` +
          `e senza dominante il fogliame resta un bordino (regola 8).`,
      );
    }
    if (minute < 3) {
      console.warn(
        `Decoro "${macchia}": solo ${minute} foglie minute su ${misure.length} — manca il ` +
          `sottobosco, e le misure vicine fra loro si leggono come un motivo (regola 8).`,
      );
    }
  }
}

if (import.meta.env.DEV) controllaComposizione();

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

/** Quanto si schiarisce (o si scurisce, su fondo scuro) una foglia lontana. */
const LUCE: Record<Tono, number> = { vicino: 1, medio: 1.12, lontano: 1.26 };
/** Quanto perde di colore allontanandosi. */
const COLORE: Record<Tono, number> = { vicino: 1, medio: 0.88, lontano: 0.72 };

function Strato({ piante, suScuro }: { piante: Pianta[]; suScuro: boolean }) {
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
      className={`decoro ${
        suScuro ? 'decoro-su-scuro' : ''
      } pointer-events-none absolute inset-0 z-0 block overflow-hidden`}
      style={{ '--sfuma': maschera, '--composizione': composizione } as CSSProperties}
    >
      <span className="bordi-morbidi absolute inset-0 block">
      {piante.map((p, i) => {
        const verticale = eVerticale(p.bordo);
        // Il tono, e con lui la profondita', e' un FILTRO: non tocca la
        // copertura, quindi una foglia lontana resta opaca e nasconde
        // comunque quello che ha dietro (regole 2 e 4).
        // Le dipinte perdono un altro po' di colore, per restare nei verdi
        // spenti del sito invece dei verdi vivi dell'originale.
        const colore = COLORE[p.tono] * (DIPINTE.has(p.disegno) ? 0.85 : 1);
        const filtro = suScuro
          ? `invert(1) grayscale(1) brightness(${(2 - LUCE[p.tono]).toFixed(2)})`
          : `saturate(${colore.toFixed(2)}) brightness(${LUCE[p.tono]})`;
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
                filter: filtro,
              } as CSSProperties
            }
            className={`absolute max-w-none select-none ${
              verticale ? 'pianta-verticale' : 'pianta-orizzontale'
            } ${p.soloDaTablet ? 'hidden md:block' : 'block'}`}
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

  // Dalla piu' piccola alla piu' grande: l'ultima disegnata sta sopra tutte,
  // e la piu' grande e' quella piu' vicina (regola 8). Un solo gruppo, cosi'
  // dentro si coprono davvero invece di trasparire (regola 2).
  const dalFondo = [...piante].sort((a, b) => a.ingombro - b.ingombro);

  return <Strato piante={dalFondo} suScuro={suScuro} />;
}
