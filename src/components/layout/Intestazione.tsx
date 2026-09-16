import { Link } from 'react-router-dom';
import { NOME_SALONE, SOTTOTITOLO_SALONE } from '../../lib/salone';

// Intestazione delle pagine pubbliche (Home, Dove siamo, Privacy, Cookie).
//
// ─── TRASPARENTE, E APPOGGIATA SOPRA ────────────────────────────────────────
//
// Non ha fondo e non occupa posto nel flusso: sta sopra la pagina. Sull'home
// questo vuol dire che l'apertura verde comincia al pixel zero e il fogliame
// sale fino in cima senza incontrare nessuna riga — prima una fascia di verde
// più scuro tagliava a metà la foglia di destra, ed era quel taglio a dare
// l'impressione di due pezzi incollati.
//
// IL PREZZO DA PAGARE, e come si paga. Senza fondo, l'insegna prende il colore
// di quello che ha sotto — e sotto non c'è sempre il verde: Privacy, Cookie e
// Dove siamo hanno la carta chiara, dove un testo avorio sparirebbe.
// Per questo c'è `sopra`: non due intestazioni diverse, ma una sola che sa su
// che colore è appoggiata e sceglie l'inchiostro di conseguenza.
//
// E siccome non occupa posto, la pagina sotto deve lasciarglielo: ognuna di
// quelle quattro parte con un margine in alto che tiene conto dell'insegna.
// Se un domani si aggiunge una pagina e ci si dimentica, il titolo finisce
// sotto l'insegna: è il difetto che viene in coppia con questa scelta, e sta
// scritto qui perché chi lo incontra sappia subito dove guardare.

type Props = {
  /** su che colore è appoggiata: decide l'inchiostro, non il fondo */
  sopra?: 'scuro' | 'chiaro';
};

export default function Intestazione({ sopra = 'chiaro' }: Props) {
  const scuro = sopra === 'scuro';

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-1 sm:px-5">
        <Link to="/" className="flex min-w-0 flex-col gap-px">
          <span
            className={`font-titolo text-xl font-bold leading-none tracking-wide ${
              scuro ? 'text-carta-chiara' : 'text-inchiostro'
            }`}
          >
            {NOME_SALONE}
          </span>
          <span
            className={`truncate text-[0.58rem] uppercase leading-none tracking-[0.12em] sm:tracking-[0.18em] ${
              scuro ? 'text-cuoio-chiaro' : 'text-marrone'
            }`}
          >
            {SOTTOTITOLO_SALONE}
          </span>
        </Link>

        {/* Un comando solo, in cuoio come quello grande dell'apertura: si
            legge come lo stesso invito ripetuto in piccolo, non come un
            secondo invito diverso. Prima qui c'era il numero di telefono da
            solo, che a quella distanza dall'insegna sembrava lasciato lì. */}
        <Link
          to="/prenota"
          // 56 px e non meno: CLAUDE.md lo impone per ogni area toccabile,
          // perche' il pubblico del salone comprende persone anziane. La
          // barra resta comunque bassa perche' l'altezza gliela toglie il
          // margine, non il bottone.
          className="flex min-h-[56px] shrink-0 items-center rounded-lg border border-cuoio-scuro bg-cuoio px-4 font-titolo text-sm font-bold uppercase tracking-wide text-crema"
        >
          Prenota
        </Link>
      </div>
    </header>
  );
}
