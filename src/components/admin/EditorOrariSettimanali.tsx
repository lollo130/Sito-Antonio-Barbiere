import { useState } from 'react';

// Editor riutilizzabile per fasce orarie settimanali — usato sia per gli
// orari del singolo operatore sia per gli orari generali del salone.

export type Fascia = { id: string; giorno: number; ora_inizio: string; ora_fine: string };

const GIORNI = [
  { valore: 1, etichetta: 'Lunedì' },
  { valore: 2, etichetta: 'Martedì' },
  { valore: 3, etichetta: 'Mercoledì' },
  { valore: 4, etichetta: 'Giovedì' },
  { valore: 5, etichetta: 'Venerdì' },
  { valore: 6, etichetta: 'Sabato' },
  { valore: 0, etichetta: 'Domenica' },
];

type Props = {
  fasce: Fascia[];
  onAggiungi: (giorno: number, oraInizio: string, oraFine: string) => void;
  onRimuovi: (id: string) => void;
};

export default function EditorOrariSettimanali({ fasce, onAggiungi, onRimuovi }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {GIORNI.map((g) => (
        <RigaGiorno
          key={g.valore}
          giorno={g.valore}
          etichetta={g.etichetta}
          fasce={fasce.filter((f) => f.giorno === g.valore)}
          onAggiungi={onAggiungi}
          onRimuovi={onRimuovi}
        />
      ))}
    </div>
  );
}

function RigaGiorno({
  giorno,
  etichetta,
  fasce,
  onAggiungi,
  onRimuovi,
}: {
  giorno: number;
  etichetta: string;
  fasce: Fascia[];
  onAggiungi: Props['onAggiungi'];
  onRimuovi: Props['onRimuovi'];
}) {
  const [oraInizio, setOraInizio] = useState('09:00');
  const [oraFine, setOraFine] = useState('13:00');

  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-stone-300 p-4">
      <p className="text-lg font-semibold text-stone-900">{etichetta}</p>

      {fasce.length === 0 && <p className="text-base text-stone-600">Chiuso</p>}
      {fasce.map((f) => (
        <div key={f.id} className="flex items-center justify-between gap-3">
          <span className="text-base text-stone-900">
            {f.ora_inizio.slice(0, 5)} – {f.ora_fine.slice(0, 5)}
          </span>
          <button type="button" onClick={() => onRimuovi(f.id)} className="text-base font-semibold text-red-700">
            Rimuovi
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input
          type="time"
          value={oraInizio}
          onChange={(e) => setOraInizio(e.target.value)}
          className="min-h-[48px] rounded-lg border-2 border-stone-300 px-2 text-base text-stone-900"
        />
        <span className="text-base text-stone-600">–</span>
        <input
          type="time"
          value={oraFine}
          onChange={(e) => setOraFine(e.target.value)}
          className="min-h-[48px] rounded-lg border-2 border-stone-300 px-2 text-base text-stone-900"
        />
        <button
          type="button"
          onClick={() => onAggiungi(giorno, oraInizio, oraFine)}
          className="ml-auto min-h-[48px] rounded-lg border-2 border-stone-900 px-4 text-base font-semibold text-stone-900"
        >
          + Aggiungi
        </button>
      </div>
    </div>
  );
}
