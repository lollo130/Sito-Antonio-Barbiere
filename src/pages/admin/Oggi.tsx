import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  aggiungiGiorni,
  confiniGiornoRoma,
  dataRomaDi,
  formattaGiornoEsteso,
  formattaMeseAnno,
  formattaOra,
  giorniDelMese,
  giornoSettimanaLunediPrimo,
} from '../../lib/data';
import { supabase } from '../../lib/supabase';

// SPECIFICA.md § 7.1 — l'agenda del titolare.
//
// Tre viste a scelta: giorno, settimana, mese. La lista verticale del giorno
// resta quella prevista dalla specifica; settimana e mese diventano una
// griglia solo da tablet in su (`sm:`), perché su telefono le colonne
// affiancate non si leggono. Il titolare lavora da PC, quindi lì c'è spazio.

type Stato = 'confermata' | 'completata' | 'non_presentato' | 'cancellata';
type Vista = 'giorno' | 'settimana' | 'mese';

type Prenotazione = {
  id: string;
  inizio: string;
  cliente_nome: string;
  cliente_cognome: string | null;
  cliente_telefono: string;
  stato: Stato;
  servizi: { nome: string } | null;
  operatori: { nome: string } | null;
};

type Operatore = { id: string; nome: string };

const ETICHETTA_STATO: Record<Stato, string> = {
  confermata: '',
  completata: 'Fatto',
  non_presentato: 'Non venuto',
  cancellata: 'Cancellata',
};

const NOMI_GIORNI = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

/** Il lunedì della settimana che contiene questa data. */
function lunediDi(dataStr: string): string {
  return aggiungiGiorni(dataStr, -giornoSettimanaLunediPrimo(dataStr));
}

