import { Link } from 'react-router-dom';
import {
  NOME_SALONE,
  SOTTOTITOLO_SALONE,
  TELEFONO_SALONE_TEL,
} from '../../lib/salone';

// Intestazione delle pagine pubbliche (Home, Dove siamo, Privacy).
// Il flusso di prenotazione e il pannello admin restano senza — un
// compito solo, senza distrazioni di navigazione.
//
// "Chiama" sta qui e non in un menu: per una parte del pubblico resta
// la strada giusta, e deve essere raggiungibile senza pensarci.
export default function Intestazione() {
  return (
    <header className="border-b border-bordo bg-carta">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
        <Link to="/" className="flex flex-col gap-px">
          <span className="font-titolo text-2xl leading-tight text-inchiostro">{NOME_SALONE}</span>
          <span className="text-[0.62rem] uppercase tracking-[0.14em] text-ottone">
            {SOTTOTITOLO_SALONE}
          </span>
        </Link>

        <a
          href={TELEFONO_SALONE_TEL}
          className="flex min-h-[48px] items-center gap-2 rounded-full border-2 border-inchiostro px-4 text-base font-bold text-inchiostro"
        >
          <IconaTelefono />
          Chiama
        </a>
      </div>
    </header>
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
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}
