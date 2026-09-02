// Le decorazioni botaniche della pagina, tutte governate da un componente
// solo: stessa fusione, stessa opacità, stesso comportamento sul telefono.
//
// Regole che valgono per tutte:
//  - stanno SOLO NEGLI ANGOLI e sconfinano oltre il bordo. Non esistono
//    posizioni a metà lato: una foglia che spunta dal centro del bordo
//    sembra un ritaglio appoggiato lì per sbaglio, non fogliame che
//    continua fuori dalla pagina;
//  - sono decorazione pura: nessuna informazione, invisibili agli schermi
//    vocali, mai cliccabili;
//  - si caricano solo quando si arriva a quel punto della pagina, nella
//    misura giusta per lo schermo;
//  - il contenuto della fascia sta in un contenitore "relative", quindi il
//    testo resta sempre sopra.
//
// Illustrazioni Freepik — attribuzione nel piede del sito.

type Disegno = 'foglia' | 'foglia-2' | 'monstera' | 'angolo';
type Angolo = 'alto-sinistra' | 'alto-destra' | 'basso-sinistra' | 'basso-destra';

// Le due misure disponibili per ogni disegno (servono al srcset).
const MISURE: Record<Disegno, [number, number]> = {
  foglia: [500, 900],
  'foglia-2': [500, 900],
  monstera: [700, 1300],
  angolo: [600, 1000],
};

const POSIZIONE: Record<Angolo, string> = {
  'alto-sinistra': '-top-10 -left-10 md:-top-14 md:-left-14',
  'alto-destra': '-top-10 -right-10 md:-top-14 md:-right-14',
  'basso-sinistra': '-bottom-10 -left-10 md:-bottom-14 md:-left-14',
  'basso-destra': '-bottom-10 -right-10 md:-bottom-14 md:-right-14',
};

export default function Decoro({
  disegno,
  angolo,
  larghezza = 'w-[13rem] md:w-[22rem]',
  chiaro = false,
  specchia = false,
  soloDaTablet = false,
}: {
  disegno: Disegno;
  angolo: Angolo;
  /** classi Tailwind di larghezza, così ogni fascia può avere la sua scala */
  larghezza?: string;
  /** true sulle fasce scure: usa il disegno invertito, fuso in "screen" */
  chiaro?: boolean;
  /** ribalta in orizzontale, per far "guardare" il disegno verso l'interno */
  specchia?: boolean;
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
      sizes="(max-width: 767px) 55vw, 22rem"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={`decoro pointer-events-none absolute select-none ${
        inchiostro ? 'decoro-inchiostro' : ''
      } ${chiaro ? 'decoro-chiaro' : ''} ${specchia ? '-scale-x-100' : ''} ${
        soloDaTablet ? 'hidden md:block' : ''
      } ${larghezza} ${POSIZIONE[angolo]}`}
    />
  );
}
