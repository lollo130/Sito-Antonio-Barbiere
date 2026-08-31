// Chiamata diretta (fetch) alla edge function `prenota`, invece di
// supabase.functions.invoke(): vogliamo leggere noi il corpo JSON anche
// sulle risposte non-2xx (validazione, limite telefono, slot sparito),
// senza dipendere da come supabase-js impacchetta l'errore.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type CorpoPrenota = {
  servizio_id: string;
  operatore_id: string | null;
  inizio: string;
  cliente_nome: string;
  cliente_cognome?: string;
  cliente_telefono: string;
  cliente_email?: string;
};

export type SlotAlternativo = { inizio: string; operatore_id: string; operatore_nome: string };

export type PrenotazioneConfermata = {
  id: string;
  servizio: string;
  inizio: string;
  fine: string;
  operatore: string;
};

export type RispostaPrenota =
  | { ok: true; prenotazione: PrenotazioneConfermata }
  | { ok: false; codice: string; errore: string; alternative?: SlotAlternativo[] };

export async function chiamaPrenota(corpo: CorpoPrenota): Promise<RispostaPrenota> {
  const risposta = await fetch(`${url}/functions/v1/prenota`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(corpo),
  });
  return risposta.json();
}
