// DISPONIBILITÀ — quello che facevano slot_disponibili(), agenda_giorno()
// e agenda_mese() in Postgres (schema.sql § 10, 10bis, 10ter).
//
// Erano funzioni `security definer`: giravano coi permessi del proprietario
// e restituivano solo istanti liberi/occupati, mai una riga di
// prenotazioni. Qui la stessa cosa la fa l'Admin SDK dentro una Cloud
// Function: il client non legge mai le collezioni che servono al calcolo
// (`orari_operatore`, `assenze`, `chiusure_salone`, `prenotazioni`), le
// regole gliele negano.
//
// La logica è tradotta con le stesse costanti di prima:
//  - proposte ogni 15 minuti;
//  - ultimo inizio possibile: ora_fine - durata, estremo incluso, come
//    faceva generate_series;
//  - niente prenotazioni con meno di 30 minuti di preavviso;
//  - sovrapposizione a intervalli semiaperti [inizio, fine), identica a
//    tstzrange(..., '[)').

import type { firestore } from 'firebase-admin';
import {
  aggiungiGiorni,
  confiniGiornoRoma,
  giornoSettimanaRoma,
  istanteRoma,
} from './roma';
import { STATI_OCCUPANTI } from './blocchi';

export const PASSO_PROPOSTA_MINUTI = 15;
export const PREAVVISO_MINIMO_MINUTI = 30;
export const FINESTRA_MASSIMA_GIORNI = 60;

/** Nessun servizio dura più di così: serve solo a limitare le query. */
const DURATA_MASSIMA_ORE = 12;

export type Servizio = { id: string; nome: string; durata_minuti: number; attivo: boolean };
export type Operatore = { id: string; nome: string; ordine: number };
export type Intervallo = { inizio: Date; fine: Date };
export type FasciaOraria = { giorno: number; ora_inizio: string; ora_fine: string };

export type Proposta = {
  inizio: Date;
  operatoreId: string;
  operatoreNome: string;
  libero: boolean;
};

/** [a,b) tocca [c,d)? Stessa semantica di tstzrange '[)'. */
function siSovrappongono(a: Date, b: Date, c: Date, d: Date): boolean {
  return a.getTime() < d.getTime() && c.getTime() < b.getTime();
}

function aData(v: unknown): Date {
  return (v as firestore.Timestamp).toDate();
}

export async function leggiServizio(
  db: firestore.Firestore,
  servizioId: string,
): Promise<Servizio | null> {
  const doc = await db.collection('servizi').doc(servizioId).get();
  if (!doc.exists) return null;
  return {
    id: doc.id,
    nome: doc.get('nome'),
    durata_minuti: doc.get('durata_minuti'),
    attivo: doc.get('attivo') !== false,
  };
}

/**
 * Tutto quello che serve per decidere se un istante è libero, dentro una
 * finestra di tempo. Si legge una volta sola e poi si valuta in memoria:
 * un mese intero costa cinque query, non una per casella del calendario.
 */
export type Contesto = {
  operatori: Operatore[];
  orari: Map<string, FasciaOraria[]>;
  occupati: Map<string, Intervallo[]>;
  chiusure: Intervallo[];
};

const CONTESTO_VUOTO: Contesto = {
  operatori: [],
  orari: new Map(),
  occupati: new Map(),
  chiusure: [],
};

