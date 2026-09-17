import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CalendarioMese from '../components/CalendarioMese';
import CorniceVintage from '../components/CorniceVintage';
import Decoro from '../components/Decoro';
import OrariDelGiorno from '../components/OrariDelGiorno';
import Separatore from '../components/Separatore';
import Intestazione from '../components/layout/Intestazione';
import Piede from '../components/layout/Piede';
import {
  aggiungiGiorni,
  annoMeseDi,
  dataRomaDi,
  formattaGiornoEsteso,
  type AnnoMese,
} from '../lib/data';
import {
  agendaDelGiorno,
  agendaDelMese,
  precarica,
  type RigaAgenda,
  type RigaGiorno,
} from '../lib/agenda';
import { serviziAttivi, type Servizio } from '../lib/db';
import { TELEFONO_SALONE, TELEFONO_SALONE_TEL } from '../lib/salone';

// La pagina pubblica del calendario: si guarda com'è messa l'agenda senza
// dover cominciare una prenotazione.
//
// ─── COSA SI VEDE E COSA NO ─────────────────────────────────────────────────
//
// Si vede quali giorni hanno posto e quali no, e dentro un giorno quali ore
// sono libere e quali prese. Non si vede NIENT'ALTRO: non chi ha prenotato,
// non quanti sono, non con quale barbiere. Non è una scelta di garbo, è come
// è fatto il sistema — il sito non legge mai le prenotazioni, riceve dalle
// Cloud Functions istanti già decisi libero/occupato (CLAUDE.md § 2). Anche
// volendo, da questa pagina non ci sarebbe un nome da mostrare.
// Per lo stesso motivo qui gli orari non sono nemmeno bottoni: è una vetrina.
//
// ─── PERCHÉ C'È DA SCEGLIERE IL SERVIZIO ────────────────────────────────────
//
// Sembra una complicazione e invece è l'unico modo perché il calendario dica
// la verità. Un buco di mezz'ora è libero per una barba e non per taglio più
// barba: senza dire per cosa, "libero" non vuol dire niente.
// Si parte dal primo servizio del listino, che è quello che il titolare ha
// messo per primo, e si può cambiare con un tocco.

const FINESTRA_MASSIMA_GIORNI = 60;

/**
 * L'avviso quando l'agenda non arriva.
 *
 * Diceva soltanto "non riesco a leggere il calendario, riprova tra poco", e
 * lasciava la persona davanti a una pagina vuota senza niente da fare. Le
 * cause possibili sono tutte fuori dalla sua portata — il server non risponde,
 * la rete è andata, il telefono è in galleria — e nessuna la riguarda.
 * Quello che la riguarda è che il salone ha un numero e risponde: per questo
 * l'avviso finisce sempre col numero, come il resto del sito (SPECIFICA.md
 * § 6, "Chiama il salone visibile in ogni schermata").
 */
function Avviso({ testo }: { testo: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-allarme bg-allarme-sfondo px-4 py-4">
      <p className="text-lg font-bold text-allarme-testo">{testo}</p>
      <a
        href={TELEFONO_SALONE_TEL}
        className="flex min-h-[56px] items-center justify-center rounded-lg bg-verde px-6 font-titolo text-lg font-bold uppercase tracking-wide text-carta-chiara"
      >
        Chiama il {TELEFONO_SALONE}
      </a>
    </div>
  );
}

