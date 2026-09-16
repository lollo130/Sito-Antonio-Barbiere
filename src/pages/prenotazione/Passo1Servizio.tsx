import { useEffect, useState } from 'react';
import BottoneScelta from '../../components/prenotazione/BottoneScelta';
import { serviziAttivi, type Servizio as ServizioDb } from '../../lib/db';

export type Servizio = ServizioDb;

const formattatorePrezzo = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

type Props = {
  onScelto: (servizio: Servizio) => void;
};

// Qui in cima c'erano due bottoni, "Uomo" e "Donna", per filtrare il listino.
//
// Il taglio femminile è sospeso — la decisione è del titolare, il capitolo si
// riapre più avanti — e il filtro se ne va con lui: con una sola categoria
// rimasta, quei due bottoni diventano uno che non fa niente e uno che svuota
// la pagina. Tolti, non disabilitati: un comando inerte fa più danno di uno
// assente, soprattutto a un pubblico anziano che ci prova su e non capisce
// perché non risponde.
//
// A nascondere i servizi `donna` ci pensa `serviziAttivi()` in lib/db.ts, che
// serve anche il listino della home: sono una fonte sola apposta, altrimenti
// prima o poi la home mostrerebbe un servizio che poi non si può prenotare.
export default function Passo1Servizio({ onScelto }: Props) {
  const [servizi, setServizi] = useState<Servizio[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    serviziAttivi()
      .then((righe) => {
        if (attivo) setServizi(righe);
      })
      .catch(() => {
        if (attivo) setErrore('Non riesco a caricare i servizi. Riprova tra poco.');
      });
    return () => {
      attivo = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titolo text-3xl font-semibold text-inchiostro">Cosa ti serve?</h1>

      {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}
      {!servizi && !errore && <p className="text-lg text-grigio">Carico i servizi…</p>}

      <div className="flex flex-col gap-3">
        {servizi?.map((s) => (
          <BottoneScelta
            key={s.id}
            etichetta={s.nome}
            dettaglio={
              <>
                {s.durata_minuti} min ·{' '}
                <span className="font-semibold text-marrone">
                  {formattatorePrezzo.format(s.prezzo_cent / 100)}
                </span>
              </>
            }
            onClick={() => onScelto(s)}
          />
        ))}
      </div>

      {servizi?.length === 0 && (
        <p className="text-lg text-grigio">
          Il listino non è ancora online. Chiamaci e te lo diciamo noi.
        </p>
      )}
    </div>
  );
}
