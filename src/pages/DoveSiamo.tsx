import { useEffect, useState } from 'react';
import ChiamaSalone from '../components/prenotazione/ChiamaSalone';
import Mappa from '../components/Mappa';
import Intestazione from '../components/layout/Intestazione';
import Piede from '../components/layout/Piede';
import { INDIRIZZO_SALONE } from '../lib/salone';
import { orariSalone, type FasciaSalone } from '../lib/db';

// SPECIFICA.md § 10 — Dove siamo: indirizzo, mappa, orari, chiama,
// Google Maps e social. Mappa e link social: segnaposto finché non c'è
// un indirizzo reale (§ 11). Gli orari sono quelli veri in orari_salone.

type Fascia = FasciaSalone;

const NOMI_GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const ORDINE_SETTIMANA = [1, 2, 3, 4, 5, 6, 0];

export default function DoveSiamo() {
  const [orari, setOrari] = useState<Fascia[] | null>(null);

  useEffect(() => {
    orariSalone()
      .then(setOrari)
      .catch(() => setOrari([]));
  }, []);

  return (
    <>
      <Intestazione />

      <main className="mx-auto max-w-2xl px-5 pb-12 pt-24">
        <h1 className="font-titolo text-3xl font-semibold text-inchiostro">Dove siamo</h1>

        <div className="mt-6">
          <Mappa />
        </div>

        <p className="mt-6 text-xl text-inchiostro">{INDIRIZZO_SALONE}</p>

        <div className="mt-4">
          <ChiamaSalone />
        </div>

        <h2 className="mt-12 font-titolo text-2xl font-semibold text-inchiostro">Orari</h2>
        <div className="mt-4 flex flex-col gap-1">
          {ORDINE_SETTIMANA.map((giorno) => {
            const fasce = orari?.filter((o) => o.giorno === giorno) ?? [];
            return (
              <div key={giorno} className="flex items-baseline justify-between border-b border-bordo py-2">
                <span className="text-lg font-semibold text-inchiostro">{NOMI_GIORNI[giorno]}</span>
                <span className="text-lg text-grigio">
                  {fasce.length === 0
                    ? 'Chiuso'
                    : fasce.map((f) => `${f.ora_inizio.slice(0, 5)}–${f.ora_fine.slice(0, 5)}`).join(', ')}
                </span>
              </div>
            );
          })}
          {!orari && <p className="text-lg text-grigio">Carico gli orari…</p>}
        </div>
      </main>

      <Piede />
    </>
  );
}
