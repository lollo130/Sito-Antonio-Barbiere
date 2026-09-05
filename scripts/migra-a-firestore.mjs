// Travaso dei dati da Supabase a Firestore.
//
// Si legge da Supabase via REST con la service_role key (niente
// @supabase/supabase-js: il pacchetto è stato tolto dal progetto, e per
// leggere sette tabelle basta fetch) e si scrive con l'Admin SDK.
//
// Gli ID dei documenti sono gli stessi UUID di Postgres, così i riferimenti
// fra tabelle continuano a funzionare senza rimappature.
//
// COSA NON VIENE MIGRATO, e perché:
//  - `profili`: gli uid di Supabase Auth non valgono su Firebase Auth. Gli
//    account admin vanno ricreati con scripts/crea-admin.mjs;
//  - i `blocchi` non esistevano: qui vengono COSTRUITI dalle prenotazioni
//    che occupano davvero uno slot. Senza questo passaggio le prenotazioni
//    migrate non impedirebbero nuove prenotazioni sopra di loro.
//
// Uso:
//   set GOOGLE_APPLICATION_CREDENTIALS=chiave-servizio.json
//   node --env-file=.env scripts/migra-a-firestore.mjs
//
// Con --prova non scrive niente: dice solo cosa farebbe.

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const PROVA = process.argv.includes('--prova');
const PASSO_BLOCCO_MINUTI = 5;
const STATI_OCCUPANTI = ['confermata', 'completata'];

const urlSupabase = process.env.VITE_SUPABASE_URL;
const chiaveServizio = process.env.SUPABASE_SERVICE_ROLE_KEY;
const progetto = process.env.VITE_FIREBASE_PROJECT_ID;

if (!urlSupabase || !chiaveServizio || !progetto) {
  console.error(
    'Servono VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e VITE_FIREBASE_PROJECT_ID (.env).',
  );
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: progetto });
const db = getFirestore();

async function leggiTabella(tabella) {
  const risposta = await fetch(`${urlSupabase}/rest/v1/${tabella}?select=*`, {
    headers: {
      apikey: chiaveServizio,
      Authorization: `Bearer ${chiaveServizio}`,
    },
  });
  if (!risposta.ok) {
    throw new Error(`Lettura di ${tabella} fallita: ${risposta.status} ${await risposta.text()}`);
  }
  return risposta.json();
}

const quando = (v) => (v ? Timestamp.fromDate(new Date(v)) : null);
const oraBreve = (v) => (typeof v === 'string' ? v.slice(0, 5) : v);

/** Scrive a lotti da 400: il limite di un batch Firestore è 500. */
async function scriviTutti(descrizione, righe) {
  if (PROVA) {
    console.log(`  [prova] ${descrizione}: ${righe.length} documenti`);
    return;
  }
  for (let i = 0; i < righe.length; i += 400) {
    const lotto = db.batch();
    righe.slice(i, i + 400).forEach(({ ref, dati }) => lotto.set(ref, dati));
    await lotto.commit();
  }
  console.log(`  ${descrizione}: ${righe.length} documenti`);
}