export async function caricaContesto(
  db: firestore.Firestore,
  servizioId: string,
  da: Date,
  a: Date,
  soloOperatore?: string | null,
): Promise<Contesto> {
  // Chi fa questo servizio.
  const abbinamenti = await db
    .collection('operatori_servizi')
    .where('servizio_id', '==', servizioId)
    .get();
  let idOperatori = abbinamenti.docs.map((d) => d.get('operatore_id') as string);
  if (soloOperatore) idOperatori = idOperatori.filter((id) => id === soloOperatore);
  if (idOperatori.length === 0) return CONTESTO_VUOTO;

  const documenti = await db.getAll(
    ...idOperatori.map((id) => db.collection('operatori').doc(id)),
  );
  const operatori: Operatore[] = documenti
    .filter((d) => d.exists && d.get('attivo') === true)
    .map((d) => ({ id: d.id, nome: d.get('nome') as string, ordine: (d.get('ordine') as number) ?? 0 }))
    .sort((x, y) => x.ordine - y.ordine);
  if (operatori.length === 0) return CONTESTO_VUOTO;
  const attivi = new Set(operatori.map((o) => o.id));

  // LE QUATTRO LETTURE CHE RESTANO PARTONO INSIEME.
  //
  // Prima erano quattro `await` in fila: orari, poi prenotazioni, poi assenze,
  // poi chiusure. Ma nessuna delle quattro serve alle altre — l'unica cosa che
  // le lega è `attivi`, che si usa per SCARTARE le righe una volta arrivate,
  // non per costruire le query. Messe in fila, il tempo era la somma dei
  // quattro viaggi fino al database; messe insieme, è quello del più lento.
  //
  // È il pezzo di attesa che si poteva togliere senza cambiare una riga del
  // calcolo né spendere un euro. Quello che resta — la partenza a freddo della
  // funzione — non si risolve da qui.
  //
  // Una prenotazione cominciata prima della finestra può finirci dentro: si
  // parte indietro di una durata massima e si scarta sulla fine.
  const daConMargine = new Date(da.getTime() - DURATA_MASSIMA_ORE * 3600_000);

  const [righeOrari, prenotazioni, assenze, righeChiusure] = await Promise.all([
    // Orari settimanali. Sono pochi documenti: si prendono tutti e si filtra
    // qui, invece di una query per operatore.
    db.collection('orari_operatore').get(),
    db
      .collection('prenotazioni')
      .where('inizio', '>=', daConMargine)
      .where('inizio', '<', a)
      .get(),
    db.collection('assenze').where('fine', '>', da).get(),
    db.collection('chiusure_salone').where('fine', '>', da).get(),
  ]);

  const orari = new Map<string, FasciaOraria[]>();
  righeOrari.docs.forEach((d) => {
    const operatoreId = d.get('operatore_id') as string;
    if (!attivi.has(operatoreId)) return;
    const lista = orari.get(operatoreId) ?? [];
    lista.push({
      giorno: d.get('giorno'),
      ora_inizio: d.get('ora_inizio'),
      ora_fine: d.get('ora_fine'),
    });
    orari.set(operatoreId, lista);
  });

  // Occupato = prenotazioni che contano + assenze. Stanno insieme perché
  // l'effetto è lo stesso: a quell'ora quell'operatore non c'è.
  const occupati = new Map<string, Intervallo[]>();
  const segnaOccupato = (operatoreId: string, inizio: Date, fine: Date) => {
    if (!attivi.has(operatoreId)) return;
    const lista = occupati.get(operatoreId) ?? [];
    lista.push({ inizio, fine });
    occupati.set(operatoreId, lista);
  };

  prenotazioni.docs.forEach((d) => {
    const stato = d.get('stato') as (typeof STATI_OCCUPANTI)[number];
    if (!STATI_OCCUPANTI.includes(stato)) return;
    const fine = aData(d.get('fine'));
    if (fine <= da) return;
    segnaOccupato(d.get('operatore_id'), aData(d.get('inizio')), fine);
  });

  const assenze = await db.collection('assenze').where('fine', '>', da).get();
  assenze.docs.forEach((d) => {
    const inizio = aData(d.get('inizio'));
    if (inizio >= a) return;
    segnaOccupato(d.get('operatore_id'), inizio, aData(d.get('fine')));
  });

  const chiusure: Intervallo[] = [];
  const righeChiusure = await db.collection('chiusure_salone').where('fine', '>', da).get();
  righeChiusure.docs.forEach((d) => {
    const inizio = aData(d.get('inizio'));
    if (inizio >= a) return;
    chiusure.push({ inizio, fine: aData(d.get('fine')) });
  });

  return { operatori, orari, occupati, chiusure };
}

/**
 * Tutte le proposte di un giorno, una per (istante, operatore), già marcate
 * libere o occupate. Ordinate per istante e poi per `ordine` dell'operatore,
 * come faceva l'`order by` in SQL.
 */
