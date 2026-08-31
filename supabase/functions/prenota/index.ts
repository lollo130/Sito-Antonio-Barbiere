// Unico punto di scrittura su `prenotazioni`. Usa la service_role key,
// mai esposta al client. Vedi SPECIFICA.md § 8.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verificaEAssegnaOperatore } from './disponibilita.ts';
import { inviaEmailPrenotazione } from './email.ts';

const PREAVVISO_MINIMO_MINUTI = 30;
const FINESTRA_MASSIMA_GIORNI = 60;
const MAX_TENTATIVI_INSERIMENTO = 5;

const TELEFONO_REGEX = /^[0-9+ ]{8,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CorpoRichiesta = {
  servizio_id?: string;
  operatore_id?: string | null;
  inizio?: string;
  cliente_nome?: string;
  cliente_cognome?: string;
  cliente_telefono?: string;
  cliente_email?: string;
};

function risposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function erroreValidazione(messaggio: string) {
  return risposta({ ok: false, codice: 'validazione', errore: messaggio }, 400);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return risposta({ ok: false, codice: 'errore', errore: 'Metodo non consentito.' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let corpo: CorpoRichiesta;
  try {
    corpo = await req.json();
  } catch {
    return erroreValidazione('La richiesta non è leggibile.');
  }

  // ---------------------------------------------------------------
  // 1. Validazione input
  // ---------------------------------------------------------------
  const nome = corpo.cliente_nome?.trim() ?? '';
  if (nome.length < 2 || nome.length > 60) return erroreValidazione('Manca il nome, o non è valido.');

  const telefono = corpo.cliente_telefono?.trim() ?? '';
  if (!TELEFONO_REGEX.test(telefono)) return erroreValidazione('Manca il numero di telefono, o non è valido.');

  const cognome = corpo.cliente_cognome?.trim() || null;
  const email = corpo.cliente_email?.trim() || null;
  if (email && !EMAIL_REGEX.test(email)) return erroreValidazione("L'indirizzo email non è valido.");

  if (!corpo.servizio_id) return erroreValidazione('Manca il servizio scelto.');
  const { data: servizio, error: servizioErr } = await supabase
    .from('servizi')
    .select('id, nome, durata_minuti, attivo')
    .eq('id', corpo.servizio_id)
    .maybeSingle();
  if (servizioErr) {
    return risposta({ ok: false, codice: 'errore', errore: 'Errore nel leggere il servizio.' }, 500);
  }
  if (!servizio || !servizio.attivo) return erroreValidazione('Il servizio scelto non è disponibile.');

  let inizioRichiesto: string;
  try {
    if (!corpo.inizio) throw new Error('mancante');
    const d = new Date(corpo.inizio);
    if (Number.isNaN(d.getTime())) throw new Error('non valido');
    inizioRichiesto = d.toISOString();
  } catch {
    return erroreValidazione("L'orario scelto non è valido.");
  }

  const adesso = Date.now();
  if (new Date(inizioRichiesto).getTime() < adesso + PREAVVISO_MINIMO_MINUTI * 60_000) {
    return erroreValidazione('Servono almeno 30 minuti di preavviso per prenotare.');
  }
  if (new Date(inizioRichiesto).getTime() > adesso + FINESTRA_MASSIMA_GIORNI * 24 * 60 * 60_000) {
    return erroreValidazione('Non è possibile prenotare così lontano nel tempo.');
  }

  let operatorePreferenza: string | null = null;
  if (corpo.operatore_id) {
    const { data: op, error: opErr } = await supabase
      .from('operatori')
      .select('id, attivo')
      .eq('id', corpo.operatore_id)
      .maybeSingle();
    if (opErr) return risposta({ ok: false, codice: 'errore', errore: "Errore nel leggere l'operatore." }, 500);
    if (!op || !op.attivo) return erroreValidazione("L'operatore scelto non è disponibile.");

    const { data: link, error: linkErr } = await supabase
      .from('operatori_servizi')
      .select('operatore_id')
      .eq('operatore_id', corpo.operatore_id)
      .eq('servizio_id', corpo.servizio_id)
      .maybeSingle();
    if (linkErr) return risposta({ ok: false, codice: 'errore', errore: "Errore nel verificare l'operatore." }, 500);
    if (!link) return erroreValidazione('Questo operatore non esegue il servizio scelto.');

    operatorePreferenza = corpo.operatore_id;
  }

  // ---------------------------------------------------------------
  // 2. Limite anti-abuso: una sola prenotazione futura attiva per telefono
  // ---------------------------------------------------------------
  const { data: attive, error: attiveErr } = await supabase
    .from('prenotazioni')
    .select('id')
    .eq('cliente_telefono', telefono)
    .eq('stato', 'confermata')
    .gt('inizio', new Date().toISOString())
    .limit(1);
  if (attiveErr) {
    return risposta({ ok: false, codice: 'errore', errore: 'Errore nel verificare le prenotazioni esistenti.' }, 500);
  }
  if (attive && attive.length > 0) {
    return risposta(
      { ok: false, codice: 'limite_telefono', errore: 'C\'è già una prenotazione attiva con questo numero di telefono.' },
      409,
    );
  }

  // ---------------------------------------------------------------
  // 3-4. Rilegge la disponibilità, assegna l'operatore, inserisce.
  // Se scatta il vincolo no_overlap (23P01) è una race condition normale,
  // non un errore: si ripete il punto 3 invece di rispondere con un
  // errore generico.
  // ---------------------------------------------------------------
  for (let tentativo = 0; tentativo < MAX_TENTATIVI_INSERIMENTO; tentativo++) {
    const esito = await verificaEAssegnaOperatore(supabase, servizio, inizioRichiesto, operatorePreferenza);

    if (esito.tipo === 'non_disponibile') {
      return risposta({
        ok: false,
        codice: 'slot_non_disponibile',
        errore: 'Questo orario non è più disponibile.',
        alternative: esito.alternative,
      });
    }

    const fine = new Date(
      new Date(inizioRichiesto).getTime() + servizio.durata_minuti * 60_000,
    ).toISOString();

    const { data: inserita, error: inserimentoErr } = await supabase
      .from('prenotazioni')
      .insert({
        operatore_id: esito.operatoreId,
        servizio_id: servizio.id,
        cliente_nome: nome,
        cliente_cognome: cognome,
        cliente_telefono: telefono,
        cliente_email: email,
        inizio: inizioRichiesto,
        fine,
        origine: 'sito',
      })
      .select('id, inizio, fine')
      .single();

    if (inserimentoErr) {
      if (inserimentoErr.code === '23P01') {
        console.warn(`[prenota] 23P01: slot preso in corsa, ripeto la verifica (tentativo ${tentativo + 1})`);
        continue;
      }
      console.error('[prenota] inserimento fallito:', inserimentoErr.message);
      return risposta({ ok: false, codice: 'errore', errore: 'Non è stato possibile salvare la prenotazione.' }, 500);
    }

    // 5. Email — un fallimento qui non deve mai far fallire la prenotazione,
    // che a questo punto è già scritta.
    await inviaEmailPrenotazione({
      servizioNome: servizio.nome,
      inizio: inserita.inizio,
      operatoreNome: esito.operatoreNome,
      clienteNome: nome,
      clienteCognome: cognome,
      clienteTelefono: telefono,
      clienteEmail: email,
    });

    // 6. Esito
    return risposta({
      ok: true,
      prenotazione: {
        id: inserita.id,
        servizio: servizio.nome,
        inizio: inserita.inizio,
        fine: inserita.fine,
        operatore: esito.operatoreNome,
      },
    });
  }

  return risposta(
    { ok: false, codice: 'errore', errore: 'Troppa richiesta in contemporanea su questo orario, riprova.' },
    409,
  );
});
