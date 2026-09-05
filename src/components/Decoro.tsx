// Le decorazioni botaniche della pagina, tutte governate da un componente
// solo: stessa fusione, stessa opacità, stesso comportamento sul telefono.
//
// Come è fatta una decorazione:
//
//   <span>   copre TUTTA la fascia, ritaglia quel che esce e porta la
//            maschera che sfuma verso il centro. La maschera sta qui, sulla
//            fascia, e non sul disegno: così sfuma sempre alla stessa
//            distanza dall'angolo, qualunque sia la misura del disegno e
//            comunque sia alta la fascia.
//   <img>    il disegno vero, agganciato all'angolo e spinto fuori del 35%
//            della propria misura.
//
// Le regole che ne discendono:
//  - le piante stanno SOLO NEGLI ANGOLI e sconfinano oltre il bordo. Non
//    esistono posizioni a metà lato: una foglia che spunta dal centro sembra
//    un ritaglio appoggiato lì per sbaglio, non fogliame che continua fuori;
//  - lo sconfinamento è una FRAZIONE del disegno, non un valore fisso in rem.
//    Con un margine fisso di 2-3 rem un disegno da 30 rem restava dentro la
//    fascia per il 90%: si vedeva tutto il rettangolo, coi bordi dritti del
//    ritaglio in mezzo al colore;
//  - il tratto si dissolve prima di arrivare al centro della fascia. Le
//    illustrazioni sono ritagli di disegni più grandi e hanno il tratto
//    tagliato di netto sul bordo: senza la sfumatura resta lì una riga
//    dritta, e se il disegno è più alto della fascia il taglio finisce
//    addirittura in mezzo al colore;
//  - le piante che crescono verso l'alto (le due foglie e la monstera) vanno
//    capovolte quando stanno in un angolo ALTO, altrimenti si vedono per il
//    gambo e sembrano appiccicate;
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

// Proporzione di ogni disegno. Serve a dare all'immagine la sua forma PRIMA
// che il file sia sceso: lo sconfinamento verticale è una percentuale della
// propria altezza, che senza questa riga vale zero finché l'immagine non
// arriva. Il risultato era un saltello: la pianta compariva accostata al
// bordo e poi si spostava.
const RAPPORTO: Record<Disegno, string> = {
  foglia: 'aspect-[900/1238]',
  'foglia-2': 'aspect-[900/1413]',
  monstera: 'aspect-[1300/1364]',
  angolo: 'aspect-square',
};

// Le due misure disponibili per ogni disegno (servono al srcset).
const MISURE: Record<Disegno, [number, number]> = {
  foglia: [500, 900],
  'foglia-2': [500, 900],
  monstera: [700, 1300],
  angolo: [600, 1000],
};

// Aggancio all'angolo e spinta fuori del 35% su tutt'e due gli assi.
const POSIZIONE: Record<Angolo, string> = {
  'alto-sinistra': 'top-0 left-0 -translate-x-[35%] -translate-y-[35%]',
  'alto-destra': 'top-0 right-0 translate-x-[35%] -translate-y-[35%]',
  'basso-sinistra': 'bottom-0 left-0 -translate-x-[35%] translate-y-[35%]',
  'basso-destra': 'bottom-0 right-0 translate-x-[35%] translate-y-[35%]',
};

// Da quale angolo della fascia parte la sfumatura (classi in index.css).
const MASCHERA: Record<Angolo, string> = {
  'alto-sinistra': 'sfuma-da-alto-sinistra',
  'alto-destra': 'sfuma-da-alto-destra',
  'basso-sinistra': 'sfuma-da-basso-sinistra',
  'basso-destra': 'sfuma-da-basso-destra',
};

export default function Decoro({
  disegno,
  angolo,
  larghezza = 'w-[18rem] md:w-[28rem]',
  specchia = false,
  ruota = false,
  soloDaTablet = false,
}: {
  disegno: Disegno;
  angolo: Angolo;
  /** classi Tailwind di larghezza, così ogni fascia può avere la sua scala */
  larghezza?: string;
  /** ribalta in orizzontale, per far "guardare" il disegno verso l'interno */
  specchia?: boolean;
  /** capovolge il disegno: serve alle piante dritte messe in un angolo alto */
  ruota?: boolean;
  /** true quando su telefono coprirebbe il testo */
  soloDaTablet?: boolean;
}) {
  const nome = disegno;
  // L'acquerello è già del verde giusto; i disegni a inchiostro nero vanno
  // virati sul verde della palette.
  const inchiostro = disegno === 'monstera' || disegno === 'angolo';
  const [piccola, grande] = MISURE[disegno];

  return (
    <span
      aria-hidden="true"
      className={`decoro pointer-events-none absolute inset-0 overflow-hidden ${
        MASCHERA[angolo]
      } ${inchiostro ? 'decoro-inchiostro' : ''} ${
        soloDaTablet ? 'hidden md:block' : 'block'
      }`}
    >
      <img
        src={`/sfondi/${nome}.webp`}
        srcSet={`/sfondi/${nome}-${piccola}.webp ${piccola}w, /sfondi/${nome}.webp ${grande}w`}
        sizes="(max-width: 767px) 60vw, 28rem"
        alt=""
        loading="lazy"
        decoding="async"
        className={`absolute max-w-none select-none ${larghezza} ${RAPPORTO[disegno]} ${
          POSIZIONE[angolo]
        } ${inchiostro ? 'decoro-tinta' : ''} ${specchia ? '-scale-x-100' : ''} ${
          ruota ? 'rotate-180' : ''
        }`}
      />
    </span>
  );
}
