import { dataRomaDi, formattaGiornoEsteso, formattaOra } from '../../lib/data';
import { INDIRIZZO_SALONE } from '../../lib/salone';
import type { PrenotazioneConfermata } from '../../lib/prenota';

// SPECIFICA.md § 5, "Conferma finale".

type Props = {
  prenotazione: PrenotazioneConfermata;
};

export default function ConfermaPrenotazione({ prenotazione }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-800">
          ✓
        </span>
        <h1 className="font-titolo text-3xl font-semibold text-stone-900">Prenotazione confermata</h1>
      </div>

      <p className="text-xl leading-relaxed text-stone-900">
        <strong>{prenotazione.servizio}</strong>
        <br />
        {formattaGiornoEsteso(dataRomaDi(prenotazione.inizio))}, alle {formattaOra(prenotazione.inizio)}
        <br />
        con <strong className="text-amber-800">{prenotazione.operatore}</strong>
      </p>

      <p className="text-lg text-stone-700">{INDIRIZZO_SALONE}</p>
    </div>
  );
}
