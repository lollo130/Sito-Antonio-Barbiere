// Verifica della funzione `agendaGiorno`: crea una prenotazione vera con
// l'Admin SDK, controlla che il pubblico veda quell'orario come occupato
// SENZA sapere di chi, e che gli altri orari restino liberi. Ripulisce
// sempre, anche se un controllo fallisce.
//
// È il controllo che tiene onesta la promessa di CLAUDE.md § 2: il sito
// mostra un'agenda vera, ma non fa trapelare né nomi di clienti né a quale
// operatore appartiene un buco.
//
// Uso:
//   set GOOGLE_APPLICATION_CREDENTIALS=chiave-servizio.json
//   node --env-file=.env scripts/verifica-agenda-giorno.mjs

import { applicationDefault, initializeApp as initAdmin } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp as initClient } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
const db = getFirestore();
const agendaGiorno = httpsCallable(
  getFunctions(initClient(configurazione), REGIONE),
  'agendaGiorno',
);

let fallito = false;
function esito(ok, etichetta, dettaglio) {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${etichetta}${dettaglio ? ' — ' + dettaglio : ''}`);
  if (!ok) fallito = true;
}

const giornoDi = (iso) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));

let creata = null;

async function principale() {
  const servizi = await db.collection('servizi').where('attivo', '==', true).limit(1).get();
  if (servizi.empty) {
    console.error('Nessun servizio attivo: lancia prima scripts/semina-firestore.mjs.');
    process.exit(1);
  }
  const servizio = servizi.docs[0];
  const durata = servizio.get('durata_minuti');

  // Un giorno con almeno due orari liberi: uno lo occupiamo, l'altro deve
  // restare libero.
  const oggi = new Date();
  let giorno = null;
  let righePrima = [];
  for (let g = 1; g < 30 && !giorno; g++) {
    const candidato = new Date(oggi.getTime() + g * 86_400_000).toISOString().slice(0, 10);
    const { data } = await agendaGiorno({ servizio_id: servizio.id, data: candidato });
    if ((data.righe ?? []).filter((r) => r.libero).length >= 2) {
      giorno = candidato;
      righePrima = data.righe;
    }
  }
  if (!giorno) {
    console.error('Non trovo un giorno con due orari liberi: controlla orari e assenze.');
    process.exit(1);
  }

  const liberiPrima = righePrima.filter((r) => r.libero);
  const bersaglio = liberiPrima[0];
  const testimone = liberiPrima[liberiPrima.length - 1];
  console.log(`\nGiorno di prova: ${giorno}`);
  console.log(`Occupo ${bersaglio.inizio}, tengo d'occhio ${testimone.inizio}\n`);

  // Chi è libero a quell'ora? Serve un operatore vero, altrimenti il fermo
  // non corrisponde a nessuno e l'agenda non cambia.
  const abbinamenti = await db
    .collection('operatori_servizi')
    .where('servizio_id', '==', servizio.id)
    .get();
  const operatoreId = abbinamenti.docs[0]?.get('operatore_id');
  if (!operatoreId) {
    console.error('Nessun operatore abbinato al servizio.');
    process.exit(1);
  }

  const inizio = new Date(bersaglio.inizio);
  const fine = new Date(inizio.getTime() + durata * 60_000);
  creata = db.collection('prenotazioni').doc();
  await creata.set({
    operatore_id: operatoreId,
    servizio_id: servizio.id,
    cliente_nome: 'Verifica Agenda',
    cliente_cognome: null,
    cliente_telefono: '+39000000000',
    cliente_email: null,
    inizio: Timestamp.fromDate(inizio),
    fine: Timestamp.fromDate(fine),
    stato: 'confermata',
    origine: 'manuale',
    forzata: false,
    note: null,
    creata_il: Timestamp.now(),
  });

  const { data: dopo } = await agendaGiorno({ servizio_id: servizio.id, data: giorno });
  const righeDopo = dopo.righe ?? [];
  const rigaBersaglio = righeDopo.find((r) => r.inizio === bersaglio.inizio);
  const rigaTestimone = righeDopo.find((r) => r.inizio === testimone.inizio);

  // Se al servizio è abbinato più di un operatore, l'orario resta libero
  // perché lo copre l'altro: in quel caso si controlla solo che l'agenda
  // continui a rispondere e che nessun nome trapeli.
  const operatoriAbbinati = new Set(abbinamenti.docs.map((d) => d.get('operatore_id'))).size;
  if (operatoriAbbinati === 1) {
    esito(rigaBersaglio?.libero === false, "l'orario prenotato risulta occupato");
  } else {
    esito(
      !!rigaBersaglio,
      `l'orario resta libero: al servizio sono abbinati ${operatoriAbbinati} operatori`,
    );
  }
  esito(rigaTestimone?.libero === true, 'gli altri orari restano liberi');
  esito(
    righeDopo.every((r) => r.operatore_nome !== 'Verifica Agenda'),
    'nessun nome di cliente esce dall\'agenda',
  );
  esito(
    righeDopo.every((r) => r.libero || r.operatore_nome === null),
    'gli orari occupati non dicono di chi sono',
  );
  esito(giornoDi(bersaglio.inizio) === giorno, 'gli istanti sono nel giorno chiesto (Europe/Rome)');
}

principale()
  .catch((e) => {
    console.error('\nLa verifica si è rotta:', e.message);
    fallito = true;
  })
  .finally(async () => {
    if (creata) await creata.delete().catch(() => {});
    console.log(fallito ? '\nQualcosa non va: vedi le righe FAIL.' : '\nTutto a posto.');
    process.exit(fallito ? 1 : 0);
  });
