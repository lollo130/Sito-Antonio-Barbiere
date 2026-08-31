import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BottoneToggle from '../../../components/admin/BottoneToggle';
import { classeCampo, classeEtichetta } from '../../../components/admin/campi';
import { supabase } from '../../../lib/supabase';

// SPECIFICA.md § 7.3 — Servizi: nome, durata, prezzo, categoria, attivo.
// Niente cancellazione: solo attivo/disattivo (uno storico di prenotazioni
// può sempre fare riferimento a un servizio — vietato dal FK in schema.sql).

type Categoria = 'uomo' | 'donna' | 'entrambi';
type Servizio = {
  id: string;
  nome: string;
  durata_minuti: number;
  prezzo_cent: number;
  categoria: Categoria;
  attivo: boolean;
  ordine: number;
};

const formattatorePrezzo = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

function euroInCentesimi(testo: string): number | null {
  const numero = Number(testo.replace(',', '.'));
  if (Number.isNaN(numero) || numero < 0) return null;
  return Math.round(numero * 100);
}

type FormServizio = {
  nome: string;
  durata_minuti: string;
  prezzo: string;
  categoria: Categoria;
};

const FORM_VUOTO: FormServizio = { nome: '', durata_minuti: '30', prezzo: '', categoria: 'uomo' };

