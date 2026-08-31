import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiungiGiorni, confiniGiornoRoma, dataRomaDi, formattaGiornoEsteso, formattaOra } from '../../lib/data';
import { supabase } from '../../lib/supabase';

// SPECIFICA.md § 7.1 — "Oggi": lista verticale, non colonne affiancate.

type Stato = 'confermata' | 'completata' | 'non_presentato' | 'cancellata';

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
  non_presentato: 'Non presentato',
  cancellata: 'Cancellata',
};

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
    if (window.confirm(`Cancellare la prenotazione di ${nomeCompleto} delle ${formattaOra(p.inizio)}?`)) {
      onAggiorna(p.id, 'cancellata');
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-stone-300 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xl font-bold text-stone-900">{formattaOra(p.inizio)}</span>
        {!attiva && <span className="text-base font-semibold text-stone-600">{ETICHETTA_STATO[p.stato]}</span>}
      </div>
      <p className="text-lg font-semibold text-stone-900">{nomeCompleto}</p>
      <p className="text-base text-stone-700">
        {p.servizi?.nome} · {p.operatori?.nome}
      </p>
      <a href={`tel:${p.cliente_telefono.replace(/\s/g, '')}`} className="text-base font-semibold text-stone-900 underline">
        {p.cliente_telefono}
      </a>

      {attiva && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onAggiorna(p.id, 'completata')}
            className="flex-1 rounded-lg border-2 border-stone-300 py-2 text-base font-semibold text-stone-900"
          >
            Fatto
          </button>
          <button
            type="button"
            onClick={() => onAggiorna(p.id, 'non_presentato')}
            className="flex-1 rounded-lg border-2 border-stone-300 py-2 text-base font-semibold text-stone-900"
          >
            Non presentato
          </button>
          <button
            type="button"
            onClick={cancella}
            className="flex-1 rounded-lg border-2 border-red-300 py-2 text-base font-semibold text-red-700"
          >
            Cancella
          </button>
        </div>
      )}
    </div>
  );
}

export default function Oggi() {
  const oggi = dataRomaDi(new Date().toISOString());
  const [giorno, setGiorno] = useState(oggi);
  const [operatori, setOperatori] = useState<Operatore[]>([]);
  const [filtroOperatore, setFiltroOperatore] = useState<string | null>(null);
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

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

    const { inizio, fine } = confiniGiornoRoma(giorno);
    let query = supabase
      .from('prenotazioni')
      .select('id, inizio, cliente_nome, cliente_cognome, cliente_telefono, stato, servizi(nome), operatori(nome)')
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
  }, [giorno, filtroOperatore]);

  async function aggiornaStato(id: string, stato: Stato) {
    const { error } = await supabase.from('prenotazioni').update({ stato }).eq('id', id);
    if (error) {
      setErrore('Non sono riuscito a salvare la modifica. Riprova.');
      return;
    }
    setPrenotazioni((righe) => righe?.map((r) => (r.id === id ? { ...r, stato } : r)) ?? null);
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-titolo text-3xl font-semibold text-stone-900">Oggi</h1>
        <Link to="/admin/impostazioni" className="text-lg font-medium text-stone-600 underline">
          Impostazioni
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setGiorno((g) => aggiungiGiorni(g, -1))}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 text-2xl font-bold text-stone-900"
          aria-label="Giorno precedente"
        >
          ‹
        </button>
        <p className="flex-1 text-center text-lg font-bold text-stone-900">{formattaGiornoEsteso(giorno)}</p>
        <button
          type="button"
          onClick={() => setGiorno((g) => aggiungiGiorni(g, 1))}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-300 text-2xl font-bold text-stone-900"
          aria-label="Giorno successivo"
        >
          ›
        </button>
      </div>
      {giorno !== oggi && (
        <button
          type="button"
          onClick={() => setGiorno(oggi)}
          className="self-center text-base font-semibold text-stone-600 underline"
        >
          Torna a oggi
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFiltroOperatore(null)}
          className={`rounded-lg border-2 px-4 py-2 text-base font-semibold ${
            filtroOperatore === null ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-900'
          }`}
        >
          Tutti
        </button>
        {operatori.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setFiltroOperatore(o.id)}
            className={`rounded-lg border-2 px-4 py-2 text-base font-semibold ${
              filtroOperatore === o.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-900'
            }`}
          >
            {o.nome}
          </button>
        ))}
      </div>

      {errore && <p className="text-lg font-medium text-red-700">{errore}</p>}
      {!prenotazioni && !errore && <p className="text-lg text-stone-700">Carico le prenotazioni…</p>}
      {prenotazioni && prenotazioni.length === 0 && !errore && (
        <p className="text-lg text-stone-700">Nessuna prenotazione per questo giorno.</p>
      )}

      <div className="flex flex-col gap-3">
        {prenotazioni?.map((p) => (
          <Riga key={p.id} p={p} onAggiorna={aggiornaStato} />
        ))}
      </div>
    </main>
  );
}
