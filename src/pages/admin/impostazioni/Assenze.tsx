import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottoneToggle from '../../../components/admin/BottoneToggle';
import { classeCampo, classeEtichetta } from '../../../components/admin/campi';
import { formattaGiornoEsteso, dataRomaDi } from '../../../lib/data';
import { supabase } from '../../../lib/supabase';

// SPECIFICA.md § 7.3 — Assenze per operatore (ferie, permessi, malattia).

type Operatore = { id: string; nome: string };
type Assenza = { id: string; inizio: string; fine: string; motivo: string | null };

export default function Assenze() {
  const [operatori, setOperatori] = useState<Operatore[]>([]);
  const [operatoreId, setOperatoreId] = useState<string | null>(null);
  const [assenze, setAssenze] = useState<Assenza[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    supabase
      .from('operatori')
      .select('id, nome')
      .order('ordine')
      .then(({ data }) => {
        setOperatori(data ?? []);
        if (data && data.length > 0) setOperatoreId(data[0].id);
      });
  }, []);

  function caricaAssenze(id: string) {
    supabase
      .from('assenze')
      .select('id, inizio, fine, motivo')
      .eq('operatore_id', id)
      .order('inizio')
      .then(({ data, error }) => {
        if (error) setErrore('Non riesco a caricare le assenze.');
        else setAssenze(data ?? []);
      });
  }

  useEffect(() => {
    if (operatoreId) caricaAssenze(operatoreId);
  }, [operatoreId]);

  async function aggiungiAssenza() {
    if (!operatoreId) return;
    if (!dataInizio || !dataFine) {
      setErrore('Manca la data di inizio o di fine.');
      return;
    }
    if (dataFine < dataInizio) {
      setErrore('La data di fine non può essere prima di quella di inizio.');
      return;
    }
    setErrore(null);
    const inizio = new Date(`${dataInizio}T00:00:00`).toISOString();
    const fine = new Date(`${dataFine}T23:59:59`).toISOString();
    const { error } = await supabase
      .from('assenze')
      .insert({ operatore_id: operatoreId, inizio, fine, motivo: motivo.trim() || null });
    if (error) {
      setErrore('Non sono riuscito a salvare l\'assenza.');
      return;
    }
    setDataInizio('');
    setDataFine('');
    setMotivo('');
    caricaAssenze(operatoreId);
  }

  async function rimuoviAssenza(a: Assenza) {
    const etichetta = a.motivo || `dal ${formattaGiornoEsteso(dataRomaDi(a.inizio))}`;
    if (!window.confirm(`Rimuovere l'assenza "${etichetta}"?`)) return;
    const { error } = await supabase.from('assenze').delete().eq('id', a.id);
    if (error) {
      setErrore('Non sono riuscito a rimuovere l\'assenza.');
      return;
    }
    if (operatoreId) caricaAssenze(operatoreId);
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-8">
      <Link to="/admin/impostazioni" className="self-start text-lg font-medium text-stone-600">
        ‹ Impostazioni
      </Link>
      <h1 className="font-titolo text-3xl font-semibold text-stone-900">Assenze</h1>

      <div className="flex flex-wrap gap-2">
        {operatori.map((o) => (
          <BottoneToggle
            key={o.id}
            etichetta={o.nome}
            selezionato={operatoreId === o.id}
            onClick={() => setOperatoreId(o.id)}
          />
        ))}
      </div>

      {errore && <p className="text-lg font-medium text-red-700">{errore}</p>}
      {!assenze && !errore && <p className="text-lg text-stone-700">Carico…</p>}
      {assenze && assenze.length === 0 && <p className="text-base text-stone-600">Nessuna assenza in programma.</p>}

      <div className="flex flex-col gap-3">
        {assenze?.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-stone-300 p-4">
            <div>
              <p className="text-lg font-semibold text-stone-900">
                {formattaGiornoEsteso(dataRomaDi(a.inizio))}
                {dataRomaDi(a.inizio) !== dataRomaDi(a.fine) && ` – ${formattaGiornoEsteso(dataRomaDi(a.fine))}`}
              </p>
              {a.motivo && <p className="text-base text-stone-700">{a.motivo}</p>}
            </div>
            <button type="button" onClick={() => rimuoviAssenza(a)} className="shrink-0 text-base font-semibold text-red-700">
              Rimuovi
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-stone-300 p-4">
        <label className={classeEtichetta} htmlFor="assenza-inizio">
          Dal
        </label>
        <input
          id="assenza-inizio"
          type="date"
          className={classeCampo}
          value={dataInizio}
          onChange={(e) => setDataInizio(e.target.value)}
        />
        <label className={classeEtichetta} htmlFor="assenza-fine">
          Al
        </label>
        <input
          id="assenza-fine"
          type="date"
          className={classeCampo}
          value={dataFine}
          onChange={(e) => setDataFine(e.target.value)}
        />
        <label className={classeEtichetta} htmlFor="assenza-motivo">
          Motivo <span className="font-normal text-stone-600">(facoltativo)</span>
        </label>
        <input
          id="assenza-motivo"
          type="text"
          className={classeCampo}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <button
          type="button"
          onClick={aggiungiAssenza}
          className="flex min-h-[56px] w-full items-center justify-center rounded-xl border-2 border-stone-900 px-6 text-lg font-semibold text-stone-900"
        >
          + Aggiungi assenza
        </button>
      </div>
    </main>
  );
}