async function migra() {
  console.log(PROVA ? '\nProva a vuoto, non scrivo niente.\n' : '\nTravaso in corso.\n');

  // --- Catalogo ---
  const operatori = await leggiTabella('operatori');
  await scriviTutti(
    'operatori',
    operatori.map((o) => ({
      ref: db.collection('operatori').doc(o.id),
      dati: {
        nome: o.nome,
        colore: o.colore ?? '#888888',
        ordine: o.ordine ?? 0,
        attivo: o.attivo !== false,
        creato_il: quando(o.creato_il) ?? Timestamp.now(),
      },
    })),
  );

  const servizi = await leggiTabella('servizi');
  await scriviTutti(
    'servizi',
    servizi.map((s) => ({
      ref: db.collection('servizi').doc(s.id),
      dati: {
        nome: s.nome,
        descrizione: s.descrizione ?? null,
        durata_minuti: s.durata_minuti,
        prezzo_cent: s.prezzo_cent,
        categoria: s.categoria,
        ordine: s.ordine ?? 0,
        attivo: s.attivo !== false,
        creato_il: quando(s.creato_il) ?? Timestamp.now(),
      },
    })),
  );

  const abbinamenti = await leggiTabella('operatori_servizi');
  await scriviTutti(
    'operatori_servizi',
    abbinamenti.map((a) => ({
      ref: db.collection('operatori_servizi').doc(`${a.operatore_id}_${a.servizio_id}`),
      dati: { operatore_id: a.operatore_id, servizio_id: a.servizio_id },
    })),
  );

  // --- Orari e chiusure ---
  const orariOperatore = await leggiTabella('orari_operatore');
  await scriviTutti(
    'orari_operatore',
    orariOperatore.map((o) => ({
      ref: db.collection('orari_operatore').doc(o.id),
      dati: {
        operatore_id: o.operatore_id,
        giorno: o.giorno,
        ora_inizio: oraBreve(o.ora_inizio),
        ora_fine: oraBreve(o.ora_fine),
      },
    })),
  );

  const orariSalone = await leggiTabella('orari_salone');
  await scriviTutti(
    'orari_salone',
    orariSalone.map((o) => ({
      ref: db.collection('orari_salone').doc(o.id),
      dati: {
        giorno: o.giorno,
        ora_inizio: oraBreve(o.ora_inizio),
        ora_fine: oraBreve(o.ora_fine),
      },
    })),
  );

  const assenze = await leggiTabella('assenze');
  await scriviTutti(
    'assenze',
    assenze.map((a) => ({
      ref: db.collection('assenze').doc(a.id),
      dati: {
        operatore_id: a.operatore_id,
        inizio: quando(a.inizio),
        fine: quando(a.fine),
        motivo: a.motivo ?? null,
      },
    })),
  );

  const chiusure = await leggiTabella('chiusure_salone');
  await scriviTutti(
    'chiusure_salone',
    chiusure.map((c) => ({
      ref: db.collection('chiusure_salone').doc(c.id),
      dati: { inizio: quando(c.inizio), fine: quando(c.fine), motivo: c.motivo ?? null },
    })),
  );

  // --- Prenotazioni ---
  const prenotazioni = await leggiTabella('prenotazioni');
  await scriviTutti(
    'prenotazioni',
    prenotazioni.map((p) => ({
      ref: db.collection('prenotazioni').doc(p.id),
      dati: {
        operatore_id: p.operatore_id,
        servizio_id: p.servizio_id,
        cliente_nome: p.cliente_nome,
        cliente_cognome: p.cliente_cognome ?? null,
        cliente_telefono: p.cliente_telefono,
        cliente_email: p.cliente_email ?? null,
        inizio: quando(p.inizio),
        fine: quando(p.fine),
        stato: p.stato,
        origine: p.origine ?? 'sito',
        forzata: p.forzata === true,
        note: p.note ?? null,
        creata_il: quando(p.creata_il) ?? Timestamp.now(),
      },
    })),
  );

  // --- I fermi, ricostruiti ---
  // Solo per le prenotazioni che in Postgres rientravano nel `where` del
  // vincolo: stato confermata/completata e non forzata.
  const fermi = [];
  const fuoriGriglia = [];
  for (const p of prenotazioni) {
    if (!STATI_OCCUPANTI.includes(p.stato) || p.forzata === true) continue;
    const inizio = new Date(p.inizio);
    const fine = new Date(p.fine);

    if (inizio.getUTCSeconds() !== 0 || inizio.getUTCMinutes() % PASSO_BLOCCO_MINUTI !== 0) {
      fuoriGriglia.push(p.id);
      continue;
    }

    const passi = Math.round((fine.getTime() - inizio.getTime()) / (PASSO_BLOCCO_MINUTI * 60_000));
    for (let i = 0; i < passi; i++) {
      const istante = new Date(inizio.getTime() + i * PASSO_BLOCCO_MINUTI * 60_000);
      const chiave = istante.toISOString().slice(0, 16).replace(/[-:T]/g, '');
      fermi.push({
        ref: db.collection('blocchi').doc(`${p.operatore_id}_${chiave}`),
        dati: {
          prenotazione_id: p.id,
          operatore_id: p.operatore_id,
          istante: Timestamp.fromDate(istante),
        },
      });
    }
  }
  await scriviTutti('blocchi (ricostruiti)', fermi);

  console.log('\nFatto.');
  if (fuoriGriglia.length > 0) {
    console.log(
      `\nATTENZIONE: ${fuoriGriglia.length} prenotazioni non cadono sulla griglia dei ` +
        `${PASSO_BLOCCO_MINUTI} minuti e sono rimaste senza fermo. Restano in agenda e si ` +
        'vedono nel pannello, ma non impediscono una nuova prenotazione sopra di loro. ' +
        'Vanno sistemate a mano:',
    );
    fuoriGriglia.forEach((id) => console.log(`  ${id}`));
  }
  console.log('\nGli account admin non si migrano: ricreali con scripts/crea-admin.mjs.');
}

migra().catch((e) => {
  console.error('\nTravaso fallito:', e.message);
  process.exit(1);
});
