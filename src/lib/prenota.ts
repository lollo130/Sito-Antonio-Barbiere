// Chiamata alla Cloud Function `prenota`, l'unico punto da cui il sito
// scrive una prenotazione.
//
// Prima era una fetch a mano verso la edge function, per poter leggere il
// corpo JSON anche sulle risposte non-2xx. Con le funzioni `onCall` il
// problema non si pone: gli esiti previsti (orario appena preso, limite per
// telefono) tornano come risposta normale con `ok: false`, non come
// eccezione. Restano eccezioni solo i guasti veri — rete giù, funzione non
// raggiungibile — che qui diventano un messaggio in italiano.

import { chiama } from './firebase';

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
  try {
    return await chiama<CorpoPrenota, RispostaPrenota>('prenota', corpo);
  } catch {
    return {
      ok: false,
      codice: 'rete',
      errore: 'Non riesco a parlare col server. Controlla la connessione e riprova.',
    };
  }
}
