import { useEffect, useState } from 'react';
import {
  ascoltaConsenso,
  haConsenso,
  salvaScelte,
  scelteSalvate,
} from '../lib/consenso';
import { INDIRIZZO_SALONE, VIA_SALONE, CAP_CITTA_SALONE } from '../lib/salone';

// La mappa del salone.
//
// ─── PERCHÉ NON SI CARICA SUBITO ────────────────────────────────────────────
//
// Una mappa di Google incorporata non è un'immagine: è un pezzo di Google
// dentro la nostra pagina. Nel momento in cui compare, Google riceve
// l'indirizzo IP di chi sta guardando e può posare i suoi cookie — e succede
// prima che la persona abbia chiesto qualcosa.
//
// Questo sito è stato costruito apposta per non averne bisogno: i caratteri
// sono ospitati sul nostro server invece che su Google Fonts, non c'è
// analitica, non ci sono social. È il motivo per cui finora il banner dei
// cookie non compariva nemmeno — e il Garante stesso scoraggia i banner che
// chiedono il permesso per niente.
//
// Con la mappa quel permesso serve davvero. Quindi: finché non c'è consenso si
// vede un riquadro col nostro disegno, l'indirizzo scritto e un bottone che
// carica la mappa; toccarlo VALE come consenso per la categoria "mappa", e da
// lì in poi la mappa compare da sola a ogni visita.
//
// Il link "Apri in Google Maps" invece c'è SEMPRE, anche senza consenso:
// aprire un sito in una scheda nuova è una scelta di chi tocca, e non fa
// entrare Google dentro questa pagina.

/**
 * L'indirizzo per Google, una volta sola.
 * `output=embed` è la forma che non richiede una chiave API: una chiave
 * andrebbe creata, limitata per dominio e rinnovata, e per mostrare un
 * puntino su una via sarebbe lavoro e una cosa in più che si può rompere.
 */
const RICERCA = encodeURIComponent(INDIRIZZO_SALONE);
const INCORPORATA = `https://www.google.com/maps?q=${RICERCA}&output=embed`;
const APERTA = `https://www.google.com/maps/search/?api=1&query=${RICERCA}`;

export default function Mappa() {
  const [consenso, setConsenso] = useState(() => haConsenso('mappa'));

  // Il consenso può cambiare da un'altra parte della pagina — dal banner o dal
  // pannello "Preferenze cookie" nel piede — e la mappa deve accorgersene
  // senza che si debba ricaricare.
  useEffect(() => ascoltaConsenso(() => setConsenso(haConsenso('mappa'))), []);

  function accetta() {
    // Si uniscono le scelte già fatte invece di sovrascriverle: chi aveva già
    // detto no alle statistiche non deve ritrovarsi la domanda riaperta.
    salvaScelte({ ...(scelteSalvate() ?? {}), mappa: true });
  }

  if (consenso) {
    return (
      <div className="overflow-hidden rounded-2xl border-2 border-verde">
        <iframe
          title={`Mappa: ${INDIRIZZO_SALONE}`}
          src={INCORPORATA}
          className="block h-64 w-full sm:h-80"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <a
          href={APERTA}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[56px] items-center justify-center border-t-2 border-verde bg-carta-chiara px-4 font-titolo text-base font-bold uppercase tracking-wide text-verde"
        >
          Apri in Google Maps
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-bordo bg-carta-chiara px-5 py-6">
      <div>
        <p className="font-titolo text-xl font-bold text-inchiostro">{VIA_SALONE}</p>
        <p className="text-lg text-grigio">{CAP_CITTA_SALONE}</p>
      </div>

      <p className="text-base leading-relaxed text-grigio">
        La mappa la fa Google: per mostrarla qui dentro devo dirgli che stai guardando questa
        pagina, e riceverà il tuo indirizzo IP. Decidi tu.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={accetta}
          className="flex min-h-[56px] flex-1 items-center justify-center rounded-lg bg-verde px-6 font-titolo text-base font-bold uppercase tracking-wide text-carta-chiara"
        >
          Mostra la mappa
        </button>
        <a
          href={APERTA}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[56px] flex-1 items-center justify-center rounded-lg border-2 border-verde px-6 font-titolo text-base font-bold uppercase tracking-wide text-verde"
        >
          Apri in Google Maps
        </a>
      </div>
    </div>
  );
}
