import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Intestazione from '../components/layout/Intestazione';
import Piede from '../components/layout/Piede';
import {
  CAP_CITTA_SALONE,
  GIORNI_CHIUSURA,
  INDIRIZZO_SALONE,
  NOME_SALONE,
  ORARIO_SINTESI,
  TELEFONO_SALONE,
  TELEFONO_SALONE_TEL,
  VIA_SALONE,
} from '../lib/salone';
import { supabase } from '../lib/supabase';

// SPECIFICA.md § 10 — Home: chi siamo, foto, servizi con prezzi, Prenota
// sempre visibile. Foto e testo specifico del salone: segnaposto, da
// aggiungere quando arrivano (vedi § 11).

type Servizio = { id: string; nome: string; durata_minuti: number; prezzo_cent: number };

const formattatorePrezzo = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

const datiStrutturati = {
  '@context': 'https://schema.org',
  '@type': 'HairSalon',
  name: `${NOME_SALONE} — Barbiere a Solarino`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: VIA_SALONE,
    postalCode: '96010',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datiStrutturati) }}
      />
      <Intestazione />

      <main>
        {/* Finché non arrivano le foto vere, un pannello disegnato: dà
            comunque un'immagine al salone invece di un buco tratteggiato. */}
        <div className="flex h-64 flex-col items-center justify-center gap-3 border-b border-bordo bg-pietra sm:h-80">
          <MotivoBarbiere />
          <p className="text-xs uppercase tracking-[0.16em] text-pietra-testo">Foto del salone</p>
        </div>

        <section className="mx-auto max-w-3xl px-5 pb-7 pt-8 text-center">
          <h1 className="font-titolo text-4xl leading-[1.14] text-inchiostro sm:text-5xl">
            Il tuo barbiere
            <br />a Solarino
          </h1>
          <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-grigio">
            Taglio, barba e cura della persona.
            <br />
            Prenoti in un minuto, senza registrarti.
          </p>

          <Link
            to="/prenota"
            className="mt-6 flex min-h-[60px] items-center justify-center gap-2 rounded-2xl bg-inchiostro px-8 text-xl font-bold text-carta"
          >
            Prenota ora
            <IconaFreccia />
          </Link>

          <p className="mt-4 text-base text-grigio">
            Oppure{' '}
            <a href={TELEFONO_SALONE_TEL} className="font-bold text-ottone underline">
              chiamaci allo {TELEFONO_SALONE}
            </a>
          </p>
        </section>

        {/* Orari: la domanda che la gente si fa prima di tutte le altre. */}
        <section className="mx-auto max-w-3xl px-5">
          <div className="flex items-center gap-3 rounded-2xl bg-persiana px-5 py-4 text-calce">
            <IconaOrologio />
            <div>
              <p className="text-base font-bold leading-snug">{ORARIO_SINTESI}</p>
              <p className="text-[0.85rem] text-persiana-chiaro">{GIORNI_CHIUSURA}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pt-10">
          <h2 className="font-titolo text-3xl text-inchiostro">I nostri servizi</h2>
          <p className="mt-1 text-base text-grigio">Prezzi chiari, nessuna sorpresa alla cassa.</p>

          <div className="mt-5 flex flex-col gap-2.5">
            {servizi?.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-bordo bg-carta px-5 py-4"
              >
                <div>
                  <p className="text-lg font-bold text-inchiostro">{s.nome}</p>
                  <p className="text-base text-grigio">{s.durata_minuti} minuti</p>
                </div>
                <p className="font-titolo text-2xl whitespace-nowrap text-ottone">
                  {formattatorePrezzo.format(s.prezzo_cent / 100)}
                </p>
              </div>
            ))}
            {!servizi && <p className="text-lg text-grigio">Carico i servizi…</p>}
            {servizi?.length === 0 && (
              <p className="text-lg text-grigio">
                Il listino non è ancora online.{' '}
                <a href={TELEFONO_SALONE_TEL} className="font-bold text-ottone underline">
                  Chiamaci
                </a>{' '}
                e te lo diciamo noi.
              </p>
            )}
          </div>
        </section>

        <section className="mt-12 border-y border-bordo bg-carta px-5 py-10">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-titolo text-3xl text-inchiostro">Da noi</h2>
            <p className="mt-3 text-lg leading-relaxed text-stone-700">
              [TESTO DA SCRIVERE COL TITOLARE — due o tre righe: da quanti anni siete a Solarino, chi
              ci lavora, cosa vi distingue. Niente frasi da catalogo.]
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-10">
          <h2 className="font-titolo text-3xl text-inchiostro">Dove siamo</h2>
          <p className="mt-3 flex items-start gap-3 text-lg leading-relaxed">
            <IconaLuogo />
            <span>
              {VIA_SALONE}
              <br />
              {CAP_CITTA_SALONE}
            </span>
          </p>
          <Link
            to="/dove-siamo"
            className="mt-5 flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-inchiostro px-5 text-lg font-bold text-inchiostro"
          >
            Come arrivare
            <IconaFreccia />
          </Link>
          <span className="sr-only">{INDIRIZZO_SALONE}</span>
        </section>
      </main>

      <Piede />
    </>
  );
}

function MotivoBarbiere() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 48 48"
      className="text-stone-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* forbici */}
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="34" r="5" />
      <path d="M40 6 15.5 30.5M28 28l12 12M15.5 15.5 24 24" />
    </svg>
  );
}

function IconaFreccia() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IconaOrologio() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconaLuogo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-1 shrink-0 text-ottone"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
