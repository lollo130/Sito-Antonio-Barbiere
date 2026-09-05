// I FERMI DEGLI SLOT — quello che in Postgres faceva `no_overlap`.
//
// Il vincolo che c'era prima:
//
//   exclude using gist (operatore_id with =, tstzrange(inizio,fine) with &&)
//   where (stato in ('confermata','completata') and not forzata)
//
// era l'unica vera difesa contro la doppia prenotazione: due richieste
// arrivate nello stesso millisecondo non potevano finire tutt'e due dentro,
// perché era il database a rifiutare la seconda.
//
// Firestore non ha vincoli di esclusione, e non ha modo di dire "nessun
// altro documento si sovrappone a questo intervallo". Ha però una cosa che
// serve allo stesso scopo: **l'unicità dell'ID di un documento**, imposta
// dal database. `create` su un ID che esiste già fallisce, dentro una
// transazione, sempre.
//
// Quindi l'intervallo si smonta in fermi da 5 minuti con un ID prevedibile:
//
//   blocchi/{operatore_id}_{istante UTC}      es. ab12…_202609040930
//
// Prenotare = creare in una sola transazione la prenotazione E tutti i suoi
// fermi. Se un fermo esiste già, la transazione salta per intero: nessuna
// prenotazione scritta a metà, nessun controllo applicativo "prima leggo poi
// scrivo" (che sarebbe una difesa finta, vedi CLAUDE.md § 1).
//
// I 5 minuti non sono una scelta: `servizi.durata_minuti` è sempre un
// multiplo di 5 (era un CHECK in Postgres, ora sta nelle regole Firestore),
// quindi la griglia copre gli intervalli esatti, senza arrotondamenti.
//
// Cosa si perde rispetto a Postgres, detto chiaro:
//  - gli orari di inizio devono cadere sulla griglia dei 5 minuti. Un
//    inizio alle 09:07 non è rappresentabile e viene rifiutato;
//  - il vincolo non è più universale: vale perché OGNI scrittura passa da
//    qui. Per questo le regole vietano a chiunque, admin compreso, di
//    scrivere su `prenotazioni` dal browser.
//
// Le righe `forzata = true` restano fuori, di proposito e come prima: il
// titolare che infila a mano un cliente in uno slot pieno non scrive fermi,
// quindi non toglie il posto a nessun altro.

import type { firestore } from 'firebase-admin';

export const PASSO_BLOCCO_MINUTI = 5;

/** Stati che tengono occupato lo slot. Identico al `where` del vincolo. */
export const STATI_OCCUPANTI = ['confermata', 'completata'] as const;

function chiaveIstante(istante: Date): string {
  return istante.toISOString().slice(0, 16).replace(/[-:T]/g, '');
}

export function idBlocco(operatoreId: string, istante: Date): string {
  return `${operatoreId}_${chiaveIstante(istante)}`;
}

/** Vero se l'istante cade sulla griglia dei 5 minuti (secondi inclusi). */
export function allineatoAlPasso(istante: Date): boolean {
  return (
    istante.getUTCSeconds() === 0 &&
    istante.getUTCMilliseconds() === 0 &&
    istante.getUTCMinutes() % PASSO_BLOCCO_MINUTI === 0
  );
}

/** Gli istanti da fermare per [inizio, inizio+durata). Estremo destro escluso. */
export function istantiDaFermare(inizio: Date, durataMinuti: number): Date[] {
  const quanti = durataMinuti / PASSO_BLOCCO_MINUTI;
  return Array.from(
    { length: quanti },
    (_, i) => new Date(inizio.getTime() + i * PASSO_BLOCCO_MINUTI * 60_000),
  );
}

export function riferimentiBlocchi(
  db: firestore.Firestore,
  operatoreId: string,
  inizio: Date,
  durataMinuti: number,
): firestore.DocumentReference[] {
  return istantiDaFermare(inizio, durataMinuti).map((istante) =>
    db.collection('blocchi').doc(idBlocco(operatoreId, istante)),
  );
}

/**
 * Toglie i fermi di una prenotazione. Serve quando passa a `cancellata` o
 * `non_presentato`: in Postgres il vincolo smetteva da solo di considerarla,
 * perché quegli stati erano fuori dal `where`. Qui va fatto a mano.
 */
export async function liberaBlocchi(
  db: firestore.Firestore,
  prenotazioneId: string,
): Promise<number> {
  const trovati = await db
    .collection('blocchi')
    .where('prenotazione_id', '==', prenotazioneId)
    .get();
  if (trovati.empty) return 0;

  // Un batch regge 500 scritture: un servizio da 8 ore ne farebbe 96.
  const lotto = db.batch();
  trovati.docs.forEach((d) => lotto.delete(d.ref));
  await lotto.commit();
  return trovati.size;
}
