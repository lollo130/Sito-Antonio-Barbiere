import { useEffect, useState } from 'react';
import GuscioAdmin from '../../../components/admin/GuscioAdmin';
import BottoneToggle from '../../../components/admin/BottoneToggle';
import { classeCampo, classeEtichetta } from '../../../components/admin/campi';
import { formattaGiornoEsteso, dataRomaDi } from '../../../lib/data';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { seFallisce } from '../../../lib/admin';
import { db } from '../../../lib/firebase';

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
    getDocs(query(collection(db, 'operatori'), orderBy('ordine')))
      .then((r) => {
        const righe = r.docs.map((d) => ({ id: d.id, nome: d.get('nome') as string }));
        setOperatori(righe);
        if (righe.length > 0) setOperatoreId(righe[0].id);
      })
      .catch(() => setOperatori([]));
  }, []);

  function caricaAssenze(id: string) {
    getDocs(query(collection(db, 'assenze'), where('operatore_id', '==', id), orderBy('inizio')))
      .then((r) =>
        setAssenze(
          r.docs.map((d) => ({
            id: d.id,
            inizio: (d.get('inizio') as Timestamp).toDate().toISOString(),
            fine: (d.get('fine') as Timestamp).toDate().toISOString(),
            motivo: d.get('motivo') ?? null,
          })),
        ),
      )
      .catch(() => setErrore('Non riesco a caricare le assenze.'));
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
    const error = await seFallisce(
      addDoc(collection(db, 'assenze'), {
        operatore_id: operatoreId,
        inizio: Timestamp.fromDate(new Date(`${dataInizio}T00:00:00`)),
        fine: Timestamp.fromDate(new Date(`${dataFine}T23:59:59`)),
        motivo: motivo.trim() || null,
      }),
    );
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
    const error = await seFallisce(deleteDoc(doc(db, 'assenze', a.id)));
    if (error) {
      setErrore('Non sono riuscito a rimuovere l\'assenza.');
      return;
    }
    if (operatoreId) caricaAssenze(operatoreId);
  }

  return (
    <GuscioAdmin
      titolo={"Assenze"}
      indietro={{ a: '/admin/impostazioni', etichetta: 'Impostazioni' }}
    >

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

      {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}
      {!assenze && !errore && <p className="text-lg text-grigio">Carico…</p>}
      {assenze && assenze.length === 0 && <p className="text-base text-grigio">Nessuna assenza in programma.</p>}

      <div className="flex flex-col gap-3">
        {assenze?.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-bordo p-4">
            <div>
              <p className="text-lg font-semibold text-inchiostro">
                {formattaGiornoEsteso(dataRomaDi(a.inizio))}
                {dataRomaDi(a.inizio) !== dataRomaDi(a.fine) && ` – ${formattaGiornoEsteso(dataRomaDi(a.fine))}`}
              </p>
              {a.motivo && <p className="text-base text-grigio">{a.motivo}</p>}
            </div>
            <button type="button" onClick={() => rimuoviAssenza(a)} className="shrink-0 text-base font-semibold text-allarme-testo">
              Rimuovi
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border-2 border-bordo p-4">
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
          Motivo <span className="font-normal text-grigio">(facoltativo)</span>
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
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-inchiostro px-6 text-lg font-semibold text-inchiostro"
        >
          + Aggiungi assenza
        </button>
      </div>
    </GuscioAdmin>
  );
}
