// Verifica RLS "vera": prima semina dati reali con la service_role key
// (altrimenti 0 righe non dimostra che l'RLS blocchi qualcosa), poi
// controlla con la sola anon key. Ripulisce sempre, anche se un
// controllo fallisce.
//
// Uso: node --env-file=.env scripts/verifica-rls.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    'Mancano VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY nell\'ambiente (.env).',
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let fallito = false;

function esito(ok, etichetta, dettaglio) {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${etichetta}${dettaglio ? ' — ' + dettaglio : ''}`);
  if (!ok) fallito = true;
}

// Prossimo giorno feriale per il salone (lun-sab, cioè dow 1..6),
// almeno `minGiorni` giorni nel futuro.
function prossimoGiornoValido(minGiorni) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + minGiorni);
  while (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Agosto: Europe/Rome è ancora in ora legale (+02:00).
function ts(dataStr, ora) {
  return `${dataStr}T${ora}:00+02:00`;
}

async function main() {
  // ---------------------------------------------------------------
  // 1. SEMINA con la service_role key
  // ---------------------------------------------------------------
  const { data: operatori, error: opErr } = await admin
    .from('operatori')
    .select('*')
    .order('ordine');
  if (opErr || !operatori || operatori.length < 3) {
    throw new Error(`Impossibile leggere operatori di base: ${opErr?.message ?? 'dati insufficienti'}`);
  }
  const { data: servizi, error: servErr } = await admin.from('servizi').select('*').order('ordine');
  if (servErr || !servizi) throw new Error(`Impossibile leggere servizi di base: ${servErr?.message}`);

  const [op1, op2, op3] = operatori;
  const serviziUomo = servizi.filter((s) => s.categoria === 'uomo');
  const serviziDonna = servizi.filter((s) => s.categoria === 'donna');
  const servizioUomo = serviziUomo[0];

  const pulizia = { operatoriServizi: [], orariIds: [], prenotazioniIds: [] };

  try {
    // operatori_servizi: op1+op2 fanno i servizi uomo, op3 i servizi donna
    const opServRows = [
      ...serviziUomo.flatMap((s) => [op1, op2].map((o) => ({ operatore_id: o.id, servizio_id: s.id }))),
      ...serviziDonna.map((s) => ({ operatore_id: op3.id, servizio_id: s.id })),
    ];
    const { error: opServErr } = await admin.from('operatori_servizi').insert(opServRows);
    if (opServErr) throw new Error(`Seed operatori_servizi fallito: ${opServErr.message}`);
    pulizia.operatoriServizi = opServRows;
    esito(true, 'seed: operatori_servizi', `${opServRows.length} righe`);

    // orari settimanali lun-sab, 09-13 e 15-19, per tutti e tre
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
    esito(true, 'seed: orari_operatore', `${orariInseriti.length} righe`);

    const dataTest = prossimoGiornoValido(2);

    // 2 prenotazioni finte su op1, in orario di apertura
    const prenotazioniFinte = [
      {
        operatore_id: op1.id,
        servizio_id: servizioUomo.id,
        cliente_nome: 'Prova RLS 1',
        cliente_telefono: '+39 333 0000001',
        inizio: ts(dataTest, '10:00'),
        fine: ts(dataTest, '10:30'),
        origine: 'manuale',
      },
      {
        operatore_id: op1.id,
        servizio_id: servizioUomo.id,
        cliente_nome: 'Prova RLS 2',
        cliente_telefono: '+39 333 0000002',
        inizio: ts(dataTest, '16:00'),
        fine: ts(dataTest, '16:30'),
        origine: 'manuale',
      },
    ];
    const { data: prenInserite, error: prenErr } = await admin
      .from('prenotazioni')
      .insert(prenotazioniFinte)
      .select('id');
    if (prenErr) throw new Error(`Seed prenotazioni fallito: ${prenErr.message}`);
    pulizia.prenotazioniIds.push(...prenInserite.map((r) => r.id));
    esito(true, 'seed: prenotazioni finte', `2 righe, giorno ${dataTest}, operatore ${op1.nome}`);

    // ---------------------------------------------------------------
    // 2. Controlli con la sola ANON key — ora che le tabelle NON sono vuote
    // ---------------------------------------------------------------
    {
      const { data, error } = await anon.from('prenotazioni').select('*');
      if (error) {
        esito(true, 'anon select prenotazioni: bloccato', error.message);
      } else if (data.length === 0) {
        esito(true, 'anon select prenotazioni: bloccato', '0 righe restituite pur essendocene 2 vere');
      } else {
        esito(false, 'anon select prenotazioni: NON bloccato', `${data.length} righe visibili — LEAK`);
      }
    }

    {
      const { data, error } = await anon.from('orari_operatore').select('*');
      if (error) {
        esito(true, 'anon select orari_operatore: bloccato', error.message);
      } else if (data.length === 0) {
        esito(true, 'anon select orari_operatore: bloccato', `0 righe restituite pur essendocene ${orariRows.length} vere`);
      } else {
        esito(false, 'anon select orari_operatore: NON bloccato', `${data.length} righe visibili — LEAK`);
      }
    }

    {
      const { data: servData, error: servAnonErr } = await anon.from('servizi').select('*');
      esito(!servAnonErr && servData?.length > 0, 'anon select servizi: consentito', servAnonErr?.message ?? `${servData?.length} righe`);

      const { data: opData, error: opAnonErr } = await anon.from('operatori').select('*');
      esito(!opAnonErr && opData?.length > 0, 'anon select operatori: consentito', opAnonErr?.message ?? `${opData?.length} righe`);
    }

    {
      const { data, error } = await anon
        .from('prenotazioni')
        .insert({
          operatore_id: op1.id,
          servizio_id: servizioUomo.id,
          cliente_nome: 'Anon Hack',
          cliente_telefono: '+39 333 9999999',
          inizio: ts(dataTest, '11:00'),
          fine: ts(dataTest, '11:30'),
        })
        .select('id');
      if (error) {
        esito(true, 'anon insert su prenotazioni: bloccato', error.message);
      } else {
        // se per assurdo passasse, va ripulito comunque
        if (data?.length) pulizia.prenotazioniIds.push(...data.map((r) => r.id));
        esito(false, 'anon insert su prenotazioni: NON bloccato', 'la riga è stata scritta — LEAK');
      }
    }

    {
      const { data: slots, error } = await anon.rpc('slot_disponibili', {
        p_servizio_id: servizioUomo.id,
        p_data: dataTest,
        p_operatore_id: null,
      });
      if (error) {
        esito(false, 'slot_disponibili(): chiamata fallita', error.message);
      } else {
        esito(slots.length > 0, 'slot_disponibili(): slot reali', `${slots.length} slot per il ${dataTest}`);

        // gli orari già occupati dalle 2 prenotazioni finte non devono comparire
        const occupati10 = slots.some((s) => s.operatore_id === op1.id && new Date(s.inizio).getTime() === new Date(ts(dataTest, '10:00')).getTime());
        const occupati16 = slots.some((s) => s.operatore_id === op1.id && new Date(s.inizio).getTime() === new Date(ts(dataTest, '16:00')).getTime());
        esito(!occupati10 && !occupati16, 'slot_disponibili(): orari già prenotati esclusi', `10:00 presente=${occupati10}, 16:00 presente=${occupati16}`);
      }
    }

    // ---------------------------------------------------------------
    // 3. Vincolo no_overlap — race condition sullo stesso operatore
    // ---------------------------------------------------------------
    {
      const overlapA = {
        operatore_id: op2.id,
        servizio_id: servizioUomo.id,
        cliente_nome: 'Overlap A',
        cliente_telefono: '+39 333 1111111',
        inizio: ts(dataTest, '09:00'),
        fine: ts(dataTest, '09:30'),
        origine: 'manuale',
      };
      const { data: rowA, error: errA } = await admin.from('prenotazioni').insert(overlapA).select('id');
      if (errA) {
        esito(false, 'no_overlap: prima prenotazione (setup)', errA.message);
      } else {
        pulizia.prenotazioniIds.push(...rowA.map((r) => r.id));
        esito(true, 'no_overlap: prima prenotazione inserita', 'setup ok');

        const overlapB = {
          ...overlapA,
          cliente_nome: 'Overlap B',
          cliente_telefono: '+39 333 2222222',
          inizio: ts(dataTest, '09:15'),
          fine: ts(dataTest, '09:45'),
        };
        const { data: rowB, error: errB } = await admin.from('prenotazioni').insert(overlapB).select('id');
        if (rowB?.length) pulizia.prenotazioniIds.push(...rowB.map((r) => r.id));
        esito(
          errB?.code === '23P01',
          'no_overlap: seconda prenotazione sovrapposta bloccata',
          errB ? `${errB.code} — ${errB.message}` : 'inserita senza errore — CONSTRAINT NON ATTIVO',
        );
      }
    }
  } finally {
    // -----------------------------------------------------------------
    // 4. Pulizia dati di prova, sempre (anche se un controllo è fallito)
    // -----------------------------------------------------------------
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
