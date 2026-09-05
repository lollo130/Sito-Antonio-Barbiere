// Cancellazione delle prenotazioni scadute.
//
// L'informativa privacy promette che le prenotazioni restano in archivio 24
// mesi e poi vengono cancellate. Finché nessuno le cancellava davvero,
// quella riga era una promessa scritta e non mantenuta — che davanti al
// Garante vale peggio di un termine vago, perché è dichiarata.
//
// Gira una volta al mese e toglie prenotazioni e relativi fermi più vecchi
// del termine. Vale per tutte, in qualunque stato: anche una cancellata
// contiene un nome e un numero di telefono.
//
// Tre cautele, perché qui si cancella roba vera e non si torna indietro:
//  - un tetto per esecuzione, così un errore di calcolo della soglia non
//    puo' svuotare l'archivio in un colpo. Girando ogni mese, recupera da
//    sola quello che avanza;
//  - i fermi di una prenotazione se ne vanno insieme a lei, mai prima:
//    se la cancellazione si interrompe a metà, al giro dopo la prenotazione
//    è ancora lì e si riparte;
//  - scrive nel log quante ne ha tolte e fino a che data, così resta una
//    traccia di cosa è successo.

import type { firestore } from 'firebase-admin';

/**
 * Deve restare uguale a MESI_CONSERVAZIONE in src/lib/salone.ts, che è il
 * numero scritto nell'informativa. Sono due runtime diversi e non possono
 * condividere il file: se cambia uno, cambia l'altro.
 */
export const MESI_CONSERVAZIONE = 24;

/** Quante prenotazioni al massimo per esecuzione. */
const TETTO_PER_ESECUZIONE = 500;

/** Un batch Firestore regge 500 scritture: si sta larghi. */
const SCRITTURE_PER_LOTTO = 400;

/**
 * Alle query si passa sempre una `Date`, mai un `Timestamp` costruito qui:
 * gli script da riga di comando usano la copia di firebase-admin della
 * radice, le funzioni quella di functions/, e un Timestamp fatto con una
 * delle due l'altra non lo riconosce. Una Date la capiscono entrambe.
 */
export function sogliaScadenza(adesso = new Date()): Date {
  const soglia = new Date(adesso);
  soglia.setMonth(soglia.getMonth() - MESI_CONSERVAZIONE);
  return soglia;
}

export type EsitoPulizia = {
  prenotazioniCancellate: number;
  fermiCancellati: number;
  soglia: string;
  altreDaFare: boolean;
};

/**
 * Cancella le prenotazioni iniziate prima della soglia, coi loro fermi.
 * Con `provaSoltanto` conta e basta, senza toccare niente.
 */
export async function cancellaPrenotazioniScadute(
  db: firestore.Firestore,
  opzioni: { adesso?: Date; provaSoltanto?: boolean } = {},
): Promise<EsitoPulizia> {
  const soglia = sogliaScadenza(opzioni.adesso);

  const scadute = await db
    .collection('prenotazioni')
    .where('inizio', '<', soglia)
    .orderBy('inizio')
    .limit(TETTO_PER_ESECUZIONE)
    .get();

  let fermiCancellati = 0;

  if (!opzioni.provaSoltanto) {
    for (const prenotazione of scadute.docs) {
      const fermi = await db
        .collection('blocchi')
        .where('prenotazione_id', '==', prenotazione.id)
        .get();

      // Prima i fermi, poi la prenotazione: se qui salta la corrente, al
      // giro dopo la prenotazione è ancora in elenco e la si ritrova.
      for (let i = 0; i < fermi.size; i += SCRITTURE_PER_LOTTO) {
        const lotto = db.batch();
        fermi.docs.slice(i, i + SCRITTURE_PER_LOTTO).forEach((f) => lotto.delete(f.ref));
        await lotto.commit();
      }
      fermiCancellati += fermi.size;

      await prenotazione.ref.delete();
    }
  } else {
    for (const prenotazione of scadute.docs) {
      const fermi = await db
        .collection('blocchi')
        .where('prenotazione_id', '==', prenotazione.id)
        .count()
        .get();
      fermiCancellati += fermi.data().count;
    }
  }

  return {
    prenotazioniCancellate: scadute.size,
    fermiCancellati,
    soglia: soglia.toISOString(),
    altreDaFare: scadute.size === TETTO_PER_ESECUZIONE,
  };
}
