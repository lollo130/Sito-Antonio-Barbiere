import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EditorOrariSettimanali, { type Fascia } from '../../../components/admin/EditorOrariSettimanali';
import { classeCampo, classeEtichetta } from '../../../components/admin/campi';
import { formattaGiornoEsteso, formattaOra, dataRomaDi } from '../../../lib/data';
import { supabase } from '../../../lib/supabase';

// SPECIFICA.md § 7.3 — Operatori: aggiungi, disattiva (mai cancella),
// servizi che sa fare, orari settimanali. Se disattivo un operatore con
// prenotazioni future, avviso e mostro quali sono prima di procedere.

type Operatore = { id: string; nome: string; attivo: boolean; ordine: number };
type Servizio = { id: string; nome: string };
type PrenotazioneFutura = { id: string; inizio: string; cliente_nome: string; cliente_cognome: string | null };

export default function Operatori() {
  const [operatori, setOperatori] = useState<Operatore[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [selezionato, setSelezionato] = useState<Operatore | null>(null);
  const [nomeNuovo, setNomeNuovo] = useState('');

  function caricaOperatori() {
    supabase
      .from('operatori')
      .select('id, nome, attivo, ordine')
      .order('ordine')
      .then(({ data, error }) => {
        if (error) setErrore('Non riesco a caricare gli operatori.');
        else setOperatori(data ?? []);
      });
  }

  useEffect(caricaOperatori, []);

  async function aggiungiOperatore() {
    if (nomeNuovo.trim().length < 2) {
      setErrore('Manca il nome.');
      return;
    }
    const prossimoOrdine = Math.max(0, ...(operatori ?? []).map((o) => o.ordine)) + 1;
    const { error } = await supabase.from('operatori').insert({ nome: nomeNuovo.trim(), ordine: prossimoOrdine });
    if (error) {
      setErrore('Non sono riuscito ad aggiungere l\'operatore.');
      return;
    }
    setErrore(null);
    setNomeNuovo('');
    caricaOperatori();
  }

  if (selezionato) {
    return (
      <DettaglioOperatore
        operatore={selezionato}
        onIndietro={() => {
          setSelezionato(null);
          caricaOperatori();
        }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-8">
      <Link to="/admin/impostazioni" className="self-start text-lg font-medium text-grigio">
        ‹ Impostazioni
      </Link>
      <h1 className="font-titolo text-3xl font-semibold text-inchiostro">Operatori</h1>

      {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}
      {!operatori && !errore && <p className="text-lg text-grigio">Carico…</p>}

      <div className="flex flex-col gap-3">
        {operatori?.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelezionato(o)}
            className={`flex min-h-[56px] items-center rounded-2xl border-2 px-5 text-left text-lg font-semibold ${
              o.attivo ? 'border-bordo text-inchiostro' : 'border-bordo bg-carta-chiara text-grigio'
            }`}
          >
            {o.nome} {!o.attivo && '(disattivo)'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border-2 border-bordo p-4">
        <label className={classeEtichetta} htmlFor="nome-nuovo">
          Nuovo operatore
        </label>
        <input
          id="nome-nuovo"
          type="text"
          className={classeCampo}
          value={nomeNuovo}
          onChange={(e) => setNomeNuovo(e.target.value)}
        />
        <button
          type="button"
          onClick={aggiungiOperatore}
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-inchiostro px-6 text-lg font-semibold text-inchiostro"
        >
          + Aggiungi operatore
        </button>
      </div>
    </main>
  );
}

function DettaglioOperatore({ operatore, onIndietro }: { operatore: Operatore; onIndietro: () => void }) {
  const [attivo, setAttivo] = useState(operatore.attivo);
  const [errore, setErrore] = useState<string | null>(null);
  const [prenotazioniFuture, setPrenotazioniFuture] = useState<PrenotazioneFutura[] | null>(null);

  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [serviziAssegnati, setServiziAssegnati] = useState<Set<string>>(new Set());
  const [fasce, setFasce] = useState<Fascia[]>([]);

  useEffect(() => {
    supabase
      .from('servizi')
      .select('id, nome')
      .order('ordine')
      .then(({ data }) => setServizi(data ?? []));

    supabase
      .from('operatori_servizi')
      .select('servizio_id')
      .eq('operatore_id', operatore.id)
      .then(({ data }) => setServiziAssegnati(new Set((data ?? []).map((r) => r.servizio_id))));

    supabase
      .from('orari_operatore')
      .select('id, giorno, ora_inizio, ora_fine')
      .eq('operatore_id', operatore.id)
      .then(({ data }) => setFasce(data ?? []));
  }, [operatore.id]);

  async function toggleServizio(servizioId: string) {
    const assegnato = serviziAssegnati.has(servizioId);
    if (assegnato) {
      await supabase.from('operatori_servizi').delete().match({ operatore_id: operatore.id, servizio_id: servizioId });
    } else {
      await supabase.from('operatori_servizi').insert({ operatore_id: operatore.id, servizio_id: servizioId });
    }
    setServiziAssegnati((s) => {
      const nuovo = new Set(s);
      if (assegnato) nuovo.delete(servizioId);
      else nuovo.add(servizioId);
      return nuovo;
    });
  }

  async function aggiungiFascia(giorno: number, oraInizio: string, oraFine: string) {
    const { data, error } = await supabase
      .from('orari_operatore')
      .insert({ operatore_id: operatore.id, giorno, ora_inizio: oraInizio, ora_fine: oraFine })
      .select('id, giorno, ora_inizio, ora_fine')
      .single();
    if (!error && data) setFasce((f) => [...f, data]);
  }

  async function rimuoviFascia(id: string) {
    const { error } = await supabase.from('orari_operatore').delete().eq('id', id);
    if (!error) setFasce((f) => f.filter((x) => x.id !== id));
  }

  async function salvaAttivo(nuovoAttivo: boolean) {
    const { error } = await supabase.from('operatori').update({ attivo: nuovoAttivo }).eq('id', operatore.id);
    if (error) {
      setErrore('Non sono riuscito a salvare la modifica.');
      return;
    }
    setAttivo(nuovoAttivo);
    setPrenotazioniFuture(null);
  }

  async function disattiva() {
    setErrore(null);
    const { data, error } = await supabase
      .from('prenotazioni')
      .select('id, inizio, cliente_nome, cliente_cognome')
      .eq('operatore_id', operatore.id)
      .eq('stato', 'confermata')
      .gt('inizio', new Date().toISOString())
      .order('inizio');

    if (error) {
      setErrore('Non riesco a controllare le prenotazioni future.');
      return;
    }

    if (data && data.length > 0) {
      setPrenotazioniFuture(data);
      return;
    }

    if (window.confirm(`Disattivare ${operatore.nome}? Non sarà più prenotabile dal sito.`)) {
      salvaAttivo(false);
    }
  }

  function riattiva() {
    if (window.confirm(`Riattivare ${operatore.nome}?`)) {
      salvaAttivo(true);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-8">
      <button type="button" onClick={onIndietro} className="self-start text-lg font-medium text-grigio">
        ‹ Operatori
      </button>
      <h1 className="font-titolo text-3xl font-semibold text-inchiostro">{operatore.nome}</h1>

      {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}

      {prenotazioniFuture && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-red-300 bg-allarme-sfondo p-4">
          <p className="text-lg font-semibold text-red-900">
            {operatore.nome} ha {prenotazioniFuture.length} prenotazion{prenotazioniFuture.length === 1 ? 'e' : 'i'} futur
            {prenotazioniFuture.length === 1 ? 'a' : 'e'}:
          </p>
          <ul className="flex flex-col gap-1">
            {prenotazioniFuture.map((p) => (
              <li key={p.id} className="text-base text-red-900">
                {formattaGiornoEsteso(dataRomaDi(p.inizio))}, alle {formattaOra(p.inizio)} —{' '}
                {[p.cliente_nome, p.cliente_cognome].filter(Boolean).join(' ')}
              </li>
            ))}
          </ul>
          <p className="text-base text-red-900">
            Restano nel calendario, ma il cliente andrà avvisato separatamente: disattivare l'operatore non cancella le
            prenotazioni.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPrenotazioniFuture(null)}
              className="flex-1 rounded-lg border-2 border-bordo py-2 text-base font-semibold text-inchiostro"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => salvaAttivo(false)}
              className="flex-1 rounded-lg border-2 border-allarme py-2 text-base font-semibold text-allarme-testo"
            >
              Disattiva comunque
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={attivo ? disattiva : riattiva}
        className="flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-bordo px-6 text-lg font-semibold text-inchiostro"
      >
        {attivo ? 'Disattiva operatore' : 'Riattiva operatore'}
      </button>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-inchiostro">Servizi che sa fare</h2>
        <div className="flex flex-col gap-2">
          {servizi.map((s) => {
            const assegnato = serviziAssegnati.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleServizio(s.id)}
                className={`flex min-h-[56px] items-center justify-between rounded-2xl border-2 px-5 text-left text-lg font-semibold ${
                  assegnato ? 'border-inchiostro bg-inchiostro text-white' : 'border-bordo text-inchiostro'
                }`}
              >
                {s.nome}
                <span>{assegnato ? '✓' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-inchiostro">Orari settimanali</h2>
        <EditorOrariSettimanali fasce={fasce} onAggiungi={aggiungiFascia} onRimuovi={rimuoviFascia} />
      </div>
    </main>
  );
}
