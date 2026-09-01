import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import GalleriaTagli from '../components/GalleriaTagli';
import Intestazione from '../components/layout/Intestazione';
import Piede from '../components/layout/Piede';
import {
  ANNO_FONDAZIONE,
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
// sempre visibile. Più le due sezioni chieste dal titolare: la storia della
// bottega dal 1982 e una piccola galleria di tagli.

type Servizio = { id: string; nome: string; durata_minuti: number; prezzo_cent: number };

const formattatorePrezzo = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

const datiStrutturati = {
  '@context': 'https://schema.org',
  '@type': 'HairSalon',
  name: `${NOME_SALONE} — Barbiere a Solarino`,
  foundingDate: String(ANNO_FONDAZIONE),
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
        <div className="flex h-60 flex-col items-center justify-center gap-3 border-b-2 border-verde bg-pieno sm:h-80">
          <MotivoBarbiere />
          <p className="font-titolo text-[0.66rem] uppercase tracking-[0.18em] text-pieno-testo">
            Foto del salone
          </p>
        </div>

        <section className="mx-auto max-w-3xl px-5 pb-7 pt-8 text-center">
          <p className="font-titolo text-[0.66rem] uppercase tracking-[0.24em] text-marrone">
            Dal {ANNO_FONDAZIONE} a Solarino
          </p>
          <h1 className="mt-3 font-titolo text-3xl font-bold uppercase leading-[1.18] text-inchiostro sm:text-4xl">
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
            className="mt-6 flex min-h-[60px] items-center justify-center gap-2 rounded-lg bg-verde px-8 font-titolo text-xl font-bold uppercase tracking-wide text-carta-chiara"
          >
            Prenota ora
            <IconaFreccia />
          </Link>

          <p className="mt-4 text-base text-grigio">
            Oppure{' '}
            <a href={TELEFONO_SALONE_TEL} className="font-bold text-marrone underline">
              chiamaci allo {TELEFONO_SALONE}
            </a>
          </p>
        </section>

        {/* Orari: la domanda che la gente si fa prima di tutte le altre. */}
        <section className="mx-auto max-w-3xl px-5">
          <div className="flex items-center gap-3 rounded-lg bg-verde px-5 py-4 text-carta-chiara">
            <IconaOrologio />
            <div>
              <p className="font-titolo text-base font-bold leading-snug">{ORARIO_SINTESI}</p>
              <p className="text-[0.85rem] text-verde-chiaro">{GIORNI_CHIUSURA}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pt-10">
          <Titolo>I nostri servizi</Titolo>
          <p className="mt-1 text-base text-grigio">Prezzi chiari, nessuna sorpresa alla cassa.</p>

          <div className="mt-5 overflow-hidden rounded-lg border-2 border-verde">
            {servizi?.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-4 bg-carta-chiara px-5 py-4 ${
                  i > 0 ? 'border-t border-bordo' : ''
                }`}
              >
                <div>
                  <p className="font-titolo text-lg font-bold text-inchiostro">{s.nome}</p>
                  <p className="text-base text-grigio">{s.durata_minuti} minuti</p>
                </div>
                <p className="whitespace-nowrap font-titolo text-xl font-bold text-marrone">
                  {formattatorePrezzo.format(s.prezzo_cent / 100)}
                </p>
              </div>
            ))}
            {!servizi && (
              <p className="bg-carta-chiara px-5 py-4 text-lg text-grigio">Carico i servizi…</p>
            )}
            {servizi?.length === 0 && (
              <p className="bg-carta-chiara px-5 py-4 text-lg text-grigio">
                Il listino non è ancora online.{' '}
                <a href={TELEFONO_SALONE_TEL} className="font-bold text-marrone underline">
                  Chiamaci
                </a>{' '}
                e te lo diciamo noi.
              </p>
            )}
          </div>
        </section>

        {/* La storia della bottega. Il 1982 è l'unico dato certo che ho:
            il resto è segnaposto, da riscrivere con le sue parole. */}
        <section className="mt-12 border-y-2 border-verde bg-carta-chiara px-5 py-10">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-baseline gap-4">
              <span className="font-titolo text-5xl font-bold leading-none text-verde">
                {ANNO_FONDAZIONE}
              </span>
              <span className="h-px flex-1 bg-bordo" />
            </div>

            <h2 className="mt-4 font-titolo text-2xl font-bold uppercase tracking-wide text-inchiostro">
              La bottega
            </h2>

            <p className="mt-4 text-lg leading-relaxed text-grigio">
              Abbiamo aperto nel {ANNO_FONDAZIONE} e da allora tagliamo capelli a Solarino, nello
              stesso quartiere e spesso agli stessi cognomi. Sono passati i figli di chi si sedeva
              qui il sabato mattina, e adesso passano i loro.
            </p>
            <p className="mt-3 text-lg leading-relaxed text-grigio">
              [DA RISCRIVERE CON LE PAROLE DEL TITOLARE — chi ha aperto, chi ci lavora oggi, cosa non
              è cambiato in tutti questi anni. Bastano tre righe, purché siano sue.]
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-10">
          <Titolo>I nostri tagli</Titolo>
          <p className="mb-5 mt-1 text-base text-grigio">Qualche lavoro fatto in bottega.</p>
          <GalleriaTagli />
        </section>

        <section className="mx-auto max-w-3xl border-t-2 border-verde px-5 py-10">
          <Titolo>Dove siamo</Titolo>
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
            className="mt-5 flex min-h-[56px] items-center justify-center gap-2 rounded-lg border-2 border-verde px-5 font-titolo text-lg font-bold uppercase tracking-wide text-verde"
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

function Titolo({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-titolo text-2xl font-bold uppercase tracking-wide text-inchiostro">
      {children}
    </h2>
  );
}

function MotivoBarbiere() {
  return (
    <svg
      width="70"
      height="70"
      viewBox="0 0 48 48"
      className="text-pieno-testo"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
      className="mt-1 shrink-0 text-marrone"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
