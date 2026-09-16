// La disponibilità, chiesta alle Cloud Functions.
//
// Sostituisce le chiamate rpc('agenda_mese') e rpc('agenda_giorno'). Il
// principio non cambia: il sito pubblico non legge mai `prenotazioni`, e
// nemmeno orari, assenze o chiusure. Riceve istanti già decisi
// libero/occupato, e il nome dell'operatore solo quando ne resta libero uno
// solo (CLAUDE.md § 2).
//
// ─── PERCHÉ QUI C'È UNA CACHE ───────────────────────────────────────────────
//
// Ogni risposta costa un viaggio fino a una Cloud Function in Belgio, e la
// prima della giornata paga anche l'avvio a freddo dell'istanza. In un salone
// che prende una decina di prenotazioni al giorno, la partenza a freddo la
// becca quasi ogni cliente.
//
// Senza cache si pagava più volte la stessa risposta: sfogliare avanti e
// indietro fra i mesi, tornare al calendario e riaprire lo stesso giorno,
// cercare il primo posto libero. Qui una risposta già chiesta si riusa.
//
// A rendere la cosa utile davvero è che si tiene la PROMESSA, non il
// risultato: se la stessa richiesta parte due volte prima che la prima sia
// tornata, la seconda si aggancia a quella già in volo invece di aprirne
// un'altra. Ed è questo che permette il precaricamento: chi sceglie il
// servizio fa partire subito il calendario del mese, e quando la schermata
// dopo lo chiede per davvero, o è già arrivato o è per strada. Chiamare due
// volte la stessa funzione non costa niente.
//
// LA SCADENZA C'È E SERVE. Qualcuno potrebbe prenotare mentre tu guardi il
// calendario: dopo un minuto la risposta si ributta via e si richiede. Questo
// non è ciò che impedisce la doppia prenotazione — quella la impedisce la
// transazione sui fermi, lato server (CLAUDE.md § 1), che vale anche se la
// pagina mostrava dati vecchi. Serve solo a non far scegliere un orario che
// nel frattempo è sparito, che è una figuraccia evitabile.

import { chiama } from './firebase';
import type { AnnoMese } from './data';

export type RigaGiorno = { giorno: string; libero: boolean };
export type RigaAgenda = { inizio: string; libero: boolean; operatore_nome: string | null };

/** Quanto resta buona una risposta prima di richiederla. */
const SCADENZA_MS = 60_000;

type Voce<T> = { quando: number; risposta: Promise<T> };
const memoria = new Map<string, Voce<unknown>>();

/**
 * Restituisce la risposta per questa chiave: quella in memoria se è ancora
 * fresca, altrimenti una nuova richiesta.
 *
 * Una richiesta fallita si toglie subito: tenersi un errore in cache
 * vorrebbe dire che "riprova" non riprova niente finché non scade il minuto.
 */
function conMemoria<T>(chiave: string, fai: () => Promise<T>): Promise<T> {
  const avuta = memoria.get(chiave) as Voce<T> | undefined;
  if (avuta && Date.now() - avuta.quando < SCADENZA_MS) return avuta.risposta;

  const risposta = fai().catch((e) => {
    memoria.delete(chiave);
    throw e;
  });
  memoria.set(chiave, { quando: Date.now(), risposta });
  return risposta;
}

/**
 * Butta via tutto il ricordato.
 * Da chiamare quando una prenotazione è andata a buon fine: da quel momento
 * ogni risposta tenuta da parte descrive un'agenda che non esiste più.
 */
export function dimenticaAgenda(): void {
  memoria.clear();
}

export async function agendaDelMese(
  servizioId: string,
  { anno, mese }: AnnoMese,
): Promise<RigaGiorno[]> {
  return conMemoria(`mese:${servizioId}:${anno}-${mese}`, async () => {
    const risposta = await chiama<
      { servizio_id: string; anno: number; mese: number },
      { giorni: RigaGiorno[] }
    >('agendaMese', { servizio_id: servizioId, anno, mese });
    return risposta.giorni ?? [];
  });
}

export async function agendaDelGiorno(
  servizioId: string,
  dataStr: string,
): Promise<RigaAgenda[]> {
  return conMemoria(`giorno:${servizioId}:${dataStr}`, async () => {
    const risposta = await chiama<
      { servizio_id: string; data: string },
      { righe: RigaAgenda[] }
    >('agendaGiorno', { servizio_id: servizioId, data: dataStr });
    return risposta.righe ?? [];
  });
}

/**
 * Fa partire una richiesta senza aspettarla e senza far rumore se fallisce.
 *
 * Serve a chiedere una cosa PRIMA che serva: se poi non serve davvero, un
 * errore qui non deve finire in console né tantomeno davanti a chi naviga.
 * Quando servirà, la stessa chiamata troverà la risposta o la aspetterà.
 */
export function precarica(promessa: Promise<unknown>): void {
  promessa.catch(() => {});
}
