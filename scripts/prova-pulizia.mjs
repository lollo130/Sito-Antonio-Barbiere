// Cosa cancellerebbe la pulizia mensile dell'archivio, senza cancellare
// niente.
//
// La funzione `pulisciArchivio` gira da sola il primo del mese e toglie le
// prenotazioni oltre il termine di conservazione dichiarato nell'informativa
// privacy. Cancella dati veri e non si torna indietro: questo script serve a
// guardarci dentro prima, e a ricontrollare dopo che il conto torni.
//
// Uso:
//   set GOOGLE_APPLICATION_CREDENTIALS=chiave-servizio.json
//   npm --prefix functions run build
//   node --env-file=.env scripts/prova-pulizia.mjs

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  cancellaPrenotazioniScadute,
  MESI_CONSERVAZIONE,
  sogliaScadenza,
} from '../functions/lib/pulizia.js';

const progetto = process.env.VITE_FIREBASE_PROJECT_ID;
if (!progetto) {
  console.error("Manca VITE_FIREBASE_PROJECT_ID nell'ambiente (.env).");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: progetto });
const db = getFirestore();

const formatta = (d) =>
  new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  }).format(d);

async function principale() {
  const soglia = sogliaScadenza();
  console.log(`\nTermine di conservazione: ${MESI_CONSERVAZIONE} mesi.`);
  console.log(`Sparirebbe tutto quello iniziato prima del ${formatta(soglia)}.\n`);

  const esito = await cancellaPrenotazioniScadute(db, { provaSoltanto: true });

  if (esito.prenotazioniCancellate === 0) {
    const totale = await db.collection('prenotazioni').count().get();
    console.log('Niente da cancellare: nessuna prenotazione ha superato il termine.');
    console.log(`In archivio ce ne sono ${totale.data().count} in tutto.`);
    return;
  }

  console.log(
    `Da cancellare: ${esito.prenotazioniCancellate} prenotazioni e ${esito.fermiCancellati} fermi.`,
  );
  if (esito.altreDaFare) {
    console.log(
      'Raggiunto il tetto per esecuzione: ce ne sono altre, se ne occupa il mese successivo.',
    );
  }

  // Le prime, per farsi un'idea di cosa se ne va. Nomi accorciati: anche in
  // un log di servizio non serve stampare per esteso i dati dei clienti.
  const anteprima = await db
    .collection('prenotazioni')
    .where('inizio', '<', soglia)
    .orderBy('inizio')
    .limit(5)
    .get();

  console.log('\nLe più vecchie:');
  anteprima.docs.forEach((d) => {
    const nome = String(d.get('cliente_nome') ?? '');
    console.log(
      `  ${formatta(d.get('inizio').toDate())} — ${nome.slice(0, 2)}… — stato ${d.get('stato')}`,
    );
  });

  console.log('\nQuesto script non ha cancellato niente.');
}

principale().catch((e) => {
  console.error('\nLa prova si è rotta:', e.message);
  process.exit(1);
});
