// Test end-to-end della Cloud Function `prenota`.
//
// Copre i due punti delicati della SPECIFICA.md § 8, gli stessi di prima:
//
//  A) un fallimento nell'invio email non deve mai far fallire la
//     prenotazione (se RESEND_API_KEY non è configurata ogni invio fallisce:
//     se la prenotazione riesce lo stesso, il punto è dimostrato);
//
//  B) più prenotazioni in contemporanea sullo stesso slot: UNA sola deve
//     riuscire, le altre devono ricevere alternative con codice
//     'slot_non_disponibile', mai un errore generico.
//
// (B) è il test che conta di più dopo il passaggio a Firebase: è quello che
// dimostra che i fermi in `blocchi` fanno il lavoro che faceva il vincolo
// `no_overlap` di Postgres. Se un giorno passasse, vuol dire che due clienti
// hanno preso lo stesso posto.
//
// Uso:
//   set GOOGLE_APPLICATION_CREDENTIALS=chiave-servizio.json
//   node --env-file=.env scripts/test-prenota.mjs

import { applicationDefault, initializeApp as initAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClient } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const RICHIESTE_IN_PARALLELO = 5;
const REGIONE = 'europe-west1';

const configurazione = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!configurazione.apiKey || !configurazione.projectId) {
  console.error('Mancano le VITE_FIREBASE_* nell\'ambiente (.env).');
  process.exit(1);
}

initAdmin({ credential: applicationDefault(), projectId: configurazione.projectId });
const admin = getAdminFirestore();
const prenota = httpsCallable(getFunctions(initClient(configurazione), REGIONE), 'prenota');

let fallito = false;
function esito(ok, etichetta, dettaglio) {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${etichetta}${dettaglio ? ' — ' + dettaglio : ''}`);
  if (!ok) fallito = true;
}

/** Il primo orario libero, chiesto alla stessa funzione che usa il sito. */
async function primoSlotLibero(servizioId) {
  const agenda = httpsCallable(
    getFunctions(initClient(configurazione, 'agenda'), REGIONE),
    'agendaGiorno',
  );
  const oggi = new Date();
  for (let g = 0; g < 30; g++) {
    const giorno = new Date(oggi.getTime() + g * 86_400_000).toISOString().slice(0, 10);
    const { data } = await agenda({ servizio_id: servizioId, data: giorno });
    const libero = (data.righe ?? []).find((r) => r.libero);
    if (libero) return libero.inizio;
  }
  return null;
}

const creati = [];

async function principale() {
  const servizi = await admin.collection('servizi').where('attivo', '==', true).limit(1).get();
  if (servizi.empty) {
    console.error('Nessun servizio attivo: lancia prima scripts/semina-firestore.mjs.');
    process.exit(1);
  }
  const servizioId = servizi.docs[0].id;

  // L'operatore va FISSATO. Senza, le richieste si spargono su tutti quelli
  // che sanno fare il servizio e ne passa una per ciascuno: giusto — sono
  // poltrone diverse — ma non è la corsa che vogliamo misurare. Il vincolo
  // da provare è "due clienti sulla STESSA poltrona alla stessa ora", che è
  // quello che teneva il vecchio no_overlap (per operatore, non globale).
  const abbinamenti = await admin
    .collection('operatori_servizi')
    .where('servizio_id', '==', servizioId)
    .get();
  if (abbinamenti.empty) {
    console.error('Nessun operatore abbinato al servizio.');
    process.exit(1);
  }
  const operatoreId = abbinamenti.docs[0].get('operatore_id');

  const inizio = await primoSlotLibero(servizioId);
  if (!inizio) {
    console.error('Nessuno slot libero nei prossimi 30 giorni: controlla orari e assenze.');
    process.exit(1);
  }
  console.log(`\nSlot di prova: ${inizio}\n`);

  // Numeri diversi per ogni richiesta, altrimenti scatta il limite
  // anti-abuso (una sola prenotazione futura per telefono) e il test
  // misurerebbe quello invece della corsa sullo slot.
  const richieste = Array.from({ length: RICHIESTE_IN_PARALLELO }, (_, i) =>
    prenota({
      servizio_id: servizioId,
      operatore_id: operatoreId,
      inizio,
      cliente_nome: `Prova ${i}`,
      cliente_telefono: `+3900000${String(i).padStart(4, '0')}`,
    }).then(
      (r) => r.data,
      (e) => ({ ok: false, codice: 'eccezione', errore: e.message }),
    ),
  );

  const risposte = await Promise.all(richieste);
  const riuscite = risposte.filter((r) => r.ok);
  const respinte = risposte.filter((r) => !r.ok);

  riuscite.forEach((r) => creati.push(r.prenotazione.id));

  console.log('A) La prenotazione riesce anche senza email configurata');
  esito(riuscite.length >= 1, 'almeno una prenotazione salvata');

  console.log('\nB) Corsa sullo stesso slot');
  esito(
    riuscite.length === 1,
    'una sola prenotazione riuscita',
    `riuscite: ${riuscite.length} su ${RICHIESTE_IN_PARALLELO}`,
  );
  esito(
    respinte.every((r) => r.codice === 'slot_non_disponibile'),
    'le altre respinte con slot_non_disponibile',
    [...new Set(respinte.map((r) => r.codice))].join(', ') || '—',
  );
  esito(
    respinte.every((r) => Array.isArray(r.alternative) && r.alternative.length > 0),
    'a chi resta fuori vengono proposte alternative',
  );

  // Controllo diretto: i fermi devono essere tanti quanti i passi da 5
  // minuti della durata, e devono puntare tutti alla stessa prenotazione.
  if (riuscite.length === 1) {
    const durata = servizi.docs[0].get('durata_minuti');
    const fermi = await admin
      .collection('blocchi')
      .where('prenotazione_id', '==', riuscite[0].prenotazione.id)
      .get();
    esito(
      fermi.size === durata / 5,
      'i fermi coprono esattamente la durata',
      `${fermi.size} fermi per ${durata} minuti`,
    );
  }
}

principale()
  .catch((e) => {
    console.error('\nIl test si è rotto:', e.message);
    fallito = true;
  })
  .finally(async () => {
    for (const id of creati) {
      const fermi = await admin.collection('blocchi').where('prenotazione_id', '==', id).get();
      const lotto = admin.batch();
      fermi.docs.forEach((d) => lotto.delete(d.ref));
      lotto.delete(admin.collection('prenotazioni').doc(id));
      await lotto.commit().catch(() => {});
    }
    console.log(fallito ? '\nQualcosa non va: vedi le righe FAIL.' : '\nTutto a posto.');
    process.exit(fallito ? 1 : 0);
  });
