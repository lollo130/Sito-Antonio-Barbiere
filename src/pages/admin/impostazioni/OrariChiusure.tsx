import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EditorOrariSettimanali, { type Fascia } from '../../../components/admin/EditorOrariSettimanali';
import { classeCampo, classeEtichetta } from '../../../components/admin/campi';
import { formattaGiornoEsteso, dataRomaDi } from '../../../lib/data';
import { supabase } from '../../../lib/supabase';

// SPECIFICA.md § 7.3 — Orari salone e chiusure.
// Nota: orari_salone è informativo, non tocca la disponibilità delle
// prenotazioni (dipende solo da orari_operatore). Vedi migration
// 20260825140622_orari_salone.sql.

type Chiusura = { id: string; inizio: string; fine: string; motivo: string | null };

export default function OrariChiusure() {
  const [fasce, setFasce] = useState<Fascia[]>([]);
  const [chiusure, setChiusure] = useState<Chiusura[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [motivo, setMotivo] = useState('');

  function caricaOrari() {
    supabase
      .from('orari_salone')
      .select('id, giorno, ora_inizio, ora_fine')
      .then(({ data }) => setFasce(data ?? []));
  }

  function caricaChiusure() {
    supabase
      .from('chiusure_salone')
      .select('id, inizio, fine, motivo')
      .order('inizio')
      .then(({ data, error }) => {
        if (error) setErrore('Non riesco a caricare le chiusure.');
        else setChiusure(data ?? []);
      });
  }

  useEffect(() => {
    caricaOrari();
    caricaChiusure();
  }, []);

  async function aggiungiFascia(giorno: number, oraInizio: string, oraFine: string) {
    const { data, error } = await supabase
      .from('orari_salone')
      .insert({ giorno, ora_inizio: oraInizio, ora_fine: oraFine })
      .select('id, giorno, ora_inizio, ora_fine')
      .single();
    if (!error && data) setFasce((f) => [...f, data]);
  }

  async function rimuoviFascia(id: string) {
    const { error } = await supabase.from('orari_salone').delete().eq('id', id);
    if (!error) setFasce((f) => f.filter((x) => x.id !== id));
  }

  async function aggiungiChiusura() {
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
      .from('chiusure_salone')
      .insert({ inizio, fine, motivo: motivo.trim() || null });
    if (error) {
      setErrore('Non sono riuscito a salvare la chiusura.');
      return;
    }
    setDataInizio('');
    setDataFine('');
    setMotivo('');
    caricaChiusure();
  }

  async function rimuoviChiusura(c: Chiusura) {
    const etichetta = c.motivo || `dal ${formattaGiornoEsteso(dataRomaDi(c.inizio))}`;
    if (!window.confirm(`Rimuovere la chiusura "${etichetta}"?`)) return;
    const { error } = await supabase.from('chiusure_salone').delete().eq('id', c.id);
    if (error) {
      setErrore('Non sono riuscito a rimuovere la chiusura.');
      return;
    }
    caricaChiusure();
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-8">
      <Link to="/admin/impostazioni" className="self-start text-lg font-medium text-stone-600">
        ‹ Impostazioni
      </Link>
      <h1 className="font-titolo text-3xl font-semibold text-stone-900">Orari del salone e chiusure</h1>

      {errore && <p className="text-lg font-medium text-red-700">{errore}</p>}

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-stone-900">Orari settimanali</h2>
        <p className="text-base text-stone-600">
          Informativi (per il sito pubblico): la disponibilità delle prenotazioni dipende sempre dagli orari di ogni
          singolo operatore, in "Impostazioni → Operatori".
        </p>
        <EditorOrariSettimanali fasce={fasce} onAggiungi={aggiungiFascia} onRimuovi={rimuoviFascia} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-stone-900">Chiusure</h2>
        <p className="text-base text-stone-600">Festivi, ferie collettive: valgono per tutti gli operatori.</p>

        {!chiusure && <p className="text-lg text-stone-700">Carico…</p>}
        {chiusure && chiusure.length === 0 && <p className="text-base text-stone-600">Nessuna chiusura in programma.</p>}

        <div className="flex flex-col gap-3">
          {chiusure?.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-stone-300 p-4">
              <div>
                <p className="text-lg font-semibold text-stone-900">
                  {formattaGiornoEsteso(dataRomaDi(c.inizio))}
                  {dataRomaDi(c.inizio) !== dataRomaDi(c.fine) && ` – ${formattaGiornoEsteso(dataRomaDi(c.fine))}`}
                </p>
                {c.motivo && <p className="text-base text-stone-700">{c.motivo}</p>}
              </div>
              <button
                type="button"
                onClick={() => rimuoviChiusura(c)}
                className="shrink-0 text-base font-semibold text-red-700"
              >
                Rimuovi
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border-2 border-stone-300 p-4">
          <label className={classeEtichetta} htmlFor="chiusura-inizio">
            Dal
          </label>
          <input
            id="chiusura-inizio"
            type="date"
            className={classeCampo}
            value={dataInizio}
            onChange={(e) => setDataInizio(e.target.value)}
          />
          <label className={classeEtichetta} htmlFor="chiusura-fine">
            Al
          </label>
          <input
            id="chiusura-fine"
            type="date"
            className={classeCampo}
            value={dataFine}
            onChange={(e) => setDataFine(e.target.value)}
          />
          <label className={classeEtichetta} htmlFor="chiusura-motivo">
            Motivo <span className="font-normal text-stone-600">(facoltativo)</span>
          </label>
          <input
            id="chiusura-motivo"
            type="text"
            className={classeCampo}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <button
            type="button"
            onClick={aggiungiChiusura}
            className="flex min-h-[56px] w-full items-center justify-center rounded-xl border-2 border-stone-900 px-6 text-lg font-semibold text-stone-900"
          >
            + Aggiungi chiusura
          </button>
        </div>
      </div>
    </main>
  );
}
