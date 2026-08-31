import { useEffect, useMemo, useState } from 'react';
import BottoneScelta from '../../components/prenotazione/BottoneScelta';
import { supabase } from '../../lib/supabase';

export type Servizio = {
  id: string;
  nome: string;
  durata_minuti: number;
  prezzo_cent: number;
  categoria: 'uomo' | 'donna' | 'entrambi';
};

const formattatorePrezzo = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

type Props = {
  onScelto: (servizio: Servizio) => void;
};

export default function Passo1Servizio({ onScelto }: Props) {
  const [servizi, setServizi] = useState<Servizio[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'uomo' | 'donna' | null>(null);

  useEffect(() => {
    let attivo = true;
    supabase
      .from('servizi')
      .select('id, nome, durata_minuti, prezzo_cent, categoria')
      .order('ordine')
      .then(({ data, error }) => {
        if (!attivo) return;
        if (error) {
          setErrore('Non riesco a caricare i servizi. Riprova tra poco.');
          return;
        }
        setServizi(data ?? []);
      });
    return () => {
      attivo = false;
    };
  }, []);

  const serviziVisibili = useMemo(() => {
    if (!servizi) return [];
    if (!filtro) return servizi;
    return servizi.filter((s) => s.categoria === filtro || s.categoria === 'entrambi');
  }, [servizi, filtro]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titolo text-3xl font-semibold text-inchiostro">Cosa ti serve?</h1>

      <div className="flex gap-3">
        <BottoneScelta
          etichetta="Uomo"
          selezionato={filtro === 'uomo'}
          onClick={() => setFiltro((f) => (f === 'uomo' ? null : 'uomo'))}
          className="flex-1 justify-center"
        />
        <BottoneScelta
          etichetta="Donna"
          selezionato={filtro === 'donna'}
          onClick={() => setFiltro((f) => (f === 'donna' ? null : 'donna'))}
          className="flex-1 justify-center"
        />
      </div>

      {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}
      {!servizi && !errore && <p className="text-lg text-grigio">Carico i servizi…</p>}

      <div className="flex flex-col gap-3">
        {serviziVisibili.map((s) => (
          <BottoneScelta
            key={s.id}
            etichetta={s.nome}
            dettaglio={
              <>
                {s.durata_minuti} min ·{' '}
                <span className="font-semibold text-marrone">{formattatorePrezzo.format(s.prezzo_cent / 100)}</span>
              </>
            }
            onClick={() => onScelto(s)}
          />
        ))}
      </div>

      {servizi && serviziVisibili.length === 0 && (
        <p className="text-lg text-grigio">Nessun servizio in questa categoria al momento.</p>
      )}
    </div>
  );
}
