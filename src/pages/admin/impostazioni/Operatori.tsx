import { useEffect, useState } from 'react';
import GuscioAdmin from '../../../components/admin/GuscioAdmin';
import Ritratto from '../../../components/Ritratto';
import { preparaFoto } from '../../../lib/foto';
import EditorOrariSettimanali, { type Fascia } from '../../../components/admin/EditorOrariSettimanali';
import { classeCampo, classeEtichetta } from '../../../components/admin/campi';
import { formattaGiornoEsteso, formattaOra, dataRomaDi } from '../../../lib/data';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { seFallisce } from '../../../lib/admin';
import { db } from '../../../lib/firebase';

// L'abbinamento operatore↔servizio ha un ID prevedibile invece che
// automatico: così "chi fa cosa" non può finire scritto due volte, e
// toglierlo è una cancellazione secca senza doverlo prima cercare.
const idAbbinamento = (operatoreId: string, servizioId: string) =>
  `${operatoreId}_${servizioId}`;

// SPECIFICA.md § 7.3 — Operatori: aggiungi, disattiva (mai cancella),
// servizi che sa fare, orari settimanali. Se disattivo un operatore con
// prenotazioni future, avviso e mostro quali sono prima di procedere.

type Operatore = {
  id: string;
  nome: string;
  attivo: boolean;
  ordine: number;
  colore: string;
  foto: string | null;
};
type Servizio = { id: string; nome: string };
type PrenotazioneFutura = { id: string; inizio: string; cliente_nome: string; cliente_cognome: string | null };

