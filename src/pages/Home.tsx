import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Intestazione from '../components/layout/Intestazione';
import Piede from '../components/layout/Piede';
import { INDIRIZZO_SALONE, TELEFONO_SALONE } from '../lib/salone';
import { supabase } from '../lib/supabase';

// SPECIFICA.md § 10 — Home: chi siamo, foto, servizi con prezzi, Prenota
// sempre visibile. Foto e testo specifico del salone: segnaposto, da
// aggiungere quando arrivano (vedi § 11).

type Servizio = { id: string; nome: string; durata_minuti: number; prezzo_cent: number };

const formattatorePrezzo = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

const datiStrutturati = {
  '@context': 'https://schema.org',
  '@type': 'HairSalon',
  name: 'Salone — Solarino',
  address: {
    '@type': 'PostalAddress',
    streetAddress: INDIRIZZO_SALONE,
    addressLocality: 'Solarino',
    addressRegion: 'SR',
    addressCountry: 'IT',
  },
  telephone: TELEFONO_SALONE,
};

export default function Home() {
  const [servizi, setServizi] = useState<Servizio[] | null>(null);

  useEffect(() => {
    supabase
      .from('servizi')
      .select('id, nome, durata_minuti, prezzo_cent')
      .order('ordine')
      .then(({ data }) => setServizi(data ?? []));
  }, []);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datiStrutturati) }} />
      <Intestazione />

      <main className="mx-auto max-w-3xl px-5 py-12">
        <section className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-56 w-full items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-white text-lg text-stone-400">
            Foto del salone
          </div>
          <h1 className="font-titolo text-4xl font-semibold text-stone-900">Il tuo barbiere a Solarino</h1>
          <p className="max-w-xl text-xl text-stone-700">
            Taglio, barba e cura della persona. Prenoti in due minuti, senza registrarti.
          </p>
          <Link
            to="/prenota"
            className="flex min-h-[56px] items-center justify-center rounded-xl bg-stone-900 px-8 text-lg font-semibold text-white"
          >
            Prenota ora
          </Link>
        </section>

        <section className="mt-20">
          <h2 className="font-titolo text-2xl font-semibold text-stone-900">I nostri servizi</h2>
          <div className="mt-6 flex flex-col gap-3">
            {servizi?.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border-2 border-stone-200 bg-white px-5 py-4"
              >
                <div>
                  <p className="text-lg font-semibold text-stone-900">{s.nome}</p>
                  <p className="text-base text-stone-600">{s.durata_minuti} min</p>
                </div>
                <p className="text-lg font-semibold text-amber-800">
                  {formattatorePrezzo.format(s.prezzo_cent / 100)}
                </p>
              </div>
            ))}
            {!servizi && <p className="text-lg text-stone-700">Carico i servizi…</p>}
          </div>
        </section>
      </main>

      <Piede />
    </>
  );
}
