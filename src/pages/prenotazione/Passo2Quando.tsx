import { useEffect, useState } from 'react';
import BottoneScelta from '../../components/prenotazione/BottoneScelta';
import {
  aggiungiGiorni,
  annoMeseDi,
  confrontaAnnoMese,
  dataRomaDi,
  formattaGiornoEsteso,
  formattaMeseAnno,
  formattaOra,
  giorniDelMese,
  giornoSettimanaLunediPrimo,
  mesePrecedente,
  meseSuccessivo,
  type AnnoMese,
} from '../../lib/data';
import {
  agendaDelGiorno,
  agendaDelMese,
  precarica,
  type RigaAgenda,
  type RigaGiorno,
} from '../../lib/agenda';
import type { Servizio } from './Passo1Servizio';

// Calendario mensile pubblico (SPECIFICA.md § 5): un mese alla volta a
// griglia, giorni colorati libero/pieno. Si tocca un giorno per aprire
// l'agenda di quel giorno (occupato/libero orario per orario, mai un nome).
//
// L'impaginazione riprende il calendario da parete chiesto dal titolare:
// cornice, testata verde con i giorni abbreviati, celle squadrate col numero
// in alto a sinistra, fascia in fondo. La settimana comincia di lunedì come
// da specifica, non di domenica.

const FINESTRA_MASSIMA_GIORNI = 60;
const NOMI_GIORNI = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

// GLI ORARI DEL GIORNO, A GRIGLIA E DIVISI IN FASCE.
//
// Prima erano una lista verticale, una riga per orario: in una giornata piena
// diventavano trenta righe da scorrere, e per arrivare alle cinque del
// pomeriggio si passava per tutta la mattina.
//
// Era stato chiesto un menu a tendina. Non si può: CLAUDE.md § "Interfaccia"
// vieta i `<select>` proprio in questo passo, perché il pubblico del salone
// comprende persone anziane, e una tendina nasconde tutte le scelte dietro un
// tocco, si apre in modo diverso su ogni telefono e non si può ingrandire.
// La griglia risolve però il problema vero — la lista era lunga — senza
// nascondere niente: tutti gli orari restano sotto gli occhi, ogni riquadro è
// un bottone da 60 px, e tre fasce fanno capire a colpo d'occhio se il posto
// libero è di mattina o di pomeriggio.
const FASCE = [
  { chiave: 'mattina', titolo: 'Mattina' },
  { chiave: 'pomeriggio', titolo: 'Pomeriggio' },
  { chiave: 'sera', titolo: 'Sera' },
] as const;

/**
 * In quale fascia cade un istante.
 *
 * Si guarda l'ora di Roma, non quella del telefono: un cliente che prenota
 * dall'estero vedrebbe altrimenti la mattina finire nel pomeriggio.
 */
function fasciaDi(istante: string): (typeof FASCE)[number]['chiave'] {
  const ora = Number(formattaOra(istante).slice(0, 2));
  if (ora < 13) return 'mattina';
  if (ora < 18) return 'pomeriggio';
  return 'sera';
}

type Props = {
  servizio: Servizio;
  onScelto: (inizio: string) => void;
  onIndietro: () => void;
};

