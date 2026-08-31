import { Link } from 'react-router-dom';
import {
  CAP_CITTA_SALONE,
  NOME_SALONE,
  SOTTOTITOLO_SALONE,
  TELEFONO_SALONE,
  TELEFONO_SALONE_TEL,
  VIA_SALONE,
} from '../../lib/salone';

export default function Piede() {
  return (
    <footer className="mt-16 bg-inchiostro px-5 py-9 text-carta">
      <div className="mx-auto max-w-3xl">
        <p className="font-titolo text-2xl leading-tight text-carta-chiara">{NOME_SALONE}</p>
        <p className="mt-px text-[0.62rem] uppercase tracking-[0.14em] text-marrone-chiaro">
          {SOTTOTITOLO_SALONE}
        </p>

        <p className="mt-5 text-base leading-relaxed">
          {VIA_SALONE}
          <br />
          {CAP_CITTA_SALONE}
          <br />
          <a href={TELEFONO_SALONE_TEL} className="font-bold underline">
            {TELEFONO_SALONE}
          </a>
        </p>

        <div className="my-6 h-px bg-verde" />

        {/* Dati identificativi obbligatori per legge (D.Lgs. 70/2003):
            segnaposto finché non arrivano ragione sociale e P. IVA. */}
        <p className="text-sm leading-relaxed text-bordo">
          [RAGIONE SOCIALE] · P. IVA [NUMERO]
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          <Link to="/privacy" className="underline">
            Privacy
          </Link>
          {' · '}
          <Link to="/dove-siamo" className="underline">
            Dove siamo
          </Link>
          {' · '}
          <Link to="/installa" className="underline">
            Installa l'app
          </Link>
        </p>
      </div>
    </footer>
  );
}