export default function Oggi() {
  const oggi = dataRomaDi(new Date().toISOString());

  const [vista, setVista] = useState<Vista>('giorno');
  const [giorno, setGiorno] = useState(oggi);
  const [operatori, setOperatori] = useState<Operatore[]>([]);
  const [filtroOperatore, setFiltroOperatore] = useState<string | null>(null);
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  // I giorni che la vista corrente deve coprire.
  const giorniVisti = useMemo(() => {
    if (vista === 'giorno') return [giorno];
    if (vista === 'settimana') {
      const l = lunediDi(giorno);
      return Array.from({ length: 7 }, (_, i) => aggiungiGiorni(l, i));
    }
    const [anno, mese] = giorno.split('-').map(Number);
    return giorniDelMese(anno, mese);
  }, [vista, giorno]);

  const primoGiorno = giorniVisti[0];
  const ultimoGiorno = giorniVisti[giorniVisti.length - 1];

  useEffect(() => {
    supabase
      .from('operatori')
      .select('id, nome')
      .order('ordine')
      .then(({ data }) => setOperatori(data ?? []));
  }, []);

  useEffect(() => {
    let attivo = true;
    setPrenotazioni(null);
    setErrore(null);

    const { inizio } = confiniGiornoRoma(primoGiorno);
    const { fine } = confiniGiornoRoma(ultimoGiorno);

    let query = supabase
      .from('prenotazioni')
      .select(
        'id, inizio, cliente_nome, cliente_cognome, cliente_telefono, stato, servizi(nome), operatori(nome)',
      )
      .gte('inizio', inizio)
      .lt('inizio', fine)
      .order('inizio');
    if (filtroOperatore) query = query.eq('operatore_id', filtroOperatore);

    query.then(({ data, error }) => {
      if (!attivo) return;
      if (error) {
        setErrore('Non riesco a caricare le prenotazioni. Riprova tra poco.');
        return;
      }
      setPrenotazioni((data ?? []) as unknown as Prenotazione[]);
    });

    return () => {
      attivo = false;
    };
  }, [primoGiorno, ultimoGiorno, filtroOperatore]);

  async function aggiornaStato(id: string, stato: Stato) {
    const { error } = await supabase.from('prenotazioni').update({ stato }).eq('id', id);
    if (error) {
      setErrore('Non sono riuscito a salvare la modifica. Riprova.');
      return;
    }
    setPrenotazioni((righe) => righe?.map((r) => (r.id === id ? { ...r, stato } : r)) ?? null);
  }

  const perGiorno = useMemo(() => {
    const m = new Map<string, Prenotazione[]>();
    prenotazioni?.forEach((p) => {
      const g = dataRomaDi(p.inizio);
      const elenco = m.get(g);
      if (elenco) elenco.push(p);
      else m.set(g, [p]);
    });
    return m;
  }, [prenotazioni]);

  function scorri(avanti: boolean) {
    if (vista === 'mese') {
      const [anno, mese] = giorno.split('-').map(Number);
      const nuovo = new Date(Date.UTC(anno, mese - 1 + (avanti ? 1 : -1), 1));
      setGiorno(nuovo.toISOString().slice(0, 10));
      return;
    }
    const passo = vista === 'giorno' ? 1 : 7;
    setGiorno((g) => aggiungiGiorni(g, avanti ? passo : -passo));
  }

  function apriGiorno(g: string) {
    setGiorno(g);
    setVista('giorno');
  }

  const titolo =
    vista === 'giorno'
      ? formattaGiornoEsteso(giorno)
      : vista === 'settimana'
        ? `${Number(primoGiorno.slice(8))}–${Number(ultimoGiorno.slice(8))} ${formattaMeseAnno(
            Number(ultimoGiorno.slice(0, 4)),
            Number(ultimoGiorno.slice(5, 7)),
          )}`
        : formattaMeseAnno(Number(giorno.slice(0, 4)), Number(giorno.slice(5, 7)));

  const daFare = prenotazioni?.filter((p) => p.stato === 'confermata').length ?? 0;

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-titolo text-2xl font-bold uppercase text-inchiostro">Agenda</h1>
          <p className="text-base text-grigio">
            {prenotazioni ? `${daFare} da fare` : 'Carico…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/aggiungi"
            className="flex min-h-[48px] items-center rounded-lg bg-verde px-4 font-titolo text-base font-bold uppercase text-carta-chiara"
          >
            + Aggiungi
          </Link>
          <Link
            to="/admin/impostazioni"
            className="flex min-h-[48px] items-center rounded-lg border-2 border-bordo px-4 font-titolo text-base font-bold text-grigio"
          >
            Impostazioni
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-lg border-2 border-verde">
        {(['giorno', 'settimana', 'mese'] as Vista[]).map((v, i) => (
          <button
            key={v}
            type="button"
            aria-pressed={vista === v}
            onClick={() => setVista(v)}
            className={`min-h-[52px] font-titolo text-base font-bold uppercase tracking-wide ${
              i > 0 ? 'border-l-2 border-verde' : ''
            } ${vista === v ? 'bg-verde text-carta-chiara' : 'bg-carta-chiara text-verde'}`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Freccia verso="‹" onClick={() => scorri(false)} etichetta="Indietro" />
        <p className="flex-1 text-center font-titolo text-lg font-bold uppercase text-inchiostro">
          {titolo}
        </p>
        <Freccia verso="›" onClick={() => scorri(true)} etichetta="Avanti" />
      </div>
      {giorno !== oggi && (
        <button
          type="button"
          onClick={() => setGiorno(oggi)}
          className="self-center font-titolo text-base font-bold text-marrone underline"
        >
          Torna a oggi
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <Chip attivo={filtroOperatore === null} onClick={() => setFiltroOperatore(null)}>
          Tutti
        </Chip>
        {operatori.map((o) => (
          <Chip
            key={o.id}
            attivo={filtroOperatore === o.id}
            onClick={() => setFiltroOperatore(o.id)}
          >
            {o.nome}
          </Chip>
        ))}
      </div>

      {errore && (
        <p className="rounded-lg border-2 border-allarme bg-allarme-sfondo px-4 py-3 text-lg font-bold text-allarme-testo">
          {errore}
        </p>
      )}
      {!prenotazioni && !errore && <p className="text-lg text-grigio">Carico le prenotazioni…</p>}

      {prenotazioni && vista === 'giorno' && (
        <VistaGiorno righe={perGiorno.get(giorno) ?? []} onAggiorna={aggiornaStato} />
      )}
      {prenotazioni && vista === 'settimana' && (
        <VistaSettimana giorni={giorniVisti} perGiorno={perGiorno} oggi={oggi} onApri={apriGiorno} />
      )}
      {prenotazioni && vista === 'mese' && (
        <VistaMese giorni={giorniVisti} perGiorno={perGiorno} oggi={oggi} onApri={apriGiorno} />
      )}
    </main>
  );
}

// ---------------------------------------------------------------- giorno
function VistaGiorno({
  righe,
  onAggiorna,
}: {
  righe: Prenotazione[];
  onAggiorna: (id: string, stato: Stato) => void;
}) {
  if (righe.length === 0) {
    return (
      <p className="rounded-lg border-2 border-dashed border-bordo px-5 py-12 text-center text-lg text-grigio">
        Nessuna prenotazione per questo giorno.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {righe.map((p) => (
        <Riga key={p.id} p={p} onAggiorna={onAggiorna} />
      ))}
    </div>
  );
}

function Riga({
  p,
  onAggiorna,
}: {
  p: Prenotazione;
  onAggiorna: (id: string, stato: Stato) => void;
}) {
  const nomeCompleto = [p.cliente_nome, p.cliente_cognome].filter(Boolean).join(' ');
  const attiva = p.stato === 'confermata';

  function cancella() {
    if (
      window.confirm(`Cancellare la prenotazione di ${nomeCompleto} delle ${formattaOra(p.inizio)}?`)
    ) {
      onAggiorna(p.id, 'cancellata');
    }
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border-2 border-bordo p-4 sm:flex-row sm:items-center ${
        attiva ? 'bg-carta-chiara' : 'bg-pieno'
      }`}
    >
      <div className="flex items-baseline gap-3 sm:w-36 sm:shrink-0">
        <span
          className={`font-titolo text-2xl font-bold tabular-nums ${
            attiva ? 'text-verde' : 'text-pieno-testo'
          }`}
        >
          {formattaOra(p.inizio)}
        </span>
        {!attiva && (
          <span className="font-titolo text-sm uppercase text-pieno-testo">
            {ETICHETTA_STATO[p.stato]}
          </span>
        )}
      </div>

      <div className="flex-1">
        <p className={`text-lg font-bold ${attiva ? 'text-inchiostro' : 'text-pieno-testo'}`}>
          {nomeCompleto}
        </p>
        <p className="text-base text-grigio">
          {p.servizi?.nome} · {p.operatori?.nome}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`tel:${p.cliente_telefono.replace(/\s/g, '')}`}
          className="flex min-h-[44px] items-center rounded-lg bg-verde px-3 font-titolo text-sm font-bold text-carta-chiara"
        >
          {p.cliente_telefono}
        </a>
        {attiva && (
          <>
            <Azione onClick={() => onAggiorna(p.id, 'completata')}>Fatto</Azione>
            <Azione onClick={() => onAggiorna(p.id, 'non_presentato')}>Non venuto</Azione>
            <Azione onClick={cancella} pericolo>
              Cancella
            </Azione>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- settimana
function VistaSettimana({
  giorni,
  perGiorno,
  oggi,
  onApri,
}: {
  giorni: string[];
  perGiorno: Map<string, Prenotazione[]>;
  oggi: string;
  onApri: (g: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:gap-0 sm:overflow-hidden sm:rounded-lg sm:border-2 sm:border-verde">
      {giorni.map((g, i) => {
        const righe = (perGiorno.get(g) ?? []).filter((p) => p.stato !== 'cancellata');
        const eOggi = g === oggi;
        return (
          <button
            key={g}
            type="button"
            onClick={() => onApri(g)}
            className={`flex min-h-[130px] flex-col items-start gap-1.5 rounded-lg border-2 border-bordo p-2 text-left sm:rounded-none sm:border-0 ${
              i > 0 ? 'sm:border-l sm:border-bordo' : ''
            } ${eOggi ? 'bg-verde-chiaro' : 'bg-carta-chiara'}`}
          >
            <span className="font-titolo text-[0.62rem] uppercase tracking-widest text-grigio">
              {NOMI_GIORNI[i]}
            </span>
            <span
              className={`font-titolo text-xl font-bold tabular-nums ${
                eOggi
                  ? 'flex h-8 w-8 items-center justify-center rounded-full bg-marrone text-carta-chiara'
                  : 'text-inchiostro'
              }`}
            >
              {Number(g.slice(8))}
            </span>
            <div className="flex w-full flex-col gap-1">
              {righe.slice(0, 4).map((p) => (
                <span
                  key={p.id}
                  className="truncate rounded bg-verde px-1.5 py-0.5 font-titolo text-[0.68rem] font-bold text-carta-chiara"
                >
                  {formattaOra(p.inizio)} {p.cliente_nome}
                </span>
              ))}
              {righe.length > 4 && (
                <span className="font-titolo text-[0.68rem] font-bold text-marrone">
                  +{righe.length - 4} altri
                </span>
              )}
              {righe.length === 0 && (
                <span className="font-titolo text-[0.68rem] text-bordo">libero</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ mese
function VistaMese({
  giorni,
  perGiorno,
  oggi,
  onApri,
}: {
  giorni: string[];
  perGiorno: Map<string, Prenotazione[]>;
  oggi: string;
  onApri: (g: string) => void;
}) {
  const celle: (string | null)[] = [
    ...Array(giornoSettimanaLunediPrimo(giorni[0])).fill(null),
    ...giorni,
  ];
  while (celle.length % 7 !== 0) celle.push(null);

  const totale = [...perGiorno.values()].flat().filter((p) => p.stato !== 'cancellata').length;

  return (
    <div className="overflow-hidden rounded-lg border-2 border-verde bg-carta-chiara">
      <div className="grid grid-cols-7 bg-verde">
        {NOMI_GIORNI.map((n) => (
          <div
            key={n}
            className="py-2 text-center font-titolo text-[0.62rem] font-bold tracking-[0.1em] text-carta-chiara"
          >
            {n}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {celle.map((g, i) => {
          const bordi = `${i % 7 !== 6 ? 'border-r' : ''} ${i >= 7 ? 'border-t' : ''} border-bordo`;
          if (!g) return <div key={`vuoto-${i}`} className={`min-h-[92px] ${bordi}`} />;

          const righe = (perGiorno.get(g) ?? []).filter((p) => p.stato !== 'cancellata');
          const eOggi = g === oggi;

          return (
            <button
              key={g}
              type="button"
              onClick={() => onApri(g)}
              className={`flex min-h-[92px] flex-col items-start gap-1 p-1.5 text-left ${bordi} ${
                eOggi ? 'bg-verde-chiaro' : ''
              }`}
            >
              <span
                className={`font-titolo text-sm font-bold tabular-nums ${
                  eOggi
                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-marrone text-carta-chiara'
                    : 'text-inchiostro'
                }`}
              >
                {Number(g.slice(8))}
              </span>
              <div className="flex w-full flex-col gap-0.5">
                {righe.slice(0, 2).map((p) => (
                  <span
                    key={p.id}
                    className="truncate rounded bg-verde px-1 font-titolo text-[0.6rem] font-bold text-carta-chiara"
                  >
                    {formattaOra(p.inizio)} {p.cliente_nome}
                  </span>
                ))}
                {righe.length > 2 && (
                  <span className="font-titolo text-[0.6rem] font-bold text-marrone">
                    +{righe.length - 2}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* La fascia in fondo, come sui calendari da parete. */}
      <div className="border-t-2 border-verde bg-carta px-3 py-2.5">
        <span className="font-titolo text-[0.66rem] uppercase tracking-[0.14em] text-grigio">
          Nel mese: {totale} appuntamenti · tocca un giorno per aprirlo
        </span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- pezzetti
function Freccia({
  verso,
  onClick,
  etichetta,
}: {
  verso: string;
  onClick: () => void;
  etichetta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etichetta}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-bordo font-titolo text-2xl font-bold text-verde"
    >
      {verso}
    </button>
  );
}

function Chip({
  attivo,
  onClick,
  children,
}: {
  attivo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={attivo}
      onClick={onClick}
      className={`min-h-[44px] rounded-lg border-2 px-4 font-titolo text-base font-bold ${
        attivo ? 'border-verde bg-verde text-carta-chiara' : 'border-bordo text-grigio'
      }`}
    >
      {children}
    </button>
  );
}

function Azione({
  onClick,
  children,
  pericolo,
}: {
  onClick: () => void;
  children: ReactNode;
  pericolo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-lg border-2 px-3 font-titolo text-sm font-bold ${
        pericolo ? 'border-allarme text-allarme-testo' : 'border-bordo text-inchiostro'
      }`}
    >
      {children}
    </button>
  );
}
