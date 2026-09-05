// Il fogliame che invade le fasce della pagina.
//
// Prima era una foglia per angolo: due per fascia, stessa misura, angoli
// opposti. Ordinatissimo e per niente vegetale — una griglia, non una
// giungla. Quello che fa sembrare vera la vegetazione è il disordine: foglie
// di misure diverse, ruotate storte, che si accavallano invece di stare
// ciascuna al suo posto.
//
// Quindi l'unità non è più la foglia singola ma il CIUFFO: tre o quattro
// foglie attorno a uno stesso angolo, ognuna con la sua misura, la sua
// inclinazione e la sua distanza dal bordo. Il disordine è scritto a mano
// una volta e resta sempre quello — non è casuale a ogni caricamento,
// altrimenti la pagina ballerebbe a ogni visita e non si potrebbe più
// correggere un ciuffo venuto male.
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
 * I ciuffi. Ognuno è pensato per un angolo preciso e ha il suo carattere,
 * così due fasce vicine non si somigliano.
 */
const CIUFFI = {
  // Palma dominante e due foglie che le crescono attorno.
  palmeto: [
    { disegno: 'palma', misura: 'grande', ruota: -12, fuori: 48, scorre: 0, scende: 6 },
    { disegno: 'foglia-lancia', misura: 'media', ruota: 24, fuori: 60, scorre: 16, scende: -4, soloDaTablet: true },
    { disegno: 'foglia-sottile', misura: 'piccola', ruota: -46, fuori: 72, scorre: 26, scende: 12, soloDaTablet: true },
  ],
  // Foglie larghe che pendono, per gli angoli alti.
  pendente: [
    { disegno: 'foglia-larga', misura: 'grande', ruota: 168, fuori: 46, scorre: 0, scende: 4 },
    { disegno: 'monstera-incisa', misura: 'media', ruota: 205, fuori: 58, scorre: 15, scende: -6, soloDaTablet: true },
    { disegno: 'foglia-sottile', misura: 'piccola', ruota: 145, fuori: 66, scorre: 28, scende: 10, soloDaTablet: true },
  ],
  // Monstera grande e sottobosco: fitto, per le fasce alte.
  sottobosco: [
    { disegno: 'monstera-incisa', misura: 'grande', ruota: 14, fuori: 44, scorre: 0, scende: 0 },
    { disegno: 'foglia-larga', misura: 'media', ruota: -28, fuori: 62, scorre: 18, scende: 14, specchia: true, soloDaTablet: true },
    { disegno: 'palma', misura: 'piccola', ruota: 40, fuori: 74, scorre: 30, scende: -8, soloDaTablet: true },
    { disegno: 'foglia-sottile', misura: 'minuta', ruota: -8, fuori: 80, scorre: 12, scende: 22, soloDaTablet: true },
  ],
  // Leggero: due foglie sottili, per le fasce basse dove non c'è spazio.
  rado: [
    { disegno: 'foglia-lancia', misura: 'media', ruota: 18, fuori: 50, scorre: 0, scende: 4 },
    { disegno: 'foglia-sottile', misura: 'piccola', ruota: -30, fuori: 64, scorre: 20, scende: -6, soloDaTablet: true },
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
