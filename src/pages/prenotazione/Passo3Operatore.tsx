import { useEffect, useState } from 'react';
import BottoneScelta from '../../components/prenotazione/BottoneScelta';
import Ritratto from '../../components/Ritratto';
import { operatoriPerServizio, type Operatore } from '../../lib/db';
import type { Servizio } from './Passo1Servizio';

// SPECIFICA.md § 5, passo 3: facoltativo, si salta da solo se c'è un solo
// operatore abilitato al servizio scelto.

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
    operatoriPerServizio(servizio.id)
      .then((righe) => {
        if (attivo) setOperatori(righe);
      })
      .catch(() => {
        if (attivo) setErrore('Non riesco a controllare gli operatori. Riprova tra poco.');
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
    return <p className="text-lg font-medium text-allarme-testo">{errore}</p>;
  }

  if (!operatori || operatori.length <= 1) {
    return <p className="text-lg text-grigio">Un attimo…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onIndietro} className="self-start text-lg font-medium text-grigio">
        ‹ Cambia orario
      </button>
      <h1 className="font-titolo text-3xl font-semibold text-inchiostro">Vuoi un barbiere in particolare?</h1>

      <div className="flex flex-col gap-3">
        <BottoneScelta etichetta="Nessuna preferenza" selezionato onClick={() => onScelto(null)} />
        {operatori.map((o) => (
          <BottoneScelta
            key={o.id}
            etichetta={o.nome}
            davanti={<Ritratto nome={o.nome} foto={o.foto} colore={o.colore} misura={52} />}
            onClick={() => onScelto(o.id)}
          />
        ))}
      </div>
    </div>
  );
}
