// Le decorazioni botaniche della pagina, tutte governate da un componente
// solo: stessa fusione, stessa opacità, stesso comportamento sul telefono.
//
// Regole che valgono per tutte:
//  - sono decorazione pura: nessuna informazione, invisibili agli schermi
//    vocali, mai cliccabili;
//  - stanno ANCORATE A UN ANGOLO e sconfinano fuori dal bordo, così sembrano
//    fogliame che continua oltre la pagina invece di un ritaglio appoggiato
//    in mezzo;
//  - si caricano solo quando si arriva a quel punto della pagina, nella
//    misura giusta per lo schermo;
//  - il contenuto della fascia sta in un contenitore "relative", quindi il
//    testo resta sempre sopra.
//
// Illustrazioni Freepik — attribuzione nel piede del sito.

type Disegno = 'foglia' | 'foglia-2' | 'monstera' | 'angolo';
type Angolo =
  | 'alto-sinistra'
  | 'alto-destra'
  | 'basso-sinistra'
  | 'basso-destra'
  | 'sinistra'
  | 'destra';

// Larghezza massima disponibile per ogni disegno (serve al srcset).
const MISURE: Record<Disegno, [number, number]> = {
  foglia: [500, 900],
  'foglia-2': [500, 900],
  monstera: [700, 1300],
  angolo: [600, 1100],
};

const POSIZIONE: Record<Angolo, string> = {
  'alto-sinistra': '-top-16 -left-16 md:-top-20 md:-left-20',
  'alto-destra': '-top-16 -right-16 md:-top-20 md:-right-20',
  'basso-sinistra': '-bottom-16 -left-16 md:-bottom-20 md:-left-20',
  'basso-destra': '-bottom-16 -right-16 md:-bottom-20 md:-right-20',
  sinistra: 'top-1/2 -left-24 -translate-y-1/2 -rotate-[10deg]',
  destra: 'top-1/2 -right-24 -translate-y-1/2 rotate-[10deg]',
};

export default function Decoro({
  disegno,
  angolo,
  larghezza = 'w-[16rem] md:w-[26rem]',
  chiaro = false,
  soloDaTablet = false,
}: {
  disegno: Disegno;
  angolo: Angolo;
  /** classi Tailwind di larghezza, così ogni fascia può avere la sua scala */
  larghezza?: string;
  /** true sulle fasce scure: usa il disegno invertito, fuso in "screen" */
  chiaro?: boolean;
  /** true quando su telefono coprirebbe il testo */
  soloDaTablet?: boolean;
}) {
  const nome = chiaro ? `${disegno}-chiaro` : disegno;
  // L'acquerello è già del verde giusto; i disegni a inchiostro nero vanno
  // virati sul verde della palette.
  const inchiostro = disegno === 'monstera' || disegno === 'angolo';
  const [piccola, grande] = MISURE[disegno];

  return (
    <img
      src={`/sfondi/${nome}.webp`}
      srcSet={`/sfondi/${nome}-${piccola}.webp ${piccola}w, /sfondi/${nome}.webp ${grande}w`}
      sizes="(max-width: 767px) 60vw, 26rem"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={`decoro pointer-events-none absolute select-none ${
        inchiostro ? 'decoro-inchiostro' : ''
      } ${chiaro ? 'decoro-chiaro' : ''} ${
        soloDaTablet ? 'hidden md:block' : ''
      } ${larghezza} ${POSIZIONE[angolo]}`}
    />
  );
}