export default function Calendario() {
  const oggi = dataRomaDi(new Date().toISOString());
  const ultimoGiorno = aggiungiGiorni(oggi, FINESTRA_MASSIMA_GIORNI - 1);
  const primoMese = annoMeseDi(oggi);
  const ultimoMese = annoMeseDi(ultimoGiorno);

  const [servizi, setServizi] = useState<Servizio[] | null>(null);
  const [erroreServizi, setErroreServizi] = useState(false);
  const [servizioId, setServizioId] = useState<string | null>(null);

  const [mese, setMese] = useState<AnnoMese>(primoMese);
  const [giorniMese, setGiorniMese] = useState<RigaGiorno[] | null>(null);
  const [erroreMese, setErroreMese] = useState<string | null>(null);

  const [giornoAperto, setGiornoAperto] = useState<string | null>(null);
  const [righeGiorno, setRigheGiorno] = useState<RigaAgenda[] | null>(null);
  const [erroreGiorno, setErroreGiorno] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    serviziAttivi()
      .then((righe) => {
        if (!attivo) return;
        setServizi(righe);
        setServizioId((id) => id ?? righe[0]?.id ?? null);
      })
      .catch(() => {
        // Non `setServizi([])`: un elenco vuoto vuol dire "il salone non ha
        // ancora messo il listino", e qui invece non siamo riusciti a
        // chiederlo. Detto male, la pagina darebbe la colpa al salone per un
        // guasto di rete.
        if (attivo) setErroreServizi(true);
      });
    return () => {
      attivo = false;
    };
  }, []);

  useEffect(() => {
    if (!servizioId) return;
    let attivo = true;
    setGiorniMese(null);
    setErroreMese(null);
    agendaDelMese(servizioId, mese)
      .then((r) => {
        if (!attivo) return;
        setGiorniMese(r);
        // Gli orari del primo giorno libero partono subito: è la casella che
        // quasi tutti aprono per prima, e intanto che si legge il calendario
        // la risposta è già per strada.
        const primoLibero = r.find((g) => g.giorno >= oggi && g.libero);
        if (primoLibero) precarica(agendaDelGiorno(servizioId, primoLibero.giorno));
      })
      .catch(() => {
        if (attivo) setErroreMese('Il calendario non risponde. Può essere la rete, oppure un problema nostro.');
      });
    return () => {
      attivo = false;
    };
  }, [servizioId, mese, oggi]);

  function apriGiorno(dataStr: string) {
    if (!servizioId) return;
    setGiornoAperto(dataStr);
    setRigheGiorno(null);
    setErroreGiorno(null);
    agendaDelGiorno(servizioId, dataStr)
      .then(setRigheGiorno)
      .catch(() => setErroreGiorno('Gli orari di questo giorno non arrivano. Può essere la rete, oppure un problema nostro.'));
  }

  const servizio = servizi?.find((s) => s.id === servizioId) ?? null;
  const liberi = righeGiorno?.filter((r) => r.libero).length ?? 0;

  return (
    <>
      <Intestazione sopra="scuro" />

      <main>
        {/* Testata verde, come l'apertura della home: dice subito che cos'è
            questa pagina e la lega al resto del sito. */}
        <section className="relative overflow-hidden bg-verde px-5 pb-12 pt-24 text-carta-chiara sm:pb-14 sm:pt-28">
          <Decoro macchia="cornicePiena" suScuro />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            {/* La via di ritorno. L'insegna in alto porta alla home, ma è un
                logo: chi non l'ha capito resta qui dentro e torna indietro col
                tasto del telefono, che su una pagina raggiunta da un link
                esterno non porta da nessuna parte. */}
            <Link
              to="/"
              className="mb-6 inline-flex min-h-[48px] items-center font-titolo text-base font-bold text-cuoio-chiaro"
            >
              ‹ Torna alla home
            </Link>
            <p className="font-titolo text-[0.7rem] uppercase tracking-[0.28em] text-marrone-chiaro">
              Il calendario della bottega
            </p>
            <h1 className="mt-4 font-titolo text-3xl font-bold uppercase leading-[1.14] sm:text-5xl">
              Quando c'è posto
            </h1>
            <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-verde-chiaro">
              I giorni e le ore libere dei prossimi due mesi. Puoi guardare senza prenotare.
            </p>
          </div>
        </section>

        <Separatore da="verde" a="pieno" />

        <section className="relative overflow-hidden bg-pieno px-3 py-12 sm:px-5 sm:py-16">
          <Decoro macchia="corniceBassa" />
          <div className="relative z-10 mx-auto max-w-2xl">
            <CorniceVintage>
              {/* PER QUALE SERVIZIO. Bottoni e non una tendina, come ovunque
                  in questo sito (CLAUDE.md § "Interfaccia"). */}
              {servizi && servizi.length > 1 && (
                <div className="flex flex-col gap-3">
                  <h2 className="font-titolo text-sm font-bold uppercase tracking-[0.2em] text-marrone">
                    Per quale servizio
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {servizi.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setServizioId(s.id);
                          setGiornoAperto(null);
                        }}
                        aria-pressed={servizioId === s.id}
                        className={`min-h-[56px] rounded-xl border-2 px-4 font-titolo text-base font-bold ${
                          servizioId === s.id
                            ? 'border-verde bg-verde text-carta-chiara'
                            : 'border-bordo bg-carta-chiara text-inchiostro'
                        }`}
                      >
                        {s.nome}
                        <span className="ml-2 text-sm font-normal opacity-80">
                          {s.durata_minuti} min
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {servizi?.length === 0 && (
                <p className="text-lg text-grigio">
                  Il listino non è ancora online, quindi non posso mostrarti il calendario.{' '}
                  <a href={TELEFONO_SALONE_TEL} className="font-bold text-marrone underline">
                    Chiama il {TELEFONO_SALONE}
                  </a>{' '}
                  e te lo diciamo noi.
                </p>
              )}

              {erroreServizi && (
                <Avviso testo="Non riesco a raggiungere il salone. Può essere la rete, oppure un problema nostro." />
              )}

              {erroreMese && (
                <div className="mt-6">
                  <Avviso testo={erroreMese} />
                </div>
              )}

              {servizioId && (
                <div className="mt-6">
                  <CalendarioMese
                    mese={mese}
                    onMese={(m) => {
                      setMese(m);
                      setGiornoAperto(null);
                    }}
                    giorni={giorniMese}
                    oggi={oggi}
                    ultimoGiorno={ultimoGiorno}
                    primoMese={primoMese}
                    ultimoMese={ultimoMese}
                    onGiorno={apriGiorno}
                  />
                  {!giorniMese && !erroreMese && (
                    <p className="mt-4 text-lg text-grigio">Leggo il calendario…</p>
                  )}
                </div>
              )}
            </CorniceVintage>
          </div>
        </section>

        {/* LA GIORNATA APERTA. Compare sotto il calendario invece di prendere
            il posto della griglia: così resta visibile da dove si è arrivati,
            e si può saltare da un giorno all'altro senza tornare indietro
            ogni volta. */}
        {giornoAperto && (
          <>
            <Separatore da="pieno" a="carta-chiara" />
            <section className="relative overflow-hidden bg-carta-chiara px-3 py-12 sm:px-5 sm:py-16">
              <Decoro macchia="corniceAlta" />
              <div className="relative z-10 mx-auto max-w-2xl">
                <CorniceVintage contenuto="flex flex-col gap-5">
                  <div>
                    <h2 className="font-titolo text-2xl font-bold uppercase leading-tight text-inchiostro">
                      {formattaGiornoEsteso(giornoAperto)}
                    </h2>
                    {servizio && (
                      <p className="mt-1 text-base text-grigio">
                        per {servizio.nome.toLowerCase()} · {servizio.durata_minuti} minuti
                      </p>
                    )}
                  </div>

                  {erroreGiorno && <Avviso testo={erroreGiorno} />}
                  {!righeGiorno && !erroreGiorno && (
                    <p className="text-lg text-grigio">Leggo gli orari…</p>
                  )}
                  {righeGiorno?.length === 0 && !erroreGiorno && (
                    <p className="text-lg text-grigio">Il salone è chiuso questo giorno.</p>
                  )}

                  {righeGiorno && righeGiorno.length > 0 && (
                    <>
                      <p className="text-lg text-grigio">
                        {liberi === 0
                          ? 'Tutti gli orari di questo giorno sono presi.'
                          : `${liberi} ${liberi === 1 ? 'orario libero' : 'orari liberi'}.`}
                      </p>
                      <OrariDelGiorno righe={righeGiorno} />
                      <Link
                        to="/prenota"
                        className="bottone-cuoio flex min-h-[64px] items-center justify-center rounded-lg bg-cuoio px-8 font-titolo text-lg font-bold uppercase tracking-wide text-crema"
                      >
                        Prenota un posto
                      </Link>
                    </>
                  )}
                </CorniceVintage>
              </div>
            </section>
          </>
        )}
      </main>

      <Separatore da={giornoAperto ? 'carta-chiara' : 'pieno'} a="inchiostro" />
      <Piede attaccato />
    </>
  );
}