export function proposteDelGiorno(
  contesto: Contesto,
  dataStr: string,
  durataMinuti: number,
  adesso: Date,
): Proposta[] {
  const dow = giornoSettimanaRoma(dataStr);
  const primoIstanteUtile = new Date(adesso.getTime() + PREAVVISO_MINIMO_MINUTI * 60_000);
  const posizione = new Map(contesto.operatori.map((o, i) => [o.id, i]));
  const proposte: Proposta[] = [];

  for (const operatore of contesto.operatori) {
    const fasce = (contesto.orari.get(operatore.id) ?? []).filter((f) => f.giorno === dow);
    for (const fascia of fasce) {
      const apertura = istanteRoma(dataStr, fascia.ora_inizio);
      const chiusura = istanteRoma(dataStr, fascia.ora_fine);
      const ultimoInizio = chiusura.getTime() - durataMinuti * 60_000;

      for (let t = apertura.getTime(); t <= ultimoInizio; t += PASSO_PROPOSTA_MINUTI * 60_000) {
        const inizio = new Date(t);
        if (inizio <= primoIstanteUtile) continue;
        const fine = new Date(t + durataMinuti * 60_000);

        const occupato = (contesto.occupati.get(operatore.id) ?? []).some((o) =>
          siSovrappongono(o.inizio, o.fine, inizio, fine),
        );
        const chiuso = contesto.chiusure.some((c) =>
          siSovrappongono(c.inizio, c.fine, inizio, fine),
        );

        proposte.push({
          inizio,
          operatoreId: operatore.id,
          operatoreNome: operatore.nome,
          libero: !occupato && !chiuso,
        });
      }
    }
  }

  proposte.sort((x, y) => {
    const d = x.inizio.getTime() - y.inizio.getTime();
    if (d !== 0) return d;
    return (posizione.get(x.operatoreId) ?? 0) - (posizione.get(y.operatoreId) ?? 0);
  });
  return proposte;
}

/** Solo gli istanti dove almeno un operatore è libero (slot_disponibili). */
export function soloLibere(proposte: Proposta[]): Proposta[] {
  return proposte.filter((p) => p.libero);
}

export type RigaAgenda = { inizio: Date; libero: boolean; operatoreNome: string | null };

/**
 * Una riga per istante: libero se lo è per almeno un operatore, col nome
 * dell'operatore solo quando ne resta libero esattamente uno. Copia di
 * agenda_giorno(): il pubblico vede anche gli orari occupati, ma non sa mai
 * di chi sono (CLAUDE.md § 2).
 */
export function agendaDaProposte(proposte: Proposta[]): RigaAgenda[] {
  const perIstante = new Map<number, Proposta[]>();
  proposte.forEach((p) => {
    const chiave = p.inizio.getTime();
    perIstante.set(chiave, [...(perIstante.get(chiave) ?? []), p]);
  });

  return [...perIstante.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([istante, gruppo]) => {
      const liberi = gruppo.filter((p) => p.libero);
      return {
        inizio: new Date(istante),
        libero: liberi.length > 0,
        operatoreNome: liberi.length === 1 ? liberi[0].operatoreNome : null,
      };
    });
}

/** Le prime `quante` alternative libere a partire da un giorno. */
export async function trovaAlternative(
  db: firestore.Firestore,
  servizio: Servizio,
  operatorePreferito: string | null,
  daData: string,
  adesso: Date,
  quante = 3,
): Promise<Proposta[]> {
  const trovate: Proposta[] = [];
  for (let g = 0; g < FINESTRA_MASSIMA_GIORNI && trovate.length < quante; g++) {
    const data = aggiungiGiorni(daData, g);
    const { inizio, fine } = confiniGiornoRoma(data);
    const contesto = await caricaContesto(db, servizio.id, inizio, fine, operatorePreferito);
    const libere = soloLibere(proposteDelGiorno(contesto, data, servizio.durata_minuti, adesso));

    // Una sola proposta per istante: al cliente non serve sapere che a
    // quell'ora sono liberi in due.
    const visti = new Set<number>();
    for (const p of libere) {
      if (visti.has(p.inizio.getTime())) continue;
      visti.add(p.inizio.getTime());
      trovate.push(p);
      if (trovate.length >= quante) break;
    }
  }
  return trovate.slice(0, quante);
}
