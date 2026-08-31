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
import { supabase } from '../../lib/supabase';
import type { Servizio } from './Passo1Servizio';

// Calendario mensile pubblico (SPECIFICA.md § 5): un mese alla volta a
// griglia, giorni colorati libero/pieno. Si tocca un giorno per aprire
// l'agenda di quel giorno (occupato/libero orario per orario, mai un nome).
//
// L'impaginazione riprende il calendario da parete chiesto dal titolare:
// cornice, testata verde con i giorni abbreviati, celle squadrate col numero
// in alto a sinistra, fascia in fondo. La settimana comincia di lunedì come
// da specifica, non di domenica.

type RigaGiorno = { giorno: string; libero: boolean };
type RigaAgenda = { inizio: string; libero: boolean; operatore_nome: string | null };

const FINESTRA_MASSIMA_GIORNI = 60;
const NOMI_GIORNI = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

async function agendaDelMese(servizioId: string, { anno, mese }: AnnoMese): Promise<RigaGiorno[]> {
  const { data, error } = await supabase.rpc('agenda_mese', {
    p_servizio_id: servizioId,
    p_anno: anno,
    p_mese: mese,
  });
  if (error) throw new Error(error.message);
  return (data as RigaGiorno[]) ?? [];
}

async function agendaDelGiorno(servizioId: string, dataStr: string): Promise<RigaAgenda[]> {
  const { data, error } = await supabase.rpc('agenda_giorno', {
    p_servizio_id: servizioId,
    p_data: dataStr,
  });
  if (error) throw new Error(error.message);
  return (data as RigaAgenda[]) ?? [];
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
        if (attivo) setGiorniMese(r);
      })
      .catch(() => {
        if (attivo) setErroreMese('Non riesco a controllare il calendario. Riprova tra poco.');
      });
    return () => {
      attivo = false;
    };
  }, [servizio.id, mese]);

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
      let cursore = primoMese;
      for (let i = 0; i < 3; i++) {
        const giorni = await agendaDelMese(servizio.id, cursore);
        const trovato = giorni.find((g) => g.giorno >= oggi && g.giorno <= ultimoGiorno && g.libero);
        if (trovato) {
          setMese(cursore);
          apriGiorno(trovato.giorno);
          return;
        }
        if (confrontaAnnoMese(cursore, ultimoMese) >= 0) break;
        cursore = meseSuccessivo(cursore);
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
          <div className="overflow-hidden rounded-lg border-2 border-verde">
            {righeGiorno.map((r, i) => (
              <button
                key={r.inizio}
                type="button"
                disabled={!r.libero}
                onClick={() => onScelto(r.inizio)}
                className={`flex min-h-[58px] w-full items-center justify-between gap-4 px-4 text-left ${
                  i > 0 ? 'border-t border-bordo' : ''
                } ${r.libero ? 'bg-carta-chiara active:bg-verde-chiaro' : 'bg-pieno'}`}
              >
                <span
                  className={`font-titolo text-xl font-bold tabular-nums ${
                    r.libero ? 'text-verde' : 'text-pieno-testo'
                  }`}
                >
                  {formattaOra(r.inizio)}
                </span>
                <span
                  className={`font-titolo text-sm uppercase tracking-widest ${
                    r.libero ? 'text-marrone' : 'text-pieno-testo'
                  }`}
                >
                  {r.libero ? (r.operatore_nome ?? 'libero') : 'occupato'}
                </span>
              </button>
            ))}
          </div>
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
          <p className="font-titolo text-lg font-bold uppercase tracking-[0.12em] text-inchiostro">
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
