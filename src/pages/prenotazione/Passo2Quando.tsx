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

type RigaGiorno = { giorno: string; libero: boolean };
type RigaAgenda = { inizio: string; libero: boolean; operatore_nome: string | null };

const FINESTRA_MASSIMA_GIORNI = 60;
const NOMI_GIORNI = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

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

  if (vista === 'giorno' && giornoScelto) {
    return (
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => setVista('mese')}
          className="self-start text-lg font-medium text-stone-600"
        >
          ‹ Torna al calendario
        </button>
        <h1 className="font-titolo text-3xl font-semibold text-stone-900">{formattaGiornoEsteso(giornoScelto)}</h1>

        {erroreGiorno && <p className="text-lg font-medium text-red-700">{erroreGiorno}</p>}
        {!righeGiorno && !erroreGiorno && <p className="text-lg text-stone-700">Controllo gli orari…</p>}
        {righeGiorno && righeGiorno.length === 0 && !erroreGiorno && (
          <p className="text-lg text-stone-700">Il salone è chiuso questo giorno.</p>
        )}

        <div className="flex flex-col gap-3">
          {righeGiorno?.map((r) => (
            <button
              key={r.inizio}
              type="button"
              disabled={!r.libero}
              onClick={() => onScelto(r.inizio)}
              className={`flex min-h-[56px] w-full items-center justify-between gap-4 rounded-xl border-2 px-5 py-3 text-left text-lg font-semibold ${
                r.libero
                  ? 'border-stone-900 bg-white text-stone-900 active:bg-stone-100'
                  : 'border-stone-200 bg-stone-100 text-stone-400'
              }`}
            >
              <span>{formattaOra(r.inizio)}</span>
              <span className="text-base font-normal">{r.libero ? (r.operatore_nome ?? 'Libero') : 'Occupato'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // vista === 'mese'
  const statoPerGiorno = new Map(giorniMese?.map((g) => [g.giorno, g.libero]));
  const giorniGriglia = giorniDelMese(mese.anno, mese.mese);
  const spazioIniziale = giornoSettimanaLunediPrimo(giorniGriglia[0]);
  const celle: (string | null)[] = [...Array(spazioIniziale).fill(null), ...giorniGriglia];

  const puoMesePrecedente = confrontaAnnoMese(mese, primoMese) > 0;
  const puoMeseSuccessivo = confrontaAnnoMese(mese, ultimoMese) < 0;

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onIndietro} className="self-start text-lg font-medium text-stone-600">
        ‹ Cambia servizio
      </button>
      <h1 className="font-titolo text-3xl font-semibold text-stone-900">Quando vuoi venire?</h1>

      <BottoneScelta
        etichetta={cercandoPrimoLibero ? 'Cerco il primo giorno libero…' : 'Il prima possibile'}
        onClick={vaiAlPrimaPossibile}
        disabled={cercandoPrimoLibero}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!puoMesePrecedente}
          onClick={() => setMese((m) => mesePrecedente(m))}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 text-2xl font-bold text-stone-900 disabled:opacity-30"
          aria-label="Mese precedente"
        >
          ‹
        </button>
        <p className="flex-1 text-center text-xl font-bold text-stone-900">
          {formattaMeseAnno(mese.anno, mese.mese)}
        </p>
        <button
          type="button"
          disabled={!puoMeseSuccessivo}
          onClick={() => setMese((m) => meseSuccessivo(m))}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 text-2xl font-bold text-stone-900 disabled:opacity-30"
          aria-label="Mese successivo"
        >
          ›
        </button>
      </div>

      {erroreMese && <p className="text-lg font-medium text-red-700">{erroreMese}</p>}
      {!giorniMese && !erroreMese && <p className="text-lg text-stone-700">Controllo il calendario…</p>}

      <div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-base font-semibold text-stone-600">
          {NOMI_GIORNI.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {celle.map((dataStr, i) => {
            if (!dataStr) return <div key={`vuoto-${i}`} />;
            const fuoriRange = dataStr < oggi || dataStr > ultimoGiorno;
            const libero = statoPerGiorno.get(dataStr);
            const numero = Number(dataStr.slice(-2));

            let classi =
              'flex aspect-square w-full flex-col items-center justify-center rounded-lg border-2 text-lg font-semibold ';
            if (fuoriRange || !giorniMese) {
              classi += 'border-stone-100 text-stone-300';
            } else if (libero) {
              classi += 'border-green-700 bg-green-50 text-green-900 active:bg-green-100';
            } else {
              classi += 'border-stone-300 bg-stone-100 text-stone-500';
            }

            return (
              <button
                key={dataStr}
                type="button"
                disabled={fuoriRange || !giorniMese}
                onClick={() => apriGiorno(dataStr)}
                className={classi}
              >
                {numero}
              </button>
            );
          })}
        </div>
      </div>

      <p className="flex items-center gap-4 text-base text-stone-600">
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded border-2 border-green-700 bg-green-50" /> libero
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded border-2 border-stone-300 bg-stone-100" /> pieno
        </span>
      </p>
    </div>
  );
}
