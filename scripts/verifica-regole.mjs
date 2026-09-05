// Verifica "vera" delle regole Firestore — l'erede di verifica-rls.mjs.
//
// Il punto è lo stesso di prima: zero righe lette non dimostra niente, il
// database potrebbe essere semplicemente vuoto. Quindi prima si scrive una
// prenotazione finta con l'Admin SDK (che le regole non le guarda), poi si
// prova a leggerla come un visitatore qualunque. Deve essere rifiutata.
// Alla fine si ripulisce sempre, anche se un controllo fallisce.
//
// Uso:
//   set GOOGLE_APPLICATION_CREDENTIALS=chiave-servizio.json
//   node --env-file=.env scripts/verifica-regole.mjs

import { applicationDefault, initializeApp as initAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp as initClient } from 'firebase/app';
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  query,
  where,
} from 'firebase/firestore';

const configurazioneClient = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!configurazioneClient.apiKey || !configurazioneClient.projectId) {
  console.error('Mancano le VITE_FIREBASE_* nell\'ambiente (.env).');
  process.exit(1);
}

initAdmin({
  credential: applicationDefault(),
  projectId: configurazioneClient.projectId,
});
const admin = getAdminFirestore();
const anonimo = getFirestore(initClient(configurazioneClient));

let fallito = false;

function esito(ok, etichetta, dettaglio) {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${etichetta}${dettaglio ? ' — ' + dettaglio : ''}`);
  if (!ok) fallito = true;
}

/** Vero se la lettura è stata rifiutata dalle regole. */
async function vietato(descrizione, esegui) {
  try {
    const r = await esegui();
    esito(false, descrizione, `lettura riuscita (${r?.size ?? '?'} documenti)`);
  } catch (e) {
    const negato = String(e.code ?? e.message).includes('permission-denied');
    esito(negato, descrizione, negato ? 'permission-denied, come deve' : e.message);
  }
}

async function permesso(descrizione, esegui) {
  try {
    await esegui();
    esito(true, descrizione);
  } catch (e) {
    esito(false, descrizione, e.message);
  }
}

const traccianti = [];

async function principale() {
  // --- Semina: una prenotazione vera, con nome e telefono finti ---
  const prenotazione = admin.collection('prenotazioni').doc();
  const inizio = new Date(Date.now() + 7 * 86_400_000);
  await prenotazione.set({
    operatore_id: 'verifica',
    servizio_id: 'verifica',
    cliente_nome: 'Verifica Regole',
    cliente_cognome: null,
    cliente_telefono: '+39000000000',
    cliente_email: null,
    inizio: Timestamp.fromDate(inizio),
    fine: Timestamp.fromDate(new Date(inizio.getTime() + 1_800_000)),
    stato: 'confermata',
    origine: 'sito',
    forzata: false,
    note: null,
    creata_il: Timestamp.now(),
  });
  traccianti.push(prenotazione);

  const blocco = admin.collection('blocchi').doc(`verifica_${Date.now()}`);
  await blocco.set({ prenotazione_id: prenotazione.id, operatore_id: 'verifica' });
  traccianti.push(blocco);

  const assenza = admin.collection('assenze').doc();
  await assenza.set({
    operatore_id: 'verifica',
    inizio: Timestamp.fromDate(inizio),
    fine: Timestamp.fromDate(new Date(inizio.getTime() + 3_600_000)),
    motivo: 'verifica',
  });
  traccianti.push(assenza);

  console.log('\nQuello che il pubblico NON deve poter leggere:\n');
  await vietato('prenotazioni', () => getDocs(query(collection(anonimo, 'prenotazioni'), limit(1))));
  await vietato('blocchi', () => getDocs(query(collection(anonimo, 'blocchi'), limit(1))));
  await vietato('assenze', () => getDocs(query(collection(anonimo, 'assenze'), limit(1))));
  await vietato('orari_operatore', () =>
    getDocs(query(collection(anonimo, 'orari_operatore'), limit(1))),
  );
  await vietato('chiusure_salone', () =>
    getDocs(query(collection(anonimo, 'chiusure_salone'), limit(1))),
  );
  await vietato('profili', () => getDocs(query(collection(anonimo, 'profili'), limit(1))));

  // Senza il filtro sull'attivo la query non è dimostrabilmente sicura:
  // Firestore la rifiuta in blocco. È il comportamento atteso, ed è il
  // motivo per cui le letture pubbliche stanno tutte in src/lib/db.ts.
  await vietato('servizi senza where(attivo)', () =>
    getDocs(query(collection(anonimo, 'servizi'), limit(1))),
  );

  console.log('\nQuello che il pubblico DEVE poter leggere:\n');
  await permesso('servizi attivi', () =>
    getDocs(query(collection(anonimo, 'servizi'), where('attivo', '==', true), limit(1))),
  );
  await permesso('operatori attivi', () =>
    getDocs(query(collection(anonimo, 'operatori'), where('attivo', '==', true), limit(1))),
  );
  await permesso('operatori_servizi', () =>
    getDocs(query(collection(anonimo, 'operatori_servizi'), limit(1))),
  );
  await permesso('orari_salone', () => getDocs(query(collection(anonimo, 'orari_salone'), limit(1))));
}

principale()
  .catch((e) => {
    console.error('\nLa verifica si è rotta:', e.message);
    fallito = true;
  })
  .finally(async () => {
    for (const t of traccianti) await t.delete().catch(() => {});
    console.log(fallito ? '\nQualcosa non va: vedi le righe FAIL.' : '\nTutto a posto.');
    process.exit(fallito ? 1 : 0);
  });
