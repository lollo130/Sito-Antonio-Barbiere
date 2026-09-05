// Le scritture del pannello che non possono passare dal browser.
//
// Le regole vietano a chiunque, admin compreso, di scrivere su
// `prenotazioni`: insieme alla prenotazione vanno creati o tolti i fermi
// dello slot, e deve succedere in una transazione sola (vedi
// functions/src/blocchi.ts). Tutto il resto — operatori, servizi, orari,
// assenze, chiusure — l'admin continua a scriverlo direttamente su
// Firestore, come faceva con le RLS.

import { chiama } from './firebase';

export type EsitoAdmin =
  | { ok: true; prenotazione?: { id: string; inizio: string; fine: string; operatore: string; servizio: string } }
  | { ok: false; codice: string; errore: string };

export type DatiAggiunta = {
  servizio_id: string;
  operatore_id: string;
  inizio: string;
  cliente_nome: string;
  cliente_cognome?: string;
  cliente_telefono: string;
  note?: string;
  /** true = inserisci anche se l'operatore è occupato (CLAUDE.md § 7). */
  forzata?: boolean;
};

export function aggiungiPrenotazione(dati: DatiAggiunta): Promise<EsitoAdmin> {
  return chiama<DatiAggiunta, EsitoAdmin>('adminAggiungiPrenotazione', dati);
}

export type Stato = 'confermata' | 'completata' | 'non_presentato' | 'cancellata';

export function cambiaStatoPrenotazione(id: string, stato: Stato): Promise<EsitoAdmin> {
  return chiama<{ id: string; stato: Stato }, EsitoAdmin>('adminCambiaStato', { id, stato });
}

/**
 * Esegue una scrittura su Firestore e restituisce l'errore invece di
 * lanciarlo.
 *
 * supabase-js rispondeva sempre `{ data, error }`, e il pannello è scritto
 * così: prova, guarda `error`, mostra il messaggio. L'SDK Firebase lancia.
 * Questo riporta le due cose alla stessa forma, invece di riempire ogni
 * schermata di try/catch.
 */
export async function seFallisce(azione: Promise<unknown>): Promise<unknown | null> {
  try {
    await azione;
    return null;
  } catch (e) {
    return e;
  }
}