export default function Operatori() {
  const [operatori, setOperatori] = useState<Operatore[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [selezionato, setSelezionato] = useState<Operatore | null>(null);
  const [nomeNuovo, setNomeNuovo] = useState('');

  function caricaOperatori() {
    getDocs(query(collection(db, 'operatori'), orderBy('ordine')))
      .then((r) =>
        setOperatori(
          r.docs.map((d) => ({
            id: d.id,
            nome: d.get('nome'),
            attivo: d.get('attivo'),
            ordine: d.get('ordine') ?? 0,
            colore: d.get('colore') ?? '#888888',
            foto: d.get('foto') ?? null,
          })),
        ),
      )
      .catch(() => setErrore('Non riesco a caricare gli operatori.'));
  }

  useEffect(caricaOperatori, []);

  async function aggiungiOperatore() {
    if (nomeNuovo.trim().length < 2) {
      setErrore('Manca il nome.');
      return;
    }
    const prossimoOrdine = Math.max(0, ...(operatori ?? []).map((o) => o.ordine)) + 1;
    const error = await seFallisce(
      addDoc(collection(db, 'operatori'), {
        nome: nomeNuovo.trim(),
        ordine: prossimoOrdine,
        colore: '#888888',
        attivo: true,
        creato_il: Timestamp.now(),
      }),
    );
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
    <GuscioAdmin
      titolo={"Operatori"}
      indietro={{ a: '/admin/impostazioni', etichetta: 'Impostazioni' }}
    >

      {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}
      {!operatori && !errore && <p className="text-lg text-grigio">Carico…</p>}

      <div className="flex flex-col gap-3">
        {operatori?.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelezionato(o)}
            className={`flex min-h-[64px] items-center gap-3 rounded-2xl border-2 px-4 text-left text-lg font-semibold ${
              o.attivo ? 'border-bordo text-inchiostro' : 'border-bordo bg-pieno text-grigio'
            }`}
          >
            <Ritratto nome={o.nome} foto={o.foto} colore={o.colore} />
            <span>
              {o.nome}
              {!o.attivo && <span className="block text-base font-normal">disattivo</span>}
            </span>
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
    </GuscioAdmin>
  );
}

function DettaglioOperatore({ operatore, onIndietro }: { operatore: Operatore; onIndietro: () => void }) {
  const [attivo, setAttivo] = useState(operatore.attivo);
  const [errore, setErrore] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(operatore.foto);
  const [caricandoFoto, setCaricandoFoto] = useState(false);
  const [prenotazioniFuture, setPrenotazioniFuture] = useState<PrenotazioneFutura[] | null>(null);

  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [serviziAssegnati, setServiziAssegnati] = useState<Set<string>>(new Set());
  const [fasce, setFasce] = useState<Fascia[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, 'servizi'), orderBy('ordine')))
      .then((r) => setServizi(r.docs.map((d) => ({ id: d.id, nome: d.get('nome') }))))
      .catch(() => setServizi([]));

    getDocs(
      query(collection(db, 'operatori_servizi'), where('operatore_id', '==', operatore.id)),
    )
      .then((r) => setServiziAssegnati(new Set(r.docs.map((d) => d.get('servizio_id') as string))))
      .catch(() => setServiziAssegnati(new Set()));

    getDocs(query(collection(db, 'orari_operatore'), where('operatore_id', '==', operatore.id)))
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
  }, [operatore.id]);

  async function toggleServizio(servizioId: string) {
    const assegnato = serviziAssegnati.has(servizioId);
    const riferimento = doc(db, 'operatori_servizi', idAbbinamento(operatore.id, servizioId));
    if (assegnato) {
      await seFallisce(deleteDoc(riferimento));
    } else {
      await seFallisce(
        setDoc(riferimento, { operatore_id: operatore.id, servizio_id: servizioId }),
      );
    }
    setServiziAssegnati((s) => {
      const nuovo = new Set(s);
      if (assegnato) nuovo.delete(servizioId);
      else nuovo.add(servizioId);
      return nuovo;
    });
  }

  async function aggiungiFascia(giorno: number, oraInizio: string, oraFine: string) {
    try {
      const creata = await addDoc(collection(db, 'orari_operatore'), {
        operatore_id: operatore.id,
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
    const error = await seFallisce(deleteDoc(doc(db, 'orari_operatore', id)));
    if (!error) setFasce((f) => f.filter((x) => x.id !== id));
  }

  async function salvaAttivo(nuovoAttivo: boolean) {
    const error = await seFallisce(
      updateDoc(doc(db, 'operatori', operatore.id), { attivo: nuovoAttivo }),
    );
    if (error) {
      setErrore('Non sono riuscito a salvare la modifica.');
      return;
    }
    setAttivo(nuovoAttivo);
    setPrenotazioniFuture(null);
  }

  async function disattiva() {
    setErrore(null);
    let future: PrenotazioneFutura[];
    try {
      const righe = await getDocs(
        query(
          collection(db, 'prenotazioni'),
          where('operatore_id', '==', operatore.id),
          where('inizio', '>', Timestamp.now()),
          orderBy('inizio'),
        ),
      );
      // Lo stato si filtra qui: metterlo nella query costringerebbe a un
      // altro indice composito per una manciata di documenti.
      future = righe.docs
        .filter((d) => d.get('stato') === 'confermata')
        .map((d) => ({
          id: d.id,
          inizio: (d.get('inizio') as Timestamp).toDate().toISOString(),
          cliente_nome: d.get('cliente_nome'),
          cliente_cognome: d.get('cliente_cognome') ?? null,
        }));
    } catch {
      setErrore('Non riesco a controllare le prenotazioni future.');
      return;
    }

    if (future.length > 0) {
      setPrenotazioniFuture(future);
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

  async function salvaFoto(nuova: string | null) {
    setErrore(null);
    // `null` e non un campo mancante: così "questo operatore non ha foto" è
    // una cosa scritta, e non si confonde con un documento vecchio in cui il
    // campo non è mai esistito.
    const error = await seFallisce(updateDoc(doc(db, 'operatori', operatore.id), { foto: nuova }));
    if (error) {
      setErrore('Non sono riuscito a salvare la foto. Riprova.');
      return;
    }
    // Solo lo stato locale: l'elenco dietro si rilegge da Firestore quando si
    // torna indietro (`onIndietro` chiama `caricaOperatori`), quindi la foto
    // nuova la trova già lì. Scriverla anche dentro l'oggetto ricevuto come
    // prop sembrerebbe più diretto ed è invece il modo di avere due verità.
    setFoto(nuova);
  }

  async function cambiaFoto(file: File) {
    setCaricandoFoto(true);
    setErrore(null);
    const esito = await preparaFoto(file);
    if (!esito.ok) {
      setErrore(esito.errore);
      setCaricandoFoto(false);
      return;
    }
    await salvaFoto(esito.foto);
    setCaricandoFoto(false);
  }

  return (
    <GuscioAdmin titolo={operatore.nome} indietro={{ etichetta: 'Operatori', onClick: onIndietro }}>
      {errore && <p className="text-lg font-medium text-allarme-testo">{errore}</p>}

      <div className="flex items-center gap-4 rounded-2xl border-2 border-bordo p-4">
        <Ritratto nome={operatore.nome} foto={foto} colore={operatore.colore} misura={84} />
        <div className="flex flex-1 flex-col gap-2">
          <p className={classeEtichetta}>Foto</p>
          <div className="flex flex-wrap gap-2">
            {/* Il campo file vero resta nascosto: da solo è minuscolo, non si
                può colorare e ogni browser lo disegna a modo suo. La label
                fa da bottone, e per la tastiera resta comunque il campo. */}
            <label className="flex min-h-[48px] cursor-pointer items-center rounded-lg border-2 border-inchiostro px-4 font-titolo text-base font-bold text-inchiostro">
              {caricandoFoto ? 'Riduco…' : foto ? 'Cambia foto' : 'Scegli una foto'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={caricandoFoto}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  // Si azzera subito: senza, riscegliere LO STESSO file non
                  // fa scattare di nuovo l'evento e sembra che non funzioni.
                  e.target.value = '';
                  if (file) cambiaFoto(file);
                }}
              />
            </label>
            {foto && (
              <button
                type="button"
                onClick={() => salvaFoto(null)}
                className="min-h-[48px] rounded-lg border-2 border-bordo px-4 font-titolo text-base font-bold text-grigio"
              >
                Togli
              </button>
            )}
          </div>
          <p className="text-sm text-grigio">
            Si vede quando il cliente sceglie chi lo taglia. Viene ritagliata quadrata e rimpicciolita
            da sola: va bene anche una foto fatta col telefono.
          </p>
        </div>
      </div>

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
    </GuscioAdmin>
  );
}
