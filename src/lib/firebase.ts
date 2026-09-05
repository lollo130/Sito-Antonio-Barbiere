import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Configurazione Firebase. Queste chiavi sono PUBBLICHE per progetto: non
// sono un segreto, finiscono nel bundle come ci finiva la anon key di
// Supabase. Quello che tiene chiuso il database sono le regole in
// firestore.rules, non queste stringhe.
const configurazione = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!configurazione.apiKey || !configurazione.projectId) {
  // Vite sostituisce queste variabili al momento della build, non a runtime:
  // se mancano nell'ambiente che compila, finiscono nel bundle come
  // undefined. In locale arrivano da .env; su Firebase Hosting vanno messe
  // fra le variabili d'ambiente del sistema di build, perché .env non sta
  // nel repository.
  throw new Error(
    'Mancano le variabili VITE_FIREBASE_* (vedi .env.example). In locale: file .env. In produzione: variabili d\'ambiente della build, poi ricompilare.',
  );
}

export const app = initializeApp(configurazione);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Stessa regione dichiarata in functions/src/index.ts. Se cambia una, va
// cambiata l'altra, altrimenti le chiamate finiscono a us-central1 e
// rispondono 404.
export const functions = getFunctions(app, 'europe-west1');

/**
 * Chiamata a una Cloud Function. Le funzioni del salone rispondono sempre
 * con un oggetto: `{ ok: true, ... }` oppure `{ ok: false, codice, errore }`.
 * Gli esiti previsti (slot appena preso, limite per telefono) NON arrivano
 * come eccezione: arrivano qui dentro, già scritti in italiano.
 */
export async function chiama<Richiesta, Risposta>(
  nome: string,
  dati: Richiesta,
): Promise<Risposta> {
  // 15 secondi invece dei 70 di serie: dopo un quarto di minuto senza
  // risposta, a chi sta guardando il telefono conviene un messaggio con il
  // numero del salone, non un'altra attesa.
  const funzione = httpsCallable<Richiesta, Risposta>(functions, nome, { timeout: 15_000 });
  const esito = await funzione(dati);
  return esito.data;
}
