import { dataRomaDi, formattaGiornoEsteso, formattaOra } from '../../lib/data';
import { CAP_CITTA_SALONE, VIA_SALONE } from '../../lib/salone';
import type { PrenotazioneConfermata } from '../../lib/prenota';

// SPECIFICA.md § 5, "Conferma finale": giorno, ora e nome dell'operatore
// assegnato, in grande. Chi arriva qui ha finito: non deve fare altro, e
// la schermata deve dirlo senza lasciare dubbi.

type Props = {
  prenotazione: PrenotazioneConfermata;
};

export default function ConfermaPrenotazione({ prenotazione }: Props) {
  const giorno = formattaGiornoEsteso(dataRomaDi(prenotazione.inizio));

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-persiana">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fffcf7"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>

      <div>
        <h1 className="font-titolo text-3xl leading-tight text-inchiostro">È tutto a posto</h1>
        <p className="mt-2 text-lg text-grigio">Ti aspettiamo. Non serve fare altro.</p>
      </div>

      <div className="w-full rounded-2xl border-2 border-inchiostro bg-carta px-5 py-6 text-left">
        <p className="font-titolo text-2xl leading-snug text-inchiostro">{giorno}</p>
        <p className="font-titolo text-2xl leading-snug text-ottone">
          alle {formattaOra(prenotazione.inizio)} con {prenotazione.operatore}
        </p>

        <div className="my-4 h-px bg-bordo" />

        <p className="text-lg font-bold text-inchiostro">{prenotazione.servizio}</p>
        <p className="mt-1 text-base leading-relaxed text-grigio">
          {VIA_SALONE}
          <br />
          {CAP_CITTA_SALONE}
        </p>
      </div>
    </div>
  );
}