export default function Servizi() {
  const [servizi, setServizi] = useState<Servizio[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [editando, setEditando] = useState<Servizio | 'nuovo' | null>(null);
  const [form, setForm] = useState<FormServizio>(FORM_VUOTO);
  const [salvando, setSalvando] = useState(false);

  function carica() {
    supabase
      .from('servizi')
      .select('id, nome, durata_minuti, prezzo_cent, categoria, attivo, ordine')
      .order('ordine')
      .then(({ data, error }) => {
        if (error) setErrore('Non riesco a caricare i servizi.');
        else setServizi(data ?? []);
      });
  }

  useEffect(carica, []);

  function apriModifica(s: Servizio) {
    setEditando(s);
    setForm({
      nome: s.nome,
      durata_minuti: String(s.durata_minuti),
      prezzo: (s.prezzo_cent / 100).toFixed(2),
      categoria: s.categoria,
    });
  }

  function apriNuovo() {
    setEditando('nuovo');
    setForm(FORM_VUOTO);
  }

  async function salva() {
    const durata = Number(form.durata_minuti);
    const prezzoCent = euroInCentesimi(form.prezzo);

    if (form.nome.trim().length < 2) return setErrore('Manca il nome del servizio.');
    if (!Number.isInteger(durata) || durata <= 0 || durata % 5 !== 0) {
      return setErrore('La durata deve essere un numero di minuti multiplo di 5.');
    }
    if (prezzoCent === null) return setErrore('Il prezzo non è valido.');

    setErrore(null);
    setSalvando(true);

    if (editando === 'nuovo') {
      const prossimoOrdine = Math.max(0, ...(servizi ?? []).map((s) => s.ordine)) + 1;
      const { error } = await supabase.from('servizi').insert({
        nome: form.nome.trim(),
        durata_minuti: durata,
        prezzo_cent: prezzoCent,
        categoria: form.categoria,
        ordine: prossimoOrdine,
      });
      setSalvando(false);
      if (error) return setErrore('Non sono riuscito a salvare il servizio.');
    } else if (editando) {
      const { error } = await supabase
        .from('servizi')
        .update({
          nome: form.nome.trim(),
          durata_minuti: durata,
          prezzo_cent: prezzoCent,
          categoria: form.categoria,
        })
        .eq('id', editando.id);
      setSalvando(false);
      if (error) return setErrore('Non sono riuscito a salvare il servizio.');
    }

    setEditando(null);
    carica();
  }

  async function cambiaAttivo(s: Servizio) {
    const messaggio = s.attivo
      ? `Disattivare "${s.nome}"? Non sarà più prenotabile dal sito.`
      : `Riattivare "${s.nome}"?`;
    if (!window.confirm(messaggio)) return;
    const { error } = await supabase.from('servizi').update({ attivo: !s.attivo }).eq('id', s.id);
    if (error) {
      setErrore('Non sono riuscito a salvare la modifica.');
      return;
    }
    carica();
  }

  if (editando) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-8">
        <button
          type="button"
          onClick={() => setEditando(null)}
          className="self-start text-lg font-medium text-grigio"
        >
          ‹ Indietro
        </button>
        <h1 className="font-titolo text-3xl font-semibold text-inchiostro">
          {editando === 'nuovo' ? 'Nuovo servizio' : 'Modifica servizio'}
        </h1>

        <div className="flex flex-col gap-2">
          <label className={classeEtichetta} htmlFor="nome">
            Nome
          </label>
          <input
            id="nome"
            type="text"
            className={classeCampo}
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={classeEtichetta} htmlFor="durata">
            Durata (minuti)
          </label>
          <input
            id="durata"
            type="number"
            step={5}
            min={5}
            className={classeCampo}
            value={form.durata_minuti}
            onChange={(e) => setForm((f) => ({ ...f, durata_minuti: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={classeEtichetta} htmlFor="prezzo">
            Prezzo (euro)
          </label>
          <input
            id="prezzo"
            type="text"
            inputMode="decimal"
            placeholder="15,00"
            className={classeCampo}
            value={form.prezzo}
            onChange={(e) => setForm((f) => ({ ...f, prezzo: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className={classeEtichetta}>Categoria</p>
          <div className="flex gap-2">
            <BottoneToggle
              etichetta="Uomo"
              selezionato={form.categoria === 'uomo'}
              onClick={() => setForm((f) => ({ ...f, categoria: 'uomo' }))}
            />
            <BottoneToggle
              etichetta="Donna"
              selezionato={form.categoria === 'donna'}
              onClick={() => setForm((f) => ({ ...f, categoria: 'donna' }))}
            />
            <BottoneToggle
              etichetta="Entrambi"
              selezionato={form.categoria === 'entrambi'}
              onClick={() => setForm((f) => ({ ...f, categoria: 'entrambi' }))}
            />
          </div>
        </div>

        {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}

        <button
          type="button"
          disabled={salvando}
          onClick={salva}
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-inchiostro px-6 text-lg font-semibold text-white disabled:opacity-60"
        >
          {salvando ? 'Salvo…' : 'Salva'}
        </button>

        {editando !== 'nuovo' && (
          <button
            type="button"
            onClick={() => cambiaAttivo(editando)}
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-bordo px-6 text-lg font-semibold text-inchiostro"
          >
            {editando.attivo ? 'Disattiva servizio' : 'Riattiva servizio'}
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-8">
      <Link to="/admin/impostazioni" className="self-start text-lg font-medium text-grigio">
        ‹ Impostazioni
      </Link>
      <h1 className="font-titolo text-3xl font-semibold text-inchiostro">Servizi</h1>

      {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}
      {!servizi && !errore && <p className="text-lg text-grigio">Carico…</p>}

      <div className="flex flex-col gap-3">
        {servizi?.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => apriModifica(s)}
            className={`flex flex-col gap-1 rounded-2xl border-2 p-4 text-left ${
              s.attivo ? 'border-bordo' : 'border-bordo bg-carta'
            }`}
          >
            <span className={`text-lg font-semibold ${s.attivo ? 'text-inchiostro' : 'text-grigio'}`}>
              {s.nome} {!s.attivo && '(disattivo)'}
            </span>
            <span className="text-base text-grigio">
              {s.durata_minuti} min · {formattatorePrezzo.format(s.prezzo_cent / 100)} · {s.categoria}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={apriNuovo}
        className="flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-inchiostro px-6 text-lg font-semibold text-inchiostro"
      >
        + Nuovo servizio
      </button>
    </main>
  );
}
