import { Link } from 'react-router-dom';
import {
  NOME_SALONE,
  SOTTOTITOLO_SALONE,
  TELEFONO_SALONE,
  TELEFONO_SALONE_TEL,
} from '../../lib/salone';

// Intestazione delle pagine pubbliche (Home, Dove siamo, Privacy, Cookie).
// Il pannello admin ha il suo guscio; il flusso di prenotazione tiene solo
// l'insegna — un compito solo, senza distrazioni di navigazione.
//
// ─── PERCHÉ SCURA E NON TRASPARENTE ─────────────────────────────────────────
//
// Prima era una fascia bianco panna sopra il verde scuro dell'apertura: due
// blocchi accostati, con l'insegna che sembrava appiccicata sopra il sito
// invece di farne parte.
//
// La strada più moderna sarebbe l'insegna trasparente, appoggiata direttamente
// sul verde. Qui non si può: questa stessa barra sta anche su Privacy, Cookie
// e Dove siamo, dove sotto non c'è nessun verde ma la carta chiara, e un testo
// avorio su carta non si legge. Renderla trasparente vorrebbe dire due
// intestazioni diverse a seconda della pagina, cioè il problema di partenza
// moltiplicato.
//
// Quindi la seconda strada: stesso verde di famiglia dell'apertura, ma un tono
// più profondo, e un filetto di bronzo a dividere. Sull'apertura i due verdi si
// leggono come un'unica massa scura con una riga di luce in mezzo; sulle pagine
// chiare resta una testata scura come quella di una carta intestata.
//
// ─── IL TELEFONO NON È PIÙ UN BOTTONE ───────────────────────────────────────
//
// C'era un "Chiama" a pillola col bordo spesso. Sull'apertura, dove il titolo
// ha già "PRENOTA ORA" e "CHIAMA" uno accanto all'altro, faceva tre comandi in
// una schermata e due dicevano la stessa cosa.
// Adesso c'è il NUMERO, scritto per esteso e toccabile, con l'icona accanto e
// niente cornice. Smette di competere con i bottoni dell'apertura — è un
// recapito, non un'azione — e il numero sotto gli occhi vale più della parola
// "chiama" per la parte di clientela che quel numero lo compone a mano.
export default function Intestazione() {
  return (
    <header className="border-b border-bronzo bg-verde-scuro">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        {/* min-w-0: senza, il blocco dell'insegna si rifiuta di stringersi e
            spinge il numero oltre il bordo dello schermo. */}
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <Monogramma />
          <span className="flex flex-col gap-px">
            <span className="font-titolo text-xl font-bold leading-none tracking-wide text-carta-chiara">
              {NOME_SALONE}
            </span>
            <span className="truncate text-[0.58rem] uppercase leading-none tracking-[0.12em] text-cuoio-chiaro sm:tracking-[0.18em]">
              {SOTTOTITOLO_SALONE}
            </span>
          </span>
        </Link>

        <a
          href={TELEFONO_SALONE_TEL}
          className="flex min-h-[48px] shrink-0 items-center gap-2 text-cuoio-chiaro"
        >
          <IconaTelefono />
          {/* Un filo piu' piccolo sul telefono: a corpo pieno il numero
              andava a capo, e una barra su due righe e' esattamente il
              contrario di quello che si voleva. */}
          <span className="whitespace-nowrap font-titolo text-sm font-bold tabular-nums sm:text-base">
            {TELEFONO_SALONE}
          </span>
        </a>
      </div>
    </header>
  );
}

/**
 * Il monogramma: la A dell'insegna dentro un riquadro di bronzo.
 *
 * Serve a dare un peso all'insegna, che da sola era una parola e basta. Non
 * un paio di forbici disegnate: un monogramma è fatto di un rettangolo e di
 * una lettera già presente nel carattere del sito, quindi è preciso per
 * costruzione e invecchia insieme al resto invece di essere un disegno a
 * parte. È anche quello che una bottega del 1982 si sarebbe fatta incidere
 * sulla targa.
 */
function Monogramma() {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-bronzo font-titolo text-lg font-bold leading-none text-cuoio-chiaro"
    >
      {NOME_SALONE.charAt(0)}
    </span>
  );
}

function IconaTelefono() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}
