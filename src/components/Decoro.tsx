// Le foglie che decorano le fasce della pagina.
//
// Come è fatta una decorazione:
//
//   <span>   copre TUTTA la fascia, ritaglia quel che esce e porta la
//            maschera che sfuma verso il centro. La maschera sta qui, sulla
//            fascia, e non sul disegno: così sfuma sempre alla stessa
//            distanza dall'angolo, qualunque sia la misura del disegno e
//            comunque sia alta la fascia.
//   <img>    la foglia vera, agganciata all'angolo e spinta fuori del 35%
//            della propria misura.
//
// Le regole che ne discendono:
//  - le foglie stanno SOLO NEGLI ANGOLI e sconfinano oltre il bordo. Non
//    esistono posizioni a metà lato: una foglia che spunta dal centro sembra
//    un ritaglio appoggiato lì per sbaglio, non fogliame che continua fuori;
//  - lo sconfinamento è una FRAZIONE del disegno, non un valore fisso in rem.
//    Con un margine fisso di 2-3 rem un disegno da 30 rem restava dentro la
//    fascia per il 90%: si vedeva tutto il rettangolo, coi bordi dritti del
//    ritaglio in mezzo al colore;
//  - il tratto si dissolve prima di arrivare al centro della fascia, così
//    non litiga mai col testo;
//  - una fascia sola, una foglia sola. Sulla pagina ce ne sono quattro in
//    tutto: prima erano undici elementi decorativi e il listino finiva
//    dentro un cespuglio.
//
// Sono SVG, non fotografie: pesano 20-34 kB compressi e restano nitide a
// qualunque misura, su qualunque schermo. È il motivo per cui la vecchia
// cornice dell'apertura è stata buttata — era un JPEG da 1200 px tirato a
// 2000 e si vedeva.
//
// Incisioni botaniche — attribuzione nel piede del sito.

type Disegno =
  | 'foglia-lancia'
  | 'foglia-larga'
  | 'foglia-sottile'
  | 'monstera-incisa'
  | 'palma';

type Angolo = 'alto-sinistra' | 'alto-destra' | 'basso-sinistra' | 'basso-destra';

/**
 * Proporzione di ogni disegno, presa dal suo viewBox. Serve a dare
 * all'immagine la sua forma PRIMA che il file sia sceso: lo sconfinamento
 * verticale è una percentuale della propria altezza, che senza questa riga
 * vale zero finché l'immagine non arriva. Il risultato era un saltello: la
 * foglia compariva accostata al bordo e poi si spostava.
 */
const RAPPORTO: Record<Disegno, string> = {
  'foglia-lancia': 'aspect-[1232/1885]',
  'foglia-larga': 'aspect-[1204/1305]',
  'foglia-sottile': 'aspect-[1012/1756]',
  'monstera-incisa': 'aspect-[1204/1305]',
  palma: 'aspect-[1584/2041]',
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
  suScuro = false,
  soloDaTablet = false,
}: {
  disegno: Disegno;
  angolo: Angolo;
  /** classi Tailwind di larghezza, così ogni fascia può avere la sua scala */
  larghezza?: string;
  /** ribalta in orizzontale, per far "guardare" il disegno verso l'interno */
  specchia?: boolean;
  /** capovolge il disegno: serve alle foglie dritte in un angolo alto */
  ruota?: boolean;
  /** true sulle fasce scure: il tratto va schiarito invece che scurito */
  suScuro?: boolean;
  /** true quando su telefono coprirebbe il testo */
  soloDaTablet?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`decoro ${suScuro ? 'decoro-su-scuro' : ''} pointer-events-none absolute inset-0 overflow-hidden ${
        MASCHERA[angolo]
      } ${soloDaTablet ? 'hidden md:block' : 'block'}`}
    >
      <img
        src={`/sfondi/${disegno}.svg`}
        alt=""
        loading="lazy"
        decoding="async"
        className={`absolute max-w-none select-none ${larghezza} ${RAPPORTO[disegno]} ${
          POSIZIONE[angolo]
        } ${specchia ? '-scale-x-100' : ''} ${ruota ? 'rotate-180' : ''}`}
      />
    </span>
  );
}
