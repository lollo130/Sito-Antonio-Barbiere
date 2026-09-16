import { useEffect, useState } from 'react';
import GuscioAdmin from '../../../components/admin/GuscioAdmin';
import EditorOrariSettimanali, { type Fascia } from '../../../components/admin/EditorOrariSettimanali';
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
} from 'firebase/firestore';
import { seFallisce } from '../../../lib/admin';
import { db } from '../../../lib/firebase';

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
    getDocs(query(collection(db, 'orari_salone'), orderBy('giorno')))
      .then((r) =>
        setFasce(
          r.docs.map((d) => ({
            id: d.id,
            giorno: d.get('giorno'),
            ora_inizio: d.get('ora_inizio'),
            ora_fine: d.get('ora_fine'),
          })),
        ),
      )
      .catch(() => setFasce([]));
  }

  function caricaChiusure() {
    getDocs(query(collection(db, 'chiusure_salone'), orderBy('inizio')))
      .then((r) =>
        setChiusure(
          r.docs.map((d) => ({
            id: d.id,
            inizio: (d.get('inizio') as Timestamp).toDate().toISOString(),
            fine: (d.get('fine') as Timestamp).toDate().toISOString(),
            motivo: d.get('motivo') ?? null,
          })),
        ),
      )
      .catch(() => setErrore('Non riesco a caricare le chiusure.'));
  }

  useEffect(() => {
    caricaOrari();
    caricaChiusure();
  }, []);

  async function aggiungiFascia(giorno: number, oraInizio: string, oraFine: string) {
    try {
      const creata = await addDoc(collection(db, 'orari_salone'), {
        giorno,
        ora_inizio: oraInizio,
        ora_fine: oraFine,
      });
      setFasce((f) => [...f, { id: creata.id, giorno, ora_inizio: oraInizio, ora_fine: oraFine }]);
    } catch {
      setErrore('Non sono riuscito a salvare la fascia oraria.');
    }
  }

  async function rimuoviFascia(id: string) {
    const error = await seFallisce(deleteDoc(doc(db, 'orari_salone', id)));
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
    const error = await seFallisce(
      addDoc(collection(db, 'chiusure_salone'), {
        inizio: Timestamp.fromDate(new Date(`${dataInizio}T00:00:00`)),
        fine: Timestamp.fromDate(new Date(`${dataFine}T23:59:59`)),
        motivo: motivo.trim() || null,
      }),
    );
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
    const error = await seFallisce(deleteDoc(doc(db, 'chiusure_salone', c.id)));
    if (error) {
      setErrore('Non sono riuscito a rimuovere la chiusura.');
      return;
    }
    caricaChiusure();
  }

  return (
    <GuscioAdmin
      titolo={"Orari del salone e chiusure"}
      indietro={{ a: '/admin/impostazioni', etichetta: 'Impostazioni' }}
    >

      {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-inchiostro">Orari settimanali</h2>
        <p className="text-base text-grigio">
          Informativi (per il sito pubblico): la disponibilità delle prenotazioni dipende sempre dagli orari di ogni
          singolo operatore, in "Impostazioni → Operatori".
        </p>
        <EditorOrariSettimanali fasce={fasce} onAggiungi={aggiungiFascia} onRimuovi={rimuoviFascia} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-inchiostro">Chiusure</h2>
        <p className="text-base text-grigio">Festivi, ferie collettive: valgono per tutti gli operatori.</p>

        {!chiusure && <p className="text-lg text-grigio">Carico…</p>}
        {chiusure && chiusure.length === 0 && <p className="text-base text-grigio">Nessuna chiusura in programma.</p>}

        <div className="flex flex-col gap-3">
          {chiusure?.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-bordo p-4">
              <div>
                <p className="text-lg font-semibold text-inchiostro">
                  {formattaGiornoEsteso(dataRomaDi(c.inizio))}
                  {dataRomaDi(c.inizio) !== dataRomaDi(c.fine) && ` – ${formattaGiornoEsteso(dataRomaDi(c.fine))}`}
                </p>
                {c.motivo && <p className="text-base text-grigio">{c.motivo}</p>}
              </div>
              <button
                type="button"
                onClick={() => rimuoviChiusura(c)}
                className="shrink-0 text-base font-semibold text-allarme-testo"
              >
                Rimuovi
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border-2 border-bordo p-4">
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
            Motivo <span className="font-normal text-grigio">(facoltativo)</span>
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
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-inchiostro px-6 text-lg font-semibold text-inchiostro"
          >
            + Aggiungi chiusura
          </button>
        </div>
      </div>
    </GuscioAdmin>
  );
}
