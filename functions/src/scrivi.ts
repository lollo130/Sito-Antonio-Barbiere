// L'UNICO posto da cui si scrive su `prenotazioni`.
//
// Ci passano sia la prenotazione dal sito sia quella inserita a mano dal
// pannello: non perché sia comodo, ma perché la prenotazione e i suoi fermi
// (vedi blocchi.ts) devono nascere e morire insieme, in una transazione. Un
// documento scritto dal browser salterebbe i fermi, e la difesa contro la
// doppia prenotazione varrebbe finché va bene.

import { firestore } from 'firebase-admin';
import {
  allineatoAlPasso,
  liberaBlocchi,
  PASSO_BLOCCO_MINUTI,
  riferimentiBlocchi,
  STATI_OCCUPANTI,
} from './blocchi';

export type Stato = 'confermata' | 'completata' | 'non_presentato' | 'cancellata';

export type DatiPrenotazione = {
  operatoreId: string;
  servizioId: string;
  clienteNome: string;
  clienteCognome: string | null;
  clienteTelefono: string;
  clienteEmail: string | null;
  inizio: Date;
  durataMinuti: number;
  origine: 'sito' | 'manuale';
  forzata: boolean;
  note?: string | null;
};

export type EsitoScrittura =
  | { tipo: 'ok'; id: string; inizio: Date; fine: Date }
  | { tipo: 'occupato' };

/** Errore interno alla transazione: lo slot se l'è preso qualcun altro. */
class SlotOccupato extends Error {}

function eGiaEsistente(e: unknown): boolean {
  // Firestore: 6 = ALREADY_EXISTS. È la risposta a un `create` su un
  // documento che c'è già, cioè il nostro "questo slot è preso".
  return (e as { code?: number }).code === 6;
}

export async function creaPrenotazione(
  db: firestore.Firestore,
  dati: DatiPrenotazione,
): Promise<EsitoScrittura> {
  if (!allineatoAlPasso(dati.inizio)) {
    throw new Error(
      `L'orario di inizio deve cadere ogni ${PASSO_BLOCCO_MINUTI} minuti esatti.`,
    );
  }
  if (dati.durataMinuti <= 0 || dati.durataMinuti % PASSO_BLOCCO_MINUTI !== 0) {
    throw new Error(`La durata deve essere un multiplo di ${PASSO_BLOCCO_MINUTI} minuti.`);
  }

  const fine = new Date(dati.inizio.getTime() + dati.durataMinuti * 60_000);
  const prenotazione = db.collection('prenotazioni').doc();
  const fermi = riferimentiBlocchi(db, dati.operatoreId, dati.inizio, dati.durataMinuti);

  const riga = {
    operatore_id: dati.operatoreId,
    servizio_id: dati.servizioId,
    cliente_nome: dati.clienteNome,
    cliente_cognome: dati.clienteCognome,
    cliente_telefono: dati.clienteTelefono,
    cliente_email: dati.clienteEmail,
    inizio: firestore.Timestamp.fromDate(dati.inizio),
    fine: firestore.Timestamp.fromDate(fine),
    stato: 'confermata' as Stato,
    origine: dati.origine,
    forzata: dati.forzata,
    note: dati.note ?? null,
    creata_il: firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.runTransaction(async (tx) => {
      // Le righe forzate restano fuori dai fermi, esattamente come stavano
      // fuori dal vincolo Postgres: il titolare che infila un cliente in uno
      // slot pieno lo fa apposta (CLAUDE.md § 7).
      if (!dati.forzata) {
        const letti = await tx.getAll(...fermi);
        if (letti.some((d) => d.exists)) throw new SlotOccupato();
        fermi.forEach((ref, i) => {
          tx.create(ref, {
            prenotazione_id: prenotazione.id,
            operatore_id: dati.operatoreId,
            istante: firestore.Timestamp.fromDate(
              new Date(dati.inizio.getTime() + i * PASSO_BLOCCO_MINUTI * 60_000),
            ),
          });
        });
      }
      tx.create(prenotazione, riga);
    });
  } catch (e) {
    if (e instanceof SlotOccupato || eGiaEsistente(e)) return { tipo: 'occupato' };
    throw e;
  }

  return { tipo: 'ok', id: prenotazione.id, inizio: dati.inizio, fine };
}

export type EsitoStato = 'ok' | 'inesistente' | 'occupato';

/**
 * Cambia lo stato di una prenotazione e rimette a posto i fermi.
 *
 * In Postgres non serviva: il vincolo guardava `stato in
 * ('confermata','completata')`, quindi cancellare una prenotazione liberava
 * lo slot da sé. Qui i fermi sono documenti, e vanno tolti e rimessi a mano.
 */
export async function cambiaStato(
  db: firestore.Firestore,
  prenotazioneId: string,
  nuovoStato: Stato,
): Promise<EsitoStato> {
  const ref = db.collection('prenotazioni').doc(prenotazioneId);
  const doc = await ref.get();
  if (!doc.exists) return 'inesistente';

  const statoPrima = doc.get('stato') as Stato;
  const occupavaPrima = STATI_OCCUPANTI.includes(statoPrima as 'confermata' | 'completata');
  const occupaAdesso = STATI_OCCUPANTI.includes(nuovoStato as 'confermata' | 'completata');
  const forzata = doc.get('forzata') === true;

  // Torna a occupare uno slot che aveva liberato: va ripreso, e può non
  // esserci più. Prima lo si riprende, poi si cambia lo stato.
  if (!occupavaPrima && occupaAdesso && !forzata) {
    const inizio = (doc.get('inizio') as firestore.Timestamp).toDate();
    const fine = (doc.get('fine') as firestore.Timestamp).toDate();
    const durata = Math.round((fine.getTime() - inizio.getTime()) / 60_000);
    const fermi = riferimentiBlocchi(db, doc.get('operatore_id'), inizio, durata);
    try {
      await db.runTransaction(async (tx) => {
        const letti = await tx.getAll(...fermi);
        if (letti.some((d) => d.exists)) throw new SlotOccupato();
        fermi.forEach((r, i) => {
          tx.create(r, {
            prenotazione_id: prenotazioneId,
            operatore_id: doc.get('operatore_id'),
            istante: firestore.Timestamp.fromDate(
              new Date(inizio.getTime() + i * PASSO_BLOCCO_MINUTI * 60_000),
            ),
          });
        });
        tx.update(ref, { stato: nuovoStato });
      });
      return 'ok';
    } catch (e) {
      if (e instanceof SlotOccupato || eGiaEsistente(e)) return 'occupato';
      throw e;
    }
  }

  await ref.update({ stato: nuovoStato });
  if (occupavaPrima && !occupaAdesso) await liberaBlocchi(db, prenotazioneId);
  return 'ok';
}
