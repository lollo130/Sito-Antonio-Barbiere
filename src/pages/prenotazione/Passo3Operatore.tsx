import { useEffect, useState } from 'react';
import BottoneScelta from '../../components/prenotazione/BottoneScelta';
import { supabase } from '../../lib/supabase';
import type { Servizio } from './Passo1Servizio';

// SPECIFICA.md § 5, passo 3: facoltativo, si salta da solo se c'è un solo
// operatore abilitato al servizio scelto.

type Operatore = { id: string; nome: string; ordine: number };

type Props = {
  servizio: Servizio;
  onScelto: (operatoreId: string | null) => void;
  onIndietro: () => void;
};

export default function Passo3Operatore({ servizio, onScelto, onIndietro }: Props) {
  const [operatori, setOperatori] = useState<Operatore[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    supabase
      .from('operatori')
      .select('id, nome, ordine, operatori_servizi!inner(servizio_id)')
      .eq('attivo', true)
      .eq('operatori_servizi.servizio_id', servizio.id)
      .order('ordine')
      .then(({ data, error }) => {
        if (!attivo) return;
        if (error) {
          setErrore('Non riesco a controllare gli operatori. Riprova tra poco.');
          return;
        }
        setOperatori((data ?? []) as Operatore[]);
      });
    return () => {
      attivo = false;
    };
  }, [servizio.id]);

  useEffect(() => {
    if (operatori && operatori.length <= 1) {
      onScelto(operatori[0]?.id ?? null);
    }
  }, [operatori, onScelto]);

  if (errore) {
    return <p className="text-lg font-medium text-red-700">{errore}</p>;
  }

  if (!operatori || operatori.length <= 1) {
    return <p className="text-lg text-stone-700">Un attimo…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onIndietro} className="self-start text-lg font-medium text-stone-600">
        ‹ Cambia orario
      </button>
      <h1 className="font-titolo text-3xl font-semibold text-stone-900">Vuoi un barbiere in particolare?</h1>

      <div className="flex flex-col gap-3">
        <BottoneScelta etichetta="Nessuna preferenza" selezionato onClick={() => onScelto(null)} />
        {operatori.map((o) => (
          <BottoneScelta key={o.id} etichetta={o.nome} onClick={() => onScelto(o.id)} />
        ))}
      </div>
    </div>
  );
}
