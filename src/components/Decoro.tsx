// Il fogliame che invade le fasce della pagina.
//
// Prima era una foglia per angolo: due per fascia, stessa misura, angoli
// opposti. Ordinatissimo e per niente vegetale — una griglia, non una
// giungla. Quello che fa sembrare vera la vegetazione è il disordine: foglie
// di misure diverse, ruotate storte, che si accavallano invece di stare
// ciascuna al suo posto.
//
// Quindi l'unità non è la foglia singola ma il CIUFFO: due foglie attorno a
// uno stesso angolo, una principale e una di accompagnamento. Il disordine
// è scritto a mano una volta e resta sempre quello — non è casuale a ogni
// caricamento, altrimenti la pagina ballerebbe a ogni visita e non si
// potrebbe più correggere un ciuffo venuto male.
//
// Ma è un disordine con un vincolo preciso: vedi la regola del picciolo,
// sotto. Le rotazioni non sono libere.
//
// Come è fatto un ciuffo:
//
//   <span>   copre TUTTA la fascia, ritaglia quel che esce e porta la
//            maschera che sfuma verso il centro. Sta qui e non sulle foglie
//            perché così la sfumatura è misurata sulla fascia: parte piena
//            all'angolo e finisce a zero prima del testo, qualunque misura
//            abbiano le foglie dentro.
//   <img>    le foglie, piazzate in percentuale rispetto all'angolo.
//
// Le regole che restano:
//  - i ciuffi stanno negli ANGOLI e sconfinano oltre il bordo. Una foglia
//    isolata a metà lato sembra un ritaglio appoggiato lì per sbaglio;
//  - il tratto si dissolve prima di arrivare al testo. È la maschera a
//    permettere tutta questa abbondanza: senza, sarebbe illeggibile;
//  - le foglie in più di ogni ciuffo spariscono sul telefono, dove lo
//    schermo è stretto e finirebbero addosso alle parole.
//
// Il fogliame può permettersi di essere fitto perché il contenuto sta
// dentro una cornice: è la cornice a tenere il testo al sicuro. Quando le
// decorazioni galleggiavano libere sulla pagina bastava molto meno per fare
// confusione.
//
// Sono SVG: pesano 18-34 kB compressi, restano nitidi a qualunque misura, e
// le stesse cinque immagini ripetute venti volte restano cinque scaricamenti.
//
// Incisioni botaniche — attribuzione nel piede del sito.

type Disegno =
  | 'foglia-lancia'
  | 'foglia-larga'
  | 'foglia-sottile'
  | 'monstera-incisa'
  | 'palma';

type Angolo = 'alto-sinistra' | 'alto-destra' | 'basso-sinistra' | 'basso-destra';

/** Proporzione di ogni disegno, dal suo viewBox. */
const RAPPORTO: Record<Disegno, number> = {
  'foglia-lancia': 1232 / 1885,
  'foglia-larga': 1204 / 1305,
  'foglia-sottile': 1012 / 1756,
  'monstera-incisa': 1204 / 1305,
  palma: 1584 / 2041,
};

/**
 * Le misure sono in vw, non in rem.
 *
 * Con una misura fissa la stessa foglia era un dettaglio su un monitor da
 * 2000 px e mezza pagina su un portatile da 800. In vw la proporzione resta
 * quella voluta ovunque. Sul telefono la frazione è molto più grande perché
 * lo schermo è stretto: al 30% di 375 px una foglia non si vedrebbe.
 */
type Misura = 'grande' | 'media' | 'piccola' | 'minuta';
const LARGHEZZA: Record<Misura, [telefono: number, schermo: number]> = {
  grande: [76, 25],
  media: [58, 19],
  piccola: [44, 14],
  minuta: [32, 10],
};

type Foglia = {
  disegno: Disegno;
  misura: Misura;
  /** gradi di rotazione: è quello che toglie l'aria di griglia */
  ruota: number;
  /** quanto esce dal bordo, in percentuale della propria larghezza */
  fuori: number;
  /** di quanto scivola lungo il lato, in percentuale della fascia */
  scorre: number;
  /** quanto scende (o sale) rispetto all'angolo, sempre in percentuale */
  scende: number;
  specchia?: boolean;
  /** le foglie di contorno: sul telefono coprirebbero il testo */
  soloDaTablet?: boolean;
};

/**
 * I ciuffi.
 *
 * LA REGOLA CHE COMANDA TUTTO: una pianta entra dal PICCIOLO, mai dalla
 * punta della foglia. In natura il gambo viene da fuori — dal vaso, dal
 * terreno, dal ramo — e la foglia si apre verso l'interno. Una foglia che
 * entra di punta col picciolo nascosto non sembra una pianta che sconfina:
 * sembra un ritaglio appiccicato al bordo.
 *
 * In tutti e cinque i disegni il picciolo sta in BASSO. Quindi la
 * rotazione non e' libera:
 *   - angolo in basso  -> vicino a 0°   (picciolo in giu', fuori dalla
 *                          fascia; la foglia si apre verso l'alto)
 *   - angolo in alto   -> vicino a 180° (picciolo in su', fuori; la foglia
 *                          pende verso il basso)
 * Lo scarto e' al massimo una ventina di gradi, quel tanto che basta a
 * togliere l'aria di griglia, e piega la foglia verso il centro della
 * fascia: da sinistra si inclina a destra, da destra a sinistra.
 *
 * Due foglie per ciuffo, non quattro: una principale e una di
 * accompagnamento piu' piccola, che sul telefono sparisce. Con quattro
 * diventava un cespuglio e non si capiva piu' niente.
 */
