// Test end-to-end della edge function `prenota`, contro il progetto Supabase
// reale collegato. Copre i due punti delicati della SPECIFICA.md § 8:
//
//  A) un fallimento nell'invio email non deve mai far fallire la prenotazione
//     (qui il segreto RESEND_API_KEY non è configurato sulla function: ogni
//     invio fallirà per forza, quindi se la prenotazione va a buon fine
//     comunque, il punto è dimostrato).
//  B) più prenotazioni concorrenti sullo stesso slot+operatore: una sola deve
//     riuscire, le altre devono ricevere 3 alternative (codice
//     'slot_non_disponibile'), MAI un errore generico/500 — è quello il
//     percorso che gestisce l'errore 23P01 del vincolo no_overlap.
//
// Uso: node --env-file=.env scripts/test-prenota.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('Mancano VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY (.env).');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const FUNCTION_URL = `${url}/functions/v1/prenota`;
const RUN_ID = Date.now().toString().slice(-6);

let fallito = false;
function esito(ok, etichetta, dettaglio) {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${etichetta}${dettaglio ? ' — ' + dettaglio : ''}`);
  if (!ok) fallito = true;
}

function prossimoGiornoValido(minGiorni) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + minGiorni);
  while (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
// Agosto: Europe/Rome è ancora in ora legale (+02:00).
const ts = (dataStr, ora) => new Date(`${dataStr}T${ora}:00+02:00`).toISOString();

async function chiamaPrenota(corpo) {
  const risposta = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}`, apikey: anonKey },
    body: JSON.stringify(corpo),
  });
  const testo = await risposta.text();
  let corpoRisposta;
  try {
    corpoRisposta = JSON.parse(testo);
  } catch {
    corpoRisposta = { _testoGrezzo: testo };
  }
  return { status: risposta.status, corpo: corpoRisposta };
}

