// Dati iniziali del salone — l'equivalente di schema.sql § 11.
//
// Da correggere col listino e gli orari veri prima di andare online: questi
// sono segnaposto, esattamente come lo erano nello schema Postgres.
//
// Uso:
//   set GOOGLE_APPLICATION_CREDENTIALS=chiave-servizio.json
//   node scripts/semina-firestore.mjs
//
// Contro l'emulatore:
//   set FIRESTORE_EMULATOR_HOST=localhost:8080
//   node scripts/semina-firestore.mjs
//
// È idempotente: gli ID dei documenti sono scritti a mano, quindi rilanciarlo
// riscrive le stesse righe invece di duplicarle.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const progetto = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID;
const suEmulatore = !!process.env.FIRESTORE_EMULATOR_HOST;

initializeApp(
  suEmulatore
    ? { projectId: progetto ?? 'salone-solarino' }
    : { credential: applicationDefault(), projectId: progetto },
);
const db = getFirestore();

const OPERATORI = [
  { id: 'operatore-1', nome: 'Operatore 1', colore: '#2563eb', ordine: 1 },
  { id: 'operatore-2', nome: 'Operatore 2', colore: '#16a34a', ordine: 2 },
  { id: 'operatrice-1', nome: 'Operatrice 1', colore: '#db2777', ordine: 3 },
];

const SERVIZI = [
  { id: 'taglio-uomo', nome: 'Taglio uomo', durata_minuti: 30, prezzo_cent: 1500, categoria: 'uomo', ordine: 1 },
  { id: 'taglio-barba', nome: 'Taglio + barba', durata_minuti: 45, prezzo_cent: 2500, categoria: 'uomo', ordine: 2 },
  { id: 'barba', nome: 'Barba', durata_minuti: 15, prezzo_cent: 800, categoria: 'uomo', ordine: 3 },
  { id: 'taglio-donna', nome: 'Taglio donna', durata_minuti: 60, prezzo_cent: 3000, categoria: 'donna', ordine: 4 },
  { id: 'piega', nome: 'Piega', durata_minuti: 45, prezzo_cent: 2000, categoria: 'donna', ordine: 5 },
];

// Martedì-sabato, mattina e pomeriggio. Chiuso domenica (0) e lunedì (1).
const GIORNI_LAVORATIVI = [2, 3, 4, 5, 6];
const FASCE = [
  { ora_inizio: '09:00', ora_fine: '13:00' },
  { ora_inizio: '15:30', ora_fine: '19:30' },
];

async function semina() {
  const lotto = db.batch();

  for (const o of OPERATORI) {
    const { id, ...campi } = o;
    lotto.set(db.collection('operatori').doc(id), {
      ...campi,
      attivo: true,
      creato_il: Timestamp.now(),
    });
  }

  for (const s of SERVIZI) {
    const { id, ...campi } = s;
    lotto.set(db.collection('servizi').doc(id), {
      ...campi,
      descrizione: null,
      attivo: true,
      creato_il: Timestamp.now(),
    });
  }

  // Chi fa cosa: gli uomini fanno i servizi da uomo, l'operatrice quelli da
  // donna. Il genere resta un attributo del SERVIZIO (CLAUDE.md § 4): qui si
  // decide solo chi lo esegue, ed è modificabile dal pannello.
  const abbinamenti = [
    ['operatore-1', 'taglio-uomo'],
    ['operatore-1', 'taglio-barba'],
    ['operatore-1', 'barba'],
    ['operatore-2', 'taglio-uomo'],
    ['operatore-2', 'taglio-barba'],
    ['operatore-2', 'barba'],
    ['operatrice-1', 'taglio-donna'],
    ['operatrice-1', 'piega'],
  ];
  for (const [operatoreId, servizioId] of abbinamenti) {
    lotto.set(db.collection('operatori_servizi').doc(`${operatoreId}_${servizioId}`), {
      operatore_id: operatoreId,
      servizio_id: servizioId,
    });
  }

  for (const o of OPERATORI) {
    for (const giorno of GIORNI_LAVORATIVI) {
      for (const [i, f] of FASCE.entries()) {
        lotto.set(db.collection('orari_operatore').doc(`${o.id}_${giorno}_${i}`), {
          operatore_id: o.id,
          giorno,
          ...f,
        });
      }
    }
  }

  for (const giorno of GIORNI_LAVORATIVI) {
    for (const [i, f] of FASCE.entries()) {
      lotto.set(db.collection('orari_salone').doc(`${giorno}_${i}`), { giorno, ...f });
    }
  }

  await lotto.commit();
  console.log(
    `Seminati ${OPERATORI.length} operatori, ${SERVIZI.length} servizi, ` +
      `${abbinamenti.length} abbinamenti e gli orari di ${GIORNI_LAVORATIVI.length} giorni.`,
  );
  console.log('Ricorda: sono segnaposto. Listino e orari veri vanno messi dal pannello.');
}

semina().catch((e) => {
  console.error('Semina fallita:', e.message);
  process.exit(1);
});
