// Verifica una tantum di agenda_giorno(): crea una prenotazione vera con la
// service_role key, controlla che la anon key la veda come occupata (senza
// nome), e che gli slot liberi restino liberi. Ripulisce sempre.
//
// Uso: node --env-file=.env scripts/verifica-agenda-giorno.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

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
const ts = (dataStr, ora) => new Date(`${dataStr}T${ora}:00+02:00`).toISOString();

async function main() {
  const { data: operatori } = await admin.from('operatori').select('*').order('ordine');
  const { data: servizi } = await admin.from('servizi').select('*').order('ordine');
  const operatoriUomo = operatori.filter((o) => o.nome === 'Operatore 1' || o.nome === 'Operatore 2');
  const servizioUomo = servizi.find((s) => s.categoria === 'uomo');
  const dataTest = prossimoGiornoValido(2);

  let idPrenotazioni = [];
  try {
    // Prenota TUTTI gli operatori uomo alle 10:00: solo così lo slot
    // aggregato risulta davvero pieno (un solo operatore libero lascerebbe
    // comunque libero lo slot, correttamente).
    const { data: inserite, error } = await admin
      .from('prenotazioni')
      .insert(
        operatoriUomo.map((o) => ({
          operatore_id: o.id,
          servizio_id: servizioUomo.id,
          cliente_nome: 'Prova Agenda',
          cliente_telefono: `+39 333 700000${o === operatoriUomo[0] ? 1 : 2}`,
          inizio: ts(dataTest, '10:00'),
          fine: ts(dataTest, '10:30'),
          origine: 'manuale',
        })),
      )
      .select('id');
    if (error) throw new Error(`Seed fallito: ${error.message}`);
    idPrenotazioni = inserite.map((r) => r.id);
    esito(true, 'seed: tutti gli operatori uomo prenotati alle 10:00', operatoriUomo.map((o) => o.nome).join(', '));

    const { data: agenda, error: agendaErr } = await anon.rpc('agenda_giorno', {
      p_servizio_id: servizioUomo.id,
      p_data: dataTest,
    });
    if (agendaErr) throw new Error(`agenda_giorno ha fallito: ${agendaErr.message}`);

    esito(Array.isArray(agenda) && agenda.length > 0, 'agenda_giorno(): restituisce righe', `${agenda?.length ?? 0} righe`);

    const rigaOccupata = agenda.find(
      (r) => new Date(r.inizio).getTime() === new Date(ts(dataTest, '10:00')).getTime(),
    );
    esito(!!rigaOccupata && rigaOccupata.libero === false, 'lo slot delle 10:00 risulta occupato', JSON.stringify(rigaOccupata));
    esito(rigaOccupata?.operatore_nome == null, 'lo slot occupato non rivela il nome dell\'operatore', `operatore_nome=${rigaOccupata?.operatore_nome}`);

    const rigaLibera = agenda.find(
      (r) => new Date(r.inizio).getTime() === new Date(ts(dataTest, '11:00')).getTime(),
    );
    esito(!!rigaLibera && rigaLibera.libero === true, 'un altro slot (11:00) risulta libero', JSON.stringify(rigaLibera));

    const chiaviRiga = agenda.length ? Object.keys(agenda[0]) : [];
    const soloCampiAttesi = chiaviRiga.every((k) => ['inizio', 'libero', 'operatore_nome'].includes(k));
    esito(soloCampiAttesi, 'nessun campo extra nella risposta (niente nomi/telefoni cliente)', chiaviRiga.join(', '));
  } finally {
    if (idPrenotazioni.length) {
      const { error } = await admin.from('prenotazioni').delete().in('id', idPrenotazioni);
      esito(!error, 'pulizia: prenotazioni di prova cancellate', error?.message ?? `${idPrenotazioni.length} righe`);
    }
  }

  console.log('\n' + (fallito ? 'RISULTATO: uno o più controlli falliti.' : 'RISULTATO: tutti i controlli superati.'));
  process.exit(fallito ? 1 : 0);
}

main().catch((e) => {
  console.error('Errore inatteso:', e.message);
  process.exit(1);
});
