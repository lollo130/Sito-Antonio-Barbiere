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
  // Apertura. Le dipinte qui non entrano (regola 7): solo incisioni.
  cornicePiena: [
    { disegno: 'foglia-larga', bordo: 'sinistro', lungo: 26, giro: 22, ingombro: 26, piano: 'sfondo' },
    { disegno: 'foglia-sottile', bordo: 'destro', lungo: 32, giro: -18, ingombro: 30, piano: 'sfondo' },
    { disegno: 'foglia-larga', bordo: 'alto', lungo: 91, giro: -12, ingombro: 12, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'basso', lungo: 8, giro: 16, ingombro: 13, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'palma', bordo: 'sinistro', lungo: 70, giro: 27, ingombro: 33, piano: 'primo' },
    { disegno: 'foglia-lancia', bordo: 'destro', lungo: 76, giro: 12, ingombro: 26, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'alto', lungo: 9, giro: 13, ingombro: 11, extra: 2, piano: 'primo', soloDaTablet: true },
    { disegno: 'foglia-lancia', bordo: 'basso', lungo: 92, giro: -9, ingombro: 13, piano: 'primo', soloDaTablet: true },
  ],
  // LE QUATTRO FASCE CHIARE. Le incisioni che c'erano restano tutte; le
  // dipinte si aggiungono accanto, una per fianco, alla LORO STESSA MISURA.
  //
  // E stanno sempre in primo piano, mai sullo sfondo. Non e' un capriccio, e'
  // una misura: sul piano di sfondo, al 12%, una dipinta toglie al fondo fra i
  // 5 e i 10 punti di grigio su 232 — sotto la soglia di quello che si vede.
  // Le incisioni li' reggono perche' il loro tratto e' quasi nero e ne toglie
  // 13-17. Chiaro e scuro non si comportano allo stesso modo quando li
  // sbiadisci: le prime volte le avevo messe piccole e sullo sfondo, ed erano
  // sul sito senza esserci.

  // Cornice bassa: niente in cima, per le fasce col titolo in alto.
  corniceBassa: [
    { disegno: 'monstera-incisa', bordo: 'sinistro', lungo: 30, giro: 28, ingombro: 30, piano: 'sfondo' },
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 24, giro: -15, ingombro: 30, piano: 'sfondo' },
    { disegno: 'foglia-lancia', bordo: 'basso', lungo: 90, giro: 22, ingombro: 12, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'ciuffo-variegato', bordo: 'sinistro', lungo: 74, giro: -12, ingombro: 30, piano: 'primo' },
    { disegno: 'sansevieria', bordo: 'destro', lungo: 68, giro: 8, ingombro: 30, piano: 'primo' },
    { disegno: 'palma', bordo: 'basso', lungo: 9, giro: -11, ingombro: 11, piano: 'primo', soloDaTablet: true },
  ],
  // Cornice alta: niente in fondo, per le fasce che poggiano su un'altra.
  corniceAlta: [
    { disegno: 'palma', bordo: 'sinistro', lungo: 25, giro: 19, ingombro: 33, piano: 'sfondo' },
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 33, giro: -7, ingombro: 30, piano: 'sfondo' },
    { disegno: 'foglia-sottile', bordo: 'alto', lungo: 8, giro: -23, ingombro: 11, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-zebrata', bordo: 'sinistro', lungo: 69, giro: -14, ingombro: 28, piano: 'primo' },
    { disegno: 'foglia-nastro', bordo: 'destro', lungo: 77, giro: 21, ingombro: 28, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'alto', lungo: 92, giro: 34, ingombro: 13, extra: 2, piano: 'primo', soloDaTablet: true },
  ],
  // Seconda cornice bassa: stesse regole, numeri diversi. Due fasce con la
  // stessa disposizione si riconoscono a colpo d'occhio scorrendo.
  corniceBassaBis: [
    { disegno: 'foglia-sottile', bordo: 'sinistro', lungo: 29, giro: -26, ingombro: 34, piano: 'sfondo' },
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 23, giro: 17, ingombro: 34, piano: 'sfondo' },
    { disegno: 'palma', bordo: 'basso', lungo: 88, giro: 12, ingombro: 13, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglie-appuntite', bordo: 'sinistro', lungo: 73, giro: 18, ingombro: 22, piano: 'primo' },
    { disegno: 'calatea-tonda', bordo: 'destro', lungo: 67, giro: -9, ingombro: 28, piano: 'primo' },
    { disegno: 'monstera-incisa', bordo: 'basso', lungo: 11, giro: -14, ingombro: 11, piano: 'primo', soloDaTablet: true },
  ],
  // Seconda cornice alta, stesso ragionamento.
  corniceAltaBis: [
    { disegno: 'monstera-incisa', bordo: 'sinistro', lungo: 34, giro: 30, ingombro: 30, piano: 'sfondo' },
    { disegno: 'foglia-larga', bordo: 'destro', lungo: 26, giro: -20, ingombro: 30, piano: 'sfondo' },
    { disegno: 'foglia-lancia', bordo: 'alto', lungo: 89, giro: 15, ingombro: 12, piano: 'sfondo', soloDaTablet: true },
    { disegno: 'foglia-zebrata', bordo: 'sinistro', lungo: 78, giro: -15, ingombro: 28, piano: 'primo' },
    { disegno: 'sansevieria', bordo: 'destro', lungo: 70, giro: 11, ingombro: 28, piano: 'primo' },
    { disegno: 'palma', bordo: 'alto', lungo: 10, giro: -8, ingombro: 11, extra: 2, piano: 'primo', soloDaTablet: true },
  ],
} satisfies Record<string, Pianta[]>;

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

  for (const [macchia, piante] of Object.entries(MACCHIE) as [string, Pianta[]][]) {
    for (let i = 0; i < piante.length; i++) {
      for (let j = i + 1; j < piante.length; j++) {
        const a = piante[i];
        const b = piante[j];
        if (a.bordo !== b.bordo) continue;
        // Due piante che non compaiono mai insieme non possono pestarsi.
        if (a.soloDaTablet !== b.soloDaTablet) continue;

        const distanza = Math.abs(a.lungo - b.lungo);
        for (const scala of scale) {
          // Sul telefono le nascoste non ci sono: quella scala non le riguarda.
          if (scala.nome === 'telefono' && a.soloDaTablet) continue;
          const k = eVerticale(a.bordo) ? scala.fattore.verticale : scala.fattore.orizzontale;
          const minima = (((a.ingombro + b.ingombro) / 2) * k) * MARGINE;
          if (distanza < minima) {
            console.warn(
              `Decoro "${macchia}" (${scala.nome}): ${a.disegno} e ${b.disegno} sul bordo ` +
                `${a.bordo} distano ${distanza} ma ne servono ${minima.toFixed(1)} — ` +
                `si accavallano (regola 2 in cima al file).`,
            );
          }
        }
      }
    }
  }
}

if (import.meta.env.DEV) controllaDistanze();

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
  const piante = MACCHIE[macchia] as Pianta[];

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