export default function Passo2Quando({ servizio, onScelto, onIndietro }: Props) {
  const oggi = dataRomaDi(new Date().toISOString());
  const ultimoGiorno = aggiungiGiorni(oggi, FINESTRA_MASSIMA_GIORNI - 1);
  const primoMese = annoMeseDi(oggi);
  const ultimoMese = annoMeseDi(ultimoGiorno);

  const [vista, setVista] = useState<'mese' | 'giorno'>('mese');
  const [mese, setMese] = useState<AnnoMese>(primoMese);
  const [giorniMese, setGiorniMese] = useState<RigaGiorno[] | null>(null);
  const [erroreMese, setErroreMese] = useState<string | null>(null);
  const [cercandoPrimoLibero, setCercandoPrimoLibero] = useState(false);

  const [giornoScelto, setGiornoScelto] = useState<string | null>(null);
  const [righeGiorno, setRigheGiorno] = useState<RigaAgenda[] | null>(null);
  const [erroreGiorno, setErroreGiorno] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    setGiorniMese(null);
    setErroreMese(null);
    agendaDelMese(servizio.id, mese)
      .then((r) => {
        if (!attivo) return;
        setGiorniMese(r);
        // Appena si sa quali giorni sono liberi, si chiedono gli orari del
        // primo: è la casella che quasi tutti toccano per prima, e intanto
        // che la persona legge il calendario la risposta è già per strada.
        // Se poi tocca un altro giorno non si è perso niente — una chiamata
        // che nessuno aspetta e che la cache terrà comunque da parte.
        const primoLibero = r.find((g) => g.giorno >= oggi && g.libero);
        if (primoLibero) precarica(agendaDelGiorno(servizio.id, primoLibero.giorno));
      })
      .catch(() => {
        if (attivo) setErroreMese('Non riesco a controllare il calendario. Riprova tra poco.');
      });
    return () => {
      attivo = false;
    };
    // `oggi` è una data in forma di stringa, ricalcolata a ogni disegno ma
    // sempre uguale a se stessa fino a mezzanotte: come dipendenza è stabile.
  }, [servizio.id, mese, oggi]);

  function apriGiorno(dataStr: string) {
    setGiornoScelto(dataStr);
    setVista('giorno');
    setRigheGiorno(null);
    setErroreGiorno(null);
    agendaDelGiorno(servizio.id, dataStr)
      .then(setRigheGiorno)
      .catch(() => setErroreGiorno('Non riesco a controllare gli orari. Riprova tra poco.'));
  }

  async function vaiAlPrimaPossibile() {
    setCercandoPrimoLibero(true);
    setErroreMese(null);
    try {
      // I mesi da guardare si sanno già tutti in partenza: la finestra è di
      // 60 giorni e quindi tocca al massimo tre mesi. Chiederli UNO ALLA
      // VOLTA, come si faceva prima, voleva dire aspettare tre viaggi in fila
      // per la risposta più lenta — e quasi sempre la risposta era nel primo,
      // ma i due dopo si pagavano lo stesso quando non lo era.
      // Chiesti insieme, si aspetta il più lento e basta. Il primo di solito
      // è già in cache, perché è quello precaricato alla scelta del servizio.
      const daGuardare: AnnoMese[] = [];
      let cursore = primoMese;
      for (let i = 0; i < 3; i++) {
        daGuardare.push(cursore);
        if (confrontaAnnoMese(cursore, ultimoMese) >= 0) break;
        cursore = meseSuccessivo(cursore);
      }

      const risposte = await Promise.all(
        daGuardare.map((m) => agendaDelMese(servizio.id, m)),
      );

      for (const [i, giorni] of risposte.entries()) {
        const trovato = giorni.find((g) => g.giorno >= oggi && g.giorno <= ultimoGiorno && g.libero);
        if (trovato) {
          setMese(daGuardare[i]);
          apriGiorno(trovato.giorno);
          return;
        }
      }
      setErroreMese('Non ci sono orari liberi nei prossimi 60 giorni.');
    } catch {
      setErroreMese('Non riesco a controllare gli orari liberi. Riprova tra poco.');
    } finally {
      setCercandoPrimoLibero(false);
    }
  }

  // ------------------------------------------------------------------
  // Agenda di un singolo giorno
  // ------------------------------------------------------------------
  if (vista === 'giorno' && giornoScelto) {
    const liberiDelGiorno = righeGiorno?.filter((r) => r.libero).length ?? 0;
    return (
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => setVista('mese')}
          className="self-start font-titolo text-base font-bold text-grigio"
        >
          ‹ TORNA AL CALENDARIO
        </button>

        <h1 className="font-titolo text-2xl font-bold uppercase leading-tight text-inchiostro">
          {formattaGiornoEsteso(giornoScelto)}
        </h1>

        {erroreGiorno && <p className="text-lg font-bold text-allarme-testo">{erroreGiorno}</p>}
        {!righeGiorno && !erroreGiorno && <p className="text-lg text-grigio">Controllo gli orari…</p>}
        {righeGiorno && righeGiorno.length === 0 && !erroreGiorno && (
          <p className="text-lg text-grigio">Il salone è chiuso questo giorno.</p>
        )}

        {righeGiorno && righeGiorno.length > 0 && (
          <>
            <p className="text-lg text-grigio">
              {liberiDelGiorno === 0
                ? 'Tutti gli orari di questo giorno sono presi.'
                : `${liberiDelGiorno} ${liberiDelGiorno === 1 ? 'orario libero' : 'orari liberi'}. Tocca quello che ti va bene.`}
            </p>

            {FASCE.map((fascia) => {
              const righe = righeGiorno.filter((r) => fasciaDi(r.inizio) === fascia.chiave);
              if (righe.length === 0) return null;
              return (
                <div key={fascia.chiave} className="flex flex-col gap-3">
                  <h2 className="font-titolo text-sm font-bold uppercase tracking-[0.2em] text-marrone">
                    {fascia.titolo}
                  </h2>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {righe.map((r) => (
                      <button
                        key={r.inizio}
                        type="button"
                        disabled={!r.libero}
                        onClick={() => onScelto(r.inizio)}
                        aria-label={`${formattaOra(r.inizio)}${r.libero ? '' : ', occupato'}`}
                        className={`relative flex min-h-[64px] items-center justify-center rounded-xl border-2 px-1 pb-3 ${
                          r.libero
                            ? 'border-verde bg-carta-chiara text-verde active:bg-verde active:text-carta-chiara'
                            : 'border-bordo bg-pieno text-pieno-testo line-through decoration-1'
                        }`}
                      >
                        <span className="font-titolo text-xl font-bold tabular-nums">
                          {formattaOra(r.inizio)}
                        </span>
                        {/* Il nome sta appeso in fondo al riquadro invece che
                            sotto l'ora: ce l'hanno solo alcuni orari — quelli
                            con un operatore solo libero — e messo nel flusso
                            spingeva l'ora più in alto proprio in quei
                            riquadri, lasciando le ore della stessa riga a
                            quote diverse. Così restano tutte allineate. */}
                        {r.libero && r.operatore_nome && (
                          <span className="absolute inset-x-0 bottom-1 truncate px-1 font-titolo text-[0.6rem] uppercase tracking-wider text-marrone">
                            {r.operatore_nome}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Vista mensile
  // ------------------------------------------------------------------
  const statoPerGiorno = new Map(giorniMese?.map((g) => [g.giorno, g.libero]));
  const giorniGriglia = giorniDelMese(mese.anno, mese.mese);
  const spazioIniziale = giornoSettimanaLunediPrimo(giorniGriglia[0]);
  const celle: (string | null)[] = [...Array(spazioIniziale).fill(null), ...giorniGriglia];
  while (celle.length % 7 !== 0) celle.push(null);

  const puoMesePrecedente = confrontaAnnoMese(mese, primoMese) > 0;
  const puoMeseSuccessivo = confrontaAnnoMese(mese, ultimoMese) < 0;

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onIndietro}
        className="self-start font-titolo text-base font-bold text-grigio"
      >
        ‹ CAMBIA SERVIZIO
      </button>

      <h1 className="font-titolo text-2xl font-bold uppercase leading-tight text-inchiostro">
        Quando vuoi venire?
      </h1>

      <BottoneScelta
        etichetta={cercandoPrimoLibero ? 'Cerco il primo giorno libero…' : 'Il prima possibile'}
        onClick={vaiAlPrimaPossibile}
        disabled={cercandoPrimoLibero}
      />

      {erroreMese && <p className="text-lg font-bold text-allarme-testo">{erroreMese}</p>}

      {/* Il calendario da parete: cornice, testata verde, celle squadrate. */}
      <div className="overflow-hidden rounded-lg border-2 border-verde bg-carta-chiara">
        <div className="flex items-center justify-between gap-2 border-b-2 border-verde px-2 py-2">
          <button
            type="button"
            disabled={!puoMesePrecedente}
            onClick={() => setMese((m) => mesePrecedente(m))}
            className="flex h-11 w-11 shrink-0 items-center justify-center font-titolo text-2xl font-bold text-verde disabled:opacity-25"
            aria-label="Mese precedente"
          >
            ‹
          </button>
          <p className="whitespace-nowrap font-titolo text-base font-bold uppercase tracking-[0.06em] text-inchiostro sm:text-lg sm:tracking-[0.12em]">
            {formattaMeseAnno(mese.anno, mese.mese)}
          </p>
          <button
            type="button"
            disabled={!puoMeseSuccessivo}
            onClick={() => setMese((m) => meseSuccessivo(m))}
            className="flex h-11 w-11 shrink-0 items-center justify-center font-titolo text-2xl font-bold text-verde disabled:opacity-25"
            aria-label="Mese successivo"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 bg-verde">
          {NOMI_GIORNI.map((n) => (
            <div
              key={n}
              className="py-1.5 text-center font-titolo text-[0.62rem] font-bold tracking-[0.1em] text-carta-chiara"
            >
              {n}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {celle.map((dataStr, i) => {
            const bordi = `${i % 7 !== 6 ? 'border-r' : ''} ${i >= 7 ? 'border-t' : ''} border-bordo`;

            if (!dataStr) {
              return <div key={`vuoto-${i}`} className={`min-h-[56px] bg-carta-chiara ${bordi}`} />;
            }

            const fuoriRange = dataStr < oggi || dataStr > ultimoGiorno;
            const libero = statoPerGiorno.get(dataStr);
            const numero = Number(dataStr.slice(-2));
            const eOggi = dataStr === oggi;
            const selezionabile = !fuoriRange && !!giorniMese && !!libero;

            let sfondo = 'bg-carta-chiara';
            let testo = 'text-inchiostro';
            if (fuoriRange || !giorniMese) {
              testo = 'text-bordo';
            } else if (!libero) {
              sfondo = 'bg-pieno';
              testo = 'text-pieno-testo';
            }

            return (
              <button
                key={dataStr}
                type="button"
                disabled={!selezionabile}
                onClick={() => apriGiorno(dataStr)}
                className={`relative flex min-h-[56px] flex-col items-start p-1.5 ${sfondo} ${bordi} ${
                  selezionabile ? 'active:bg-verde-chiaro' : ''
                }`}
              >
                <span
                  className={`font-titolo text-[0.82rem] font-bold tabular-nums ${
                    eOggi
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-marrone text-carta-chiara'
                      : testo
                  }`}
                >
                  {numero}
                </span>
                {selezionabile && (
                  <span className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full bg-verde" />
                )}
              </button>
            );
          })}
        </div>

        {/* La fascia in fondo, come sui calendari da parete. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-verde bg-carta px-3 py-2.5">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-verde" />
            <span className="font-titolo text-[0.66rem] uppercase tracking-[0.12em] text-inchiostro">
              Libero
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 border border-bordo bg-pieno" />
            <span className="font-titolo text-[0.66rem] uppercase tracking-[0.12em] text-grigio">
              Pieno o chiuso
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-marrone" />
            <span className="font-titolo text-[0.66rem] uppercase tracking-[0.12em] text-grigio">
              Oggi
            </span>
          </span>
        </div>
      </div>

      {!giorniMese && !erroreMese && <p className="text-lg text-grigio">Controllo il calendario…</p>}
    </div>
  );
}