async function main() {
  const { data: operatori } = await admin.from('operatori').select('*').order('ordine');
  const { data: servizi } = await admin.from('servizi').select('*').order('ordine');
  const [op1, op2, op3] = operatori;
  const serviziUomo = servizi.filter((s) => s.categoria === 'uomo');
  const serviziDonna = servizi.filter((s) => s.categoria === 'donna');
  const servizioTest = serviziUomo[0]; // "Taglio uomo", 30 minuti

  const pulizia = { operatoriServizi: [], orariIds: [], prenotazioniIds: [] };

  try {
    // --- seed: chi fa cosa + orari settimanali (come in verifica-rls.mjs) ---
    const opServRows = [
      ...serviziUomo.flatMap((s) => [op1, op2].map((o) => ({ operatore_id: o.id, servizio_id: s.id }))),
      ...serviziDonna.map((s) => ({ operatore_id: op3.id, servizio_id: s.id })),
    ];
    const { error: opServErr } = await admin.from('operatori_servizi').insert(opServRows);
    if (opServErr) throw new Error(`Seed operatori_servizi fallito: ${opServErr.message}`);
    pulizia.operatoriServizi = opServRows;

    const orariRows = [];
    for (const o of operatori) {
      for (let giorno = 1; giorno <= 6; giorno++) {
        orariRows.push({ operatore_id: o.id, giorno, ora_inizio: '09:00', ora_fine: '13:00' });
        orariRows.push({ operatore_id: o.id, giorno, ora_inizio: '15:00', ora_fine: '19:00' });
      }
    }
    const { data: orariInseriti, error: orariErr } = await admin
      .from('orari_operatore')
      .insert(orariRows)
      .select('id');
    if (orariErr) throw new Error(`Seed orari_operatore fallito: ${orariErr.message}`);
    pulizia.orariIds = orariInseriti.map((r) => r.id);
    esito(true, 'seed: operatori_servizi + orari_operatore pronti', `${opServRows.length + orariRows.length} righe`);

    const dataTest = prossimoGiornoValido(2);

    // -----------------------------------------------------------------
    // A) l'email non deve mai far fallire la prenotazione
    // -----------------------------------------------------------------
    {
      const risposta = await chiamaPrenota({
        servizio_id: servizioTest.id,
        operatore_id: op1.id,
        inizio: ts(dataTest, '10:00'),
        cliente_nome: 'Prova Email',
        cliente_telefono: `+39 333 5${RUN_ID}1`,
      });
      const ok = risposta.status === 200 && risposta.corpo.ok === true && !!risposta.corpo.prenotazione?.id;
      esito(
        ok,
        'A) prenotazione riuscita nonostante RESEND_API_KEY non configurato (email fallita)',
        ok ? `id ${risposta.corpo.prenotazione.id}` : JSON.stringify(risposta.corpo),
      );
      if (risposta.corpo?.prenotazione?.id) pulizia.prenotazioniIds.push(risposta.corpo.prenotazione.id);
    }

    // -----------------------------------------------------------------
    // B) N prenotazioni concorrenti sullo stesso operatore+slot
    // -----------------------------------------------------------------
    {
      const N = 5;
      const inizioConteso = ts(dataTest, '12:00');
      const richieste = Array.from({ length: N }, (_, i) =>
        chiamaPrenota({
          servizio_id: servizioTest.id,
          operatore_id: op1.id,
          inizio: inizioConteso,
          cliente_nome: `Prova Concorrenza ${i}`,
          cliente_telefono: `+39 333 6${RUN_ID}${i}`,
        }),
      );
      const risultati = await Promise.all(richieste);

      risultati.forEach((r, i) => {
        console.log(`      richiesta ${i}: status ${r.status}, ok=${r.corpo.ok}, codice=${r.corpo.codice ?? '-'}`);
        if (r.corpo?.prenotazione?.id) pulizia.prenotazioniIds.push(r.corpo.prenotazione.id);
      });

      const successi = risultati.filter((r) => r.corpo.ok === true);
      const falliti = risultati.filter((r) => r.corpo.ok !== true);

      esito(successi.length === 1, 'B) esattamente una richiesta su 5 riesce', `${successi.length} riuscite`);

      const nessunErroreGenerico = falliti.every((r) => r.corpo.codice !== 'errore' && r.status !== 500);
      esito(nessunErroreGenerico, 'B) nessuna delle perdenti riceve un errore generico/500', `codici: ${falliti.map((r) => r.corpo.codice).join(', ')}`);

      const tutteConAlternative = falliti.every(
        (r) => r.corpo.codice === 'slot_non_disponibile' && Array.isArray(r.corpo.alternative) && r.corpo.alternative.length > 0,
      );
      esito(tutteConAlternative, 'B) tutte le perdenti ricevono 3 slot alternativi', `esempio: ${JSON.stringify(falliti[0]?.corpo.alternative?.slice(0, 1))}`);
    }
  } finally {
    // ---------------------------------------------------------------
    // Pulizia dati di prova, sempre
    // ---------------------------------------------------------------
    if (pulizia.prenotazioniIds.length) {
      const { error } = await admin.from('prenotazioni').delete().in('id', pulizia.prenotazioniIds);
      esito(!error, 'pulizia: prenotazioni di prova cancellate', error?.message ?? `${pulizia.prenotazioniIds.length} righe`);
    }
    if (pulizia.orariIds.length) {
      const { error } = await admin.from('orari_operatore').delete().in('id', pulizia.orariIds);
      esito(!error, 'pulizia: orari_operatore di prova cancellati', error?.message ?? `${pulizia.orariIds.length} righe`);
    }
    for (const { operatore_id, servizio_id } of pulizia.operatoriServizi) {
      const { error } = await admin.from('operatori_servizi').delete().match({ operatore_id, servizio_id });
      if (error) esito(false, 'pulizia: operatori_servizi', error.message);
    }
    if (pulizia.operatoriServizi.length) {
      esito(true, 'pulizia: operatori_servizi di prova cancellati', `${pulizia.operatoriServizi.length} righe`);
    }
  }

  console.log('\n' + (fallito ? 'RISULTATO: uno o più controlli falliti.' : 'RISULTATO: tutti i controlli superati.'));
  process.exit(fallito ? 1 : 0);
}

main().catch((e) => {
  console.error('Errore inatteso:', e.message);
  process.exit(1);
});
