// Verifica e assegnazione dell'operatore per la funzione `prenota`.
// Isolato da index.ts per poterlo testare senza passare per l'HTTP.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const FINESTRA_MASSIMA_GIORNI = 60;

export type SlotRiga = { inizio: string; operatore_id: string; operatore_nome: string };

export type Servizio = { id: string; durata_minuti: number };

export function dataRomaDi(iso: string): string {
  const parti = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parti.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function aggiungiGiorni(dataStr: string, giorni: number): string {
  const [y, m, g] = dataStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, g));
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
}

async function slotDelGiorno(
  supabase: SupabaseClient,
  servizioId: string,
  data: string,
  operatoreId: string | null,
): Promise<SlotRiga[]> {
  const { data: righe, error } = await supabase.rpc('slot_disponibili', {
    p_servizio_id: servizioId,
    p_data: data,
    p_operatore_id: operatoreId,
  });
  if (error) throw new Error(`slot_disponibili ha fallito: ${error.message}`);
  return righe ?? [];
}

// Prime `quante` alternative libere a partire da `daData` (inclusa),
// scorrendo un giorno alla volta fino alla finestra massima di prenotazione.
export async function trovaAlternative(
  supabase: SupabaseClient,
  servizioId: string,
  operatoreId: string | null,
  daData: string,
  quante = 3,
): Promise<SlotRiga[]> {
  const trovate: SlotRiga[] = [];
  for (let g = 0; g < FINESTRA_MASSIMA_GIORNI && trovate.length < quante; g++) {
    const data = aggiungiGiorni(daData, g);
    const righe = await slotDelGiorno(supabase, servizioId, data, operatoreId);
    trovate.push(...righe);
  }
  trovate.sort((a, b) => new Date(a.inizio).getTime() - new Date(b.inizio).getTime());
  return trovate.slice(0, quante);
}

export type EsitoAssegnazione =
  | { tipo: 'disponibile'; operatoreId: string; operatoreNome: string }
  | { tipo: 'non_disponibile'; alternative: SlotRiga[] };

// Rilegge la disponibilità e sceglie/verifica l'operatore per l'istante
// richiesto. Se non c'è più nulla a quell'ora, propone le alternative più
// vicine (stesso operatore se era stata espressa una preferenza).
export async function verificaEAssegnaOperatore(
  supabase: SupabaseClient,
  servizio: Servizio,
  inizioRichiesto: string,
  operatorePreferenza: string | null,
): Promise<EsitoAssegnazione> {
  const data = dataRomaDi(inizioRichiesto);
  const righe = await slotDelGiorno(supabase, servizio.id, data, operatorePreferenza);

  const istante = new Date(inizioRichiesto).getTime();
  const candidati = righe.filter((r) => new Date(r.inizio).getTime() === istante);

  if (candidati.length === 0) {
    const alternative = await trovaAlternative(supabase, servizio.id, operatorePreferenza, data);
    return { tipo: 'non_disponibile', alternative };
  }

  if (operatorePreferenza) {
    const scelto = candidati[0];
    return { tipo: 'disponibile', operatoreId: scelto.operatore_id, operatoreNome: scelto.operatore_nome };
  }

  // Nessuna preferenza: preferisci l'operatore che ha già una prenotazione
  // adiacente allo slot richiesto, per non frammentare le agende con buchi.
  // A parità, il primo per `ordine`.
  const fineRichiesta = new Date(istante + servizio.durata_minuti * 60_000).toISOString();
  const candidatiId = candidati.map((c) => c.operatore_id);

  const { data: adiacenti, error: adiacentiErr } = await supabase
    .from('prenotazioni')
    .select('operatore_id')
    .in('operatore_id', candidatiId)
    .in('stato', ['confermata', 'completata'])
    .or(`fine.eq.${inizioRichiesto},inizio.eq.${fineRichiesta}`);
  if (adiacentiErr) throw new Error(`Verifica adiacenza fallita: ${adiacentiErr.message}`);
  const idsConAdiacenza = new Set((adiacenti ?? []).map((r: { operatore_id: string }) => r.operatore_id));

  const { data: operatoriInfo, error: operatoriErr } = await supabase
    .from('operatori')
    .select('id, ordine')
    .in('id', candidatiId);
  if (operatoriErr) throw new Error(`Lettura operatori fallita: ${operatoriErr.message}`);
  const ordinePerId = new Map(
    (operatoriInfo ?? []).map((o: { id: string; ordine: number }) => [o.id, o.ordine]),
  );

  const ordinati = [...candidati].sort((a, b) => {
    const adA = idsConAdiacenza.has(a.operatore_id) ? 0 : 1;
    const adB = idsConAdiacenza.has(b.operatore_id) ? 0 : 1;
    if (adA !== adB) return adA - adB;
    return (ordinePerId.get(a.operatore_id) ?? 0) - (ordinePerId.get(b.operatore_id) ?? 0);
  });

  const scelto = ordinati[0];
  return { tipo: 'disponibile', operatoreId: scelto.operatore_id, operatoreNome: scelto.operatore_nome };
}
