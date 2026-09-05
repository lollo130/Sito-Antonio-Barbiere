// La disponibilità, chiesta alle Cloud Functions.
//
// Sostituisce le chiamate rpc('agenda_mese') e rpc('agenda_giorno'). Il
// principio non cambia: il sito pubblico non legge mai `prenotazioni`, e
// nemmeno orari, assenze o chiusure. Riceve istanti già decisi
// libero/occupato, e il nome dell'operatore solo quando ne resta libero uno
// solo (CLAUDE.md § 2).

import { chiama } from './firebase';
import type { AnnoMese } from './data';

export type RigaGiorno = { giorno: string; libero: boolean };
export type RigaAgenda = { inizio: string; libero: boolean; operatore_nome: string | null };

export async function agendaDelMese(
  servizioId: string,
  { anno, mese }: AnnoMese,
): Promise<RigaGiorno[]> {
  const risposta = await chiama<
    { servizio_id: string; anno: number; mese: number },
    { giorni: RigaGiorno[] }
  >('agendaMese', { servizio_id: servizioId, anno, mese });
  return risposta.giorni ?? [];
}

export async function agendaDelGiorno(
  servizioId: string,
  dataStr: string,
): Promise<RigaAgenda[]> {
  const risposta = await chiama<
    { servizio_id: string; data: string },
    { righe: RigaAgenda[] }
  >('agendaGiorno', { servizio_id: servizioId, data: dataStr });
  return risposta.righe ?? [];
}
