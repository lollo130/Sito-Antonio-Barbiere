import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import GalleriaTagli from '../components/GalleriaTagli';
import CorniceVintage from '../components/CorniceVintage';
import Separatore from '../components/Separatore';
import Decoro from '../components/Decoro';
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
import { serviziAttivi } from '../lib/db';

// SPECIFICA.md § 10 — Home: chi siamo, foto, servizi con prezzi, Prenota
// sempre visibile. Più la storia della bottega dal 1982 e la galleria.
//
// Impaginazione a fasce di colore piene e alternate: verde scuro, pietra,
// carta, pietra, verde chiaro, inchiostro. Ogni fascia occupa tutta la
// larghezza, così su schermo grande non restano corridoi vuoti ai lati e la
// pagina ha un ritmo, invece di essere una colonna stretta sul bianco.

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
    serviziAttivi()
      .then(setServizi)
      .catch(() => setServizi([]));
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datiStrutturati) }}
      />
      <Intestazione />

      <main>
        {/* APERTURA — blocco verde pieno. È quello che dà peso alla pagina e
            la toglie dall'aria di foglio bianco. Testo grande e chiaro su
            verde scuro: ben sopra il contrasto richiesto. */}
        <section className="relative overflow-hidden bg-verde px-5 py-14 text-carta-chiara sm:py-20">
          <Decoro disegno="palma" angolo="basso-sinistra" suScuro misura="grande" />
          <Decoro
            disegno="foglia-sottile"
            angolo="alto-destra"
            suScuro
            ruota
            misura="media"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="font-titolo text-[0.7rem] uppercase tracking-[0.28em] text-marrone-chiaro">
              Dal {ANNO_FONDAZIONE} a Solarino
            </p>
            <h1 className="mt-5 font-titolo text-4xl font-bold uppercase leading-[1.12] sm:text-6xl">
              Il tuo barbiere
              <br />a Solarino
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-verde-chiaro sm:text-xl">
              Taglio, barba e cura della persona. Prenoti in un minuto, senza registrarti.
            </p>

            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/prenota"
                className="bottone-cuoio flex min-h-[64px] items-center justify-center gap-2 rounded-lg bg-cuoio px-10 font-titolo text-xl font-bold uppercase tracking-wide text-crema"
              >
                Prenota ora
                <IconaFreccia />
              </Link>
              <a
                href={TELEFONO_SALONE_TEL}
                className="flex min-h-[64px] items-center justify-center rounded-lg border-2 border-cuoio-chiaro bg-transparent px-8 font-titolo text-lg font-bold uppercase tracking-wide text-cuoio-chiaro"
              >
                Chiama
              </a>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-1 border-t border-carta-chiara/25 pt-6 sm:flex-row sm:gap-4">
              <span className="flex items-center gap-2 font-titolo text-base font-bold">
                <IconaOrologio />
                {ORARIO_SINTESI}
              </span>
              <span className="text-base text-verde-chiaro">{GIORNI_CHIUSURA}</span>
            </div>
          </div>
        </section>

        <Separatore />

        {/* SERVIZI — fascia pietra con schede chiare, due colonne da tablet
            in su, così su schermo grande lo spazio è occupato davvero. */}
        <section className="relative overflow-hidden bg-pieno px-3 py-12 sm:px-5 sm:py-20">
          <Decoro disegno="foglia-lancia" angolo="alto-sinistra" ruota misura="media" />
          <Decoro
            disegno="monstera-incisa"
            angolo="basso-destra"
            misura="grande"
            soloDaTablet
          />
          <div className="relative mx-auto max-w-4xl">
            <CorniceVintage>
            <Titolo>I nostri servizi</Titolo>
            <p className="mt-2 text-lg text-grigio">Prezzi chiari, nessuna sorpresa alla cassa.</p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {servizi?.map((s) => (
                <div
                  key={s.id}
                  className="scheda-cuoio flex items-center justify-between gap-3 rounded-lg bg-carta-chiara px-4 py-4 sm:gap-4 sm:px-5"
                >
                  <div>
                    <p className="font-titolo text-lg font-bold text-inchiostro">{s.nome}</p>
                    <p className="text-base text-grigio">{s.durata_minuti} minuti</p>
                  </div>
                  <p className="whitespace-nowrap font-titolo text-2xl font-bold text-marrone">
                    {formattatorePrezzo.format(s.prezzo_cent / 100)}
                  </p>
                </div>
              ))}
              {!servizi && <p className="text-lg text-grigio">Carico i servizi…</p>}
              {servizi?.length === 0 && (
                <p className="text-lg text-grigio">
                  Il listino non è ancora online.{' '}
                  <a href={TELEFONO_SALONE_TEL} className="font-bold text-marrone underline">
                    Chiamaci
                  </a>{' '}
                  e te lo diciamo noi.
                </p>
              )}
            </div>
            </CorniceVintage>
          </div>
        </section>

        <Separatore />

        {/* LA BOTTEGA — fascia chiara, il 1982 grande come un marchio. */}
        <section className="relative overflow-hidden bg-carta-chiara px-3 py-12 sm:px-5 sm:py-16">
          <Decoro disegno="foglia-larga" angolo="alto-destra" ruota misura="grande" />
          <Decoro
            disegno="palma"
            angolo="basso-sinistra"
            specchia
            misura="media"
            soloDaTablet
          />
          <div className="relative mx-auto max-w-4xl">
            <CorniceVintage contenuto="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-10">
            <p className="font-titolo text-6xl font-bold leading-none text-cuoio-scuro sm:text-8xl">
              {ANNO_FONDAZIONE}
            </p>
            <div>
              <Titolo>La bottega</Titolo>
              <p className="font-lettura mt-4 text-lg leading-relaxed text-grigio">
                Abbiamo aperto nel {ANNO_FONDAZIONE} e da allora tagliamo capelli a Solarino, nello
                stesso quartiere e spesso agli stessi cognomi. Sono passati i figli di chi si sedeva
                qui il sabato mattina, e adesso passano i loro.
              </p>
              <p className="font-lettura mt-3 text-lg leading-relaxed text-grigio">
                [DA RISCRIVERE CON LE PAROLE DEL TITOLARE — chi ha aperto, chi ci lavora oggi, cosa
                non è cambiato in tutti questi anni. Bastano tre righe, purché siano sue.]
              </p>
            </div>
            </CorniceVintage>
          </div>
        </section>

        <Separatore />

        {/* GALLERIA — di nuovo la pietra, per staccare dalla fascia chiara. */}
        <section className="relative overflow-hidden bg-pieno px-3 py-12 sm:px-5 sm:py-20">
          <Decoro disegno="monstera-incisa" angolo="basso-destra" misura="grande" />
          <Decoro
            disegno="foglia-sottile"
            angolo="alto-sinistra"
            ruota
            misura="media"
            soloDaTablet
          />
          <div className="relative mx-auto max-w-4xl">
            <CorniceVintage>
              <Titolo>I nostri tagli</Titolo>
              <p className="mb-7 mt-2 text-lg text-grigio">Qualche lavoro fatto in bottega.</p>
              <GalleriaTagli />
            </CorniceVintage>
          </div>
        </section>

        <Separatore />

        {/* DOVE SIAMO — verde chiaro, l'ultima fascia prima del piede. */}
        <section className="relative overflow-hidden bg-verde-chiaro px-3 py-12 sm:px-5 sm:py-16">
          <Decoro disegno="foglia-lancia" angolo="basso-sinistra" misura="media" />
          <Decoro
            disegno="foglia-larga"
            angolo="alto-destra"
            ruota
            misura="media"
            soloDaTablet
          />
          <div className="relative mx-auto max-w-4xl">
            <CorniceVintage contenuto="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Titolo>Dove siamo</Titolo>
              <p className="mt-4 flex items-start gap-3 text-xl leading-relaxed text-inchiostro">
                <IconaLuogo />
                <span>
                  {VIA_SALONE}
                  <br />
                  {CAP_CITTA_SALONE}
                </span>
              </p>
            </div>
            <Link
              to="/dove-siamo"
              className="flex min-h-[60px] items-center justify-center gap-2 rounded-lg bg-verde px-8 font-titolo text-lg font-bold uppercase tracking-wide text-carta-chiara"
            >
              Come arrivare
              <IconaFreccia />
            </Link>
            </CorniceVintage>
          </div>
          <span className="sr-only">{INDIRIZZO_SALONE}</span>
        </section>
      </main>

      <Piede />
    </>
  );
}

function Titolo({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-titolo text-2xl font-bold uppercase tracking-wide text-inchiostro sm:text-3xl">
      {children}
    </h2>
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
      width="20"
      height="20"
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
      className="mt-1 shrink-0 text-verde"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