const CIUFFI = {
  // Palma dominante e una foglia piu' piccola accanto. Angoli BASSI.
  palmeto: [
    { disegno: 'palma', misura: 'grande', ruota: 9, fuori: 46, scorre: 0, scende: 4 },
    {
      disegno: 'foglia-lancia',
      misura: 'piccola',
      ruota: -13,
      fuori: 62,
      scorre: 13,
      scende: -3,
      soloDaTablet: true,
    },
  ],
  // Foglie che pendono dall'alto: picciolo in su', fuori dalla fascia.
  // Angoli ALTI.
  pendente: [
    { disegno: 'foglia-larga', misura: 'grande', ruota: 172, fuori: 44, scorre: 0, scende: 3 },
    {
      disegno: 'foglia-sottile',
      misura: 'piccola',
      ruota: 193,
      fuori: 60,
      scorre: 14,
      scende: -4,
      soloDaTablet: true,
    },
  ],
  // Monstera e una palma dietro. Angoli BASSI.
  sottobosco: [
    { disegno: 'monstera-incisa', misura: 'grande', ruota: -7, fuori: 42, scorre: 0, scende: 0 },
    {
      disegno: 'palma',
      misura: 'piccola',
      ruota: 16,
      fuori: 64,
      scorre: 15,
      scende: 6,
      specchia: true,
      soloDaTablet: true,
    },
  ],
  // Due foglie sottili: per le fasce basse, dove non c'e' spazio.
  rado: [
    { disegno: 'foglia-lancia', misura: 'media', ruota: 11, fuori: 50, scorre: 0, scende: 2 },
    {
      disegno: 'foglia-sottile',
      misura: 'piccola',
      ruota: -15,
      fuori: 66,
      scorre: 16,
      scende: -5,
      soloDaTablet: true,
    },
  ],
  // Come "rado" ma capovolto, per gli angoli ALTI.
  radoAlto: [
    { disegno: 'foglia-sottile', misura: 'media', ruota: 187, fuori: 50, scorre: 0, scende: 2 },
    {
      disegno: 'foglia-lancia',
      misura: 'piccola',
      ruota: 166,
      fuori: 66,
      scorre: 16,
      scende: -5,
      soloDaTablet: true,
    },
  ],
} satisfies Record<string, Foglia[]>;

export type Ciuffo = keyof typeof CIUFFI;

// Da quale angolo della fascia parte la sfumatura (classi in index.css).
const MASCHERA: Record<Angolo, string> = {
  'alto-sinistra': 'sfuma-da-alto-sinistra',
  'alto-destra': 'sfuma-da-alto-destra',
  'basso-sinistra': 'sfuma-da-basso-sinistra',
  'basso-destra': 'sfuma-da-basso-destra',
};

/**
 * Posizione di una foglia dentro il ciuffo.
 *
 * `fuori` la spinge oltre il bordo di una frazione della PROPRIA larghezza
 * (così vale uguale per una foglia grande e per una piccola), `scorre` e
 * `scende` la spostano lungo i due lati in percentuale della fascia.
 */
function posizione(angolo: Angolo, f: Foglia): React.CSSProperties {
  const alto = angolo.startsWith('alto');
  const sinistra = angolo.endsWith('sinistra');
  const orizzontale = `calc(${sinistra ? '-' : ''}${f.fuori}% ${sinistra ? '+' : '-'} ${f.scorre}vw)`;
  const verticale = `calc(${alto ? '-' : ''}${f.fuori}% ${alto ? '+' : '-'} ${f.scende}vw)`;

  return {
    [alto ? 'top' : 'bottom']: 0,
    [sinistra ? 'left' : 'right']: 0,
    transform: `translate(${orizzontale}, ${verticale}) rotate(${f.ruota}deg)${
      f.specchia ? ' scaleX(-1)' : ''
    }`,
  };
}

export default function Decoro({
  ciuffo,
  angolo,
  suScuro = false,
}: {
  ciuffo: Ciuffo;
  angolo: Angolo;
  /** true sulle fasce scure: il tratto va schiarito invece che scurito */
  suScuro?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`decoro ${suScuro ? 'decoro-su-scuro' : ''} pointer-events-none absolute inset-0 block overflow-hidden ${
        MASCHERA[angolo]
      }`}
    >
      {CIUFFI[ciuffo].map((f: Foglia, i) => {
        const [telefono, schermo] = LARGHEZZA[f.misura];
        return (
          <img
            key={`${f.disegno}-${i}`}
            src={`/sfondi/${f.disegno}.svg`}
            alt=""
            loading="lazy"
            decoding="async"
            style={
              {
                ...posizione(angolo, f),
                // Le due larghezze viaggiano come variabili: a scegliere fra
                // telefono e schermo grande e' la media query in index.css.
                // Un min()/max() qui non saprebbe distinguerli, perche' non
                // conosce il punto in cui cambia l'impaginazione.
                '--larga-telefono': `${telefono}vw`,
                '--larga-schermo': `${schermo}vw`,
                aspectRatio: String(RAPPORTO[f.disegno]),
              } as React.CSSProperties
            }
            className={`absolute max-w-none select-none ${
              f.soloDaTablet ? 'hidden md:block' : 'block'
            }`}
          />
        );
      })}
    </span>
  );
}
