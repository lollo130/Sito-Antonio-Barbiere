// Dà a un account l'accesso al pannello.
//
// `profili` non è scrivibile da nessun client (firestore.rules): è la
// collezione che decide chi è admin, e se la potesse scrivere il browser non
// deciderebbe più niente. Si popola da qui, con l'Admin SDK.
//
// Uso:
//   set GOOGLE_APPLICATION_CREDENTIALS=chiave-servizio.json
//   node scripts/crea-admin.mjs titolare@esempio.it "password-lunga"
//
// Se l'account esiste già, non lo tocca: aggiunge solo il profilo.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [email, password] = process.argv.slice(2);
if (!email) {
  console.error('Uso: node scripts/crea-admin.mjs <email> [password]');
  process.exit(1);
}

const progetto = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID;
const suEmulatore = !!process.env.FIRESTORE_EMULATOR_HOST;

initializeApp(
  suEmulatore
    ? { projectId: progetto ?? 'salone-solarino' }
    : { credential: applicationDefault(), projectId: progetto },
);

const auth = getAuth();
const db = getFirestore();

async function principale() {
  let utente;
  try {
    utente = await auth.getUserByEmail(email);
    console.log(`Account già esistente: ${utente.uid}`);
  } catch {
    if (!password) {
      console.error("L'account non esiste: serve anche la password per crearlo.");
      process.exit(1);
    }
    utente = await auth.createUser({ email, password });
    console.log(`Account creato: ${utente.uid}`);
  }

  await db.collection('profili').doc(utente.uid).set({ ruolo: 'admin' });
  console.log(`${email} adesso entra nel pannello /admin.`);
}

principale().catch((e) => {
  console.error('Non ha funzionato:', e.message);
  process.exit(1);
});
