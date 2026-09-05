// Le Cloud Functions del salone.
//
// Sostituiscono due cose del vecchio Supabase:
//  - la edge function `prenota` (l'unico punto di scrittura);
//  - le funzioni SQL `security definer` slot_disponibili / agenda_giorno /
//    agenda_mese, che erano l'unico modo in cui il sito pubblico "vedeva"
//    le prenotazioni senza poterle leggere.
//
// Sono tutte `onCall`: il client usa l'SDK Firebase, che pensa a CORS e a
// mandare il token dell'admin quando c'è. Gli esiti previsti (slot appena
// preso, limite per telefono) NON sono errori: tornano come risposta
// normale con `ok: false`, così il client legge il messaggio in italiano
// invece di ricevere un errore generico.

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  agendaDaProposte,
  caricaContesto,
  FINESTRA_MASSIMA_GIORNI,
  leggiServizio,
  PREAVVISO_MINIMO_MINUTI,
  proposteDelGiorno,
  soloLibere,
  trovaAlternative,
  type Proposta,
} from './disponibilita';
import { inviaEmailPrenotazione, RESEND_API_KEY } from './email';
import {
  aggiungiGiorni,
  confiniGiornoRoma,
  dataRomaDi,
  eDataValida,
  giorniDelMese,
  istanteRoma,
} from './roma';
import { cancellaPrenotazioniScadute, MESI_CONSERVAZIONE } from './pulizia';
import { cambiaStato, creaPrenotazione, type Stato } from './scrivi';

initializeApp();
const db = getFirestore();

// europe-west1 è la regione più vicina disponibile ovunque. Cambiarla dopo
// il primo deploy vuol dire ricreare le funzioni: si sceglie adesso.
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

const MAX_TENTATIVI_INSERIMENTO = 5;
const TELEFONO_REGEX = /^[0-9+ ]{8,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATI_AMMESSI: Stato[] = ['confermata', 'completata', 'non_presentato', 'cancellata'];

type Fallita = { ok: false; codice: string; errore: string; alternative?: unknown[] };

function errore(codice: string, messaggio: string, alternative?: unknown[]): Fallita {
  return { ok: false, codice, errore: messaggio, ...(alternative ? { alternative } : {}) };
}

function iso(p: Proposta) {
  return {
    inizio: p.inizio.toISOString(),
    operatore_id: p.operatoreId,
    operatore_nome: p.operatoreNome,
  };
}

/** Equivalente di is_admin(): serve una riga in `profili` col proprio uid. */
async function pretendiAdmin(richiesta: CallableRequest): Promise<void> {
  const uid = richiesta.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Devi entrare nel pannello.');
  const profilo = await db.collection('profili').doc(uid).get();
  if (!profilo.exists) {
    throw new HttpsError('permission-denied', 'Questo account non ha accesso al pannello.');
  }
}

// =====================================================================
// PUBBLICO — disponibilità
// =====================================================================

/** Come agenda_giorno(): tutti gli istanti del giorno, liberi e occupati. */
export const agendaGiorno = onCall(async (richiesta) => {
  const { servizio_id: servizioId, data } = (richiesta.data ?? {}) as {
    servizio_id?: string;
    data?: string;
  };
  if (!servizioId || !eDataValida(data)) {
    throw new HttpsError('invalid-argument', 'Servono il servizio e il giorno.');
  }

  const servizio = await leggiServizio(db, servizioId);
  if (!servizio || !servizio.attivo) return { righe: [] };

  const { inizio, fine } = confiniGiornoRoma(data);
  const contesto = await caricaContesto(db, servizioId, inizio, fine);
  const righe = agendaDaProposte(
    proposteDelGiorno(contesto, data, servizio.durata_minuti, new Date()),
  );

  return {
    righe: righe.map((r) => ({
      inizio: r.inizio.toISOString(),
      libero: r.libero,
      operatore_nome: r.operatoreNome,
    })),
  };
});

/** Come agenda_mese(): un mese di caselle libero/pieno in una chiamata. */
export const agendaMese = onCall(async (richiesta) => {
  const { servizio_id: servizioId, anno, mese } = (richiesta.data ?? {}) as {
    servizio_id?: string;
    anno?: number;
    mese?: number;
  };
  if (!servizioId || typeof anno !== 'number' || typeof mese !== 'number' || mese < 1 || mese > 12) {
    throw new HttpsError('invalid-argument', 'Servono il servizio, l\'anno e il mese.');
  }

  const servizio = await leggiServizio(db, servizioId);
  if (!servizio || !servizio.attivo) return { giorni: [] };

  const giorni = giorniDelMese(anno, mese);
  // Una lettura sola per tutto il mese, invece di una per giorno.
  const inizio = istanteRoma(giorni[0], '00:00');
  const fine = istanteRoma(aggiungiGiorni(giorni[giorni.length - 1], 1), '00:00');
  const contesto = await caricaContesto(db, servizioId, inizio, fine);
  const adesso = new Date();

  return {
    giorni: giorni.map((giorno) => ({
      giorno,
      libero: proposteDelGiorno(contesto, giorno, servizio.durata_minuti, adesso).some(
        (p) => p.libero,
      ),
    })),
  };
});

// =====================================================================
// PUBBLICO — prenotazione
// =====================================================================

export const prenota = onCall({ secrets: [RESEND_API_KEY] }, async (richiesta) => {
  const corpo = (richiesta.data ?? {}) as Record<string, string | null | undefined>;

  // --- 1. Validazione ---
  const nome = corpo.cliente_nome?.trim() ?? '';
  if (nome.length < 2 || nome.length > 60) {
    return errore('validazione', 'Manca il nome, o non è valido.');
  }

  const telefono = corpo.cliente_telefono?.trim() ?? '';
  if (!TELEFONO_REGEX.test(telefono)) {
    return errore('validazione', 'Manca il numero di telefono, o non è valido.');
  }

  const cognome = corpo.cliente_cognome?.trim() || null;
  const email = corpo.cliente_email?.trim() || null;
  if (email && !EMAIL_REGEX.test(email)) {
    return errore('validazione', "L'indirizzo email non è valido.");
  }

  if (!corpo.servizio_id) return errore('validazione', 'Manca il servizio scelto.');
  const servizio = await leggiServizio(db, corpo.servizio_id);
  if (!servizio || !servizio.attivo) {
    return errore('validazione', 'Il servizio scelto non è disponibile.');
  }

  const inizio = new Date(corpo.inizio ?? '');
  if (Number.isNaN(inizio.getTime())) {
    return errore('validazione', "L'orario scelto non è valido.");
  }

  const adesso = new Date();
  if (inizio.getTime() < adesso.getTime() + PREAVVISO_MINIMO_MINUTI * 60_000) {
    return errore('validazione', 'Servono almeno 30 minuti di preavviso per prenotare.');
  }
  if (inizio.getTime() > adesso.getTime() + FINESTRA_MASSIMA_GIORNI * 86_400_000) {
    return errore('validazione', 'Non è possibile prenotare così lontano nel tempo.');
  }

  let operatorePreferito: string | null = null;
  if (corpo.operatore_id) {
    const operatore = await db.collection('operatori').doc(corpo.operatore_id).get();
    if (!operatore.exists || operatore.get('attivo') !== true) {
      return errore('validazione', "L'operatore scelto non è disponibile.");
    }
    const abbinamento = await db
      .collection('operatori_servizi')
      .where('operatore_id', '==', corpo.operatore_id)
      .where('servizio_id', '==', corpo.servizio_id)
      .limit(1)
      .get();
    if (abbinamento.empty) {
      return errore('validazione', 'Questo operatore non esegue il servizio scelto.');
    }
    operatorePreferito = corpo.operatore_id;
  }

  // --- 2. Limite anti-abuso: una sola prenotazione futura per telefono ---
  const attive = await db
    .collection('prenotazioni')
    .where('cliente_telefono', '==', telefono)
    .where('stato', '==', 'confermata')
    .where('inizio', '>', adesso)
    .limit(1)
    .get();
  if (!attive.empty) {
    return errore(
      'limite_telefono',
      "C'è già una prenotazione attiva con questo numero di telefono.",
    );
  }

  // --- 3. Rilegge la disponibilità, sceglie l'operatore, scrive ---
  // Se lo slot sparisce fra la lettura e la scrittura non è un errore, è la
  // normale corsa fra due clienti: si rilegge e si riprova. È lo stesso giro
  // che prima si faceva sul codice 23P01 di Postgres.
  const data = dataRomaDi(inizio);

  for (let tentativo = 0; tentativo < MAX_TENTATIVI_INSERIMENTO; tentativo++) {
    const { inizio: da, fine: a } = confiniGiornoRoma(data);
    const contesto = await caricaContesto(db, servizio.id, da, a, operatorePreferito);
    const proposte = proposteDelGiorno(contesto, data, servizio.durata_minuti, adesso);
    const candidati = soloLibere(proposte).filter(
      (p) => p.inizio.getTime() === inizio.getTime(),
    );

    if (candidati.length === 0) {
      const alternative = await trovaAlternative(
        db,
        servizio,
        operatorePreferito,
        data,
        adesso,
      );
      return errore(
        'slot_non_disponibile',
        'Questo orario non è più disponibile.',
        alternative.map(iso),
      );
    }

    const scelto = scegliOperatore(candidati, contesto.occupati, inizio, servizio.durata_minuti);

    const esito = await creaPrenotazione(db, {
      operatoreId: scelto.operatoreId,
      servizioId: servizio.id,
      clienteNome: nome,
      clienteCognome: cognome,
      clienteTelefono: telefono,
      clienteEmail: email,
      inizio,
      durataMinuti: servizio.durata_minuti,
      origine: 'sito',
      forzata: false,
    });

    if (esito.tipo === 'occupato') {
      console.warn(`[prenota] slot preso in corsa, ripeto (tentativo ${tentativo + 1})`);
      continue;
    }

    // L'email non deve mai far fallire una prenotazione già scritta.
    await inviaEmailPrenotazione({
      servizioNome: servizio.nome,
      inizio: esito.inizio,
      operatoreNome: scelto.operatoreNome,
      clienteNome: nome,
      clienteCognome: cognome,
      clienteTelefono: telefono,
      clienteEmail: email,
    });

    return {
      ok: true as const,
      prenotazione: {
        id: esito.id,
        servizio: servizio.nome,
        inizio: esito.inizio.toISOString(),
        fine: esito.fine.toISOString(),
        operatore: scelto.operatoreNome,
      },
    };
  }

  return errore('errore', 'Troppa richiesta in contemporanea su questo orario, riprova.');
});

/**
 * Nessuna preferenza: si preferisce l'operatore che ha già una prenotazione
 * attaccata allo slot chiesto, per non bucare le agende. A parità vince il
 * primo per `ordine` (i candidati arrivano già ordinati così).
 */
function scegliOperatore(
  candidati: Proposta[],
  occupati: Map<string, { inizio: Date; fine: Date }[]>,
  inizio: Date,
  durataMinuti: number,
): Proposta {
  const fine = new Date(inizio.getTime() + durataMinuti * 60_000);
  const attaccato = (operatoreId: string) =>
    (occupati.get(operatoreId) ?? []).some(
      (o) =>
        o.fine.getTime() === inizio.getTime() || o.inizio.getTime() === fine.getTime(),
    );
  return [...candidati].sort(
    (a, b) => Number(attaccato(b.operatoreId)) - Number(attaccato(a.operatoreId)),
  )[0];
}

// =====================================================================
// PANNELLO — scritture riservate all'admin
// =====================================================================

/**
 * Inserimento a mano dal pannello. Il pannello non impone i propri vincoli
 * (CLAUDE.md § 7): se lo slot è pieno risponde `occupato`, e sta al titolare
 * decidere se rifare la chiamata con `forzata: true`.
 */
export const adminAggiungiPrenotazione = onCall(async (richiesta) => {
  await pretendiAdmin(richiesta);
  const corpo = (richiesta.data ?? {}) as Record<string, string | boolean | null | undefined>;

  const nome = String(corpo.cliente_nome ?? '').trim();
  if (nome.length < 2 || nome.length > 60) {
    return errore('validazione', 'Manca il nome, o non è valido.');
  }
  const telefono = String(corpo.cliente_telefono ?? '').trim();
  if (!TELEFONO_REGEX.test(telefono)) {
    return errore('validazione', 'Manca il numero di telefono, o non è valido.');
  }
  if (!corpo.servizio_id || !corpo.operatore_id) {
    return errore('validazione', 'Servono il servizio e l\'operatore.');
  }

  const servizio = await leggiServizio(db, String(corpo.servizio_id));
  if (!servizio) return errore('validazione', 'Il servizio scelto non esiste.');

  const operatore = await db.collection('operatori').doc(String(corpo.operatore_id)).get();
  if (!operatore.exists) return errore('validazione', "L'operatore scelto non esiste.");

  const inizio = new Date(String(corpo.inizio ?? ''));
  if (Number.isNaN(inizio.getTime())) {
    return errore('validazione', "L'orario scelto non è valido.");
  }

  const esito = await creaPrenotazione(db, {
    operatoreId: operatore.id,
    servizioId: servizio.id,
    clienteNome: nome,
    clienteCognome: String(corpo.cliente_cognome ?? '').trim() || null,
    clienteTelefono: telefono,
    clienteEmail: null,
    inizio,
    durataMinuti: servizio.durata_minuti,
    origine: 'manuale',
    forzata: corpo.forzata === true,
    note: String(corpo.note ?? '').trim() || null,
  });

  if (esito.tipo === 'occupato') {
    return errore(
      'slot_occupato',
      'In quell\'orario l\'operatore è già occupato. Puoi inserirla lo stesso, forzandola.',
    );
  }

  return {
    ok: true as const,
    prenotazione: {
      id: esito.id,
      inizio: esito.inizio.toISOString(),
      fine: esito.fine.toISOString(),
      operatore: operatore.get('nome') as string,
      servizio: servizio.nome,
    },
  };
});

/** Completata / non presentato / cancellata dal pannello "Oggi". */
export const adminCambiaStato = onCall(async (richiesta) => {
  await pretendiAdmin(richiesta);
  const { id, stato } = (richiesta.data ?? {}) as { id?: string; stato?: Stato };
  if (!id || !stato || !STATI_AMMESSI.includes(stato)) {
    throw new HttpsError('invalid-argument', 'Serve una prenotazione e uno stato valido.');
  }

  const esito = await cambiaStato(db, id, stato);
  if (esito === 'inesistente') return errore('inesistente', 'Questa prenotazione non esiste più.');
  if (esito === 'occupato') {
    return errore(
      'slot_occupato',
      'Non si può rimettere in agenda: quell\'orario nel frattempo è stato preso.',
    );
  }
  return { ok: true as const };
});

// =====================================================================
// MANUTENZIONE — la promessa dell'informativa, mantenuta dal codice
// =====================================================================

/**
 * Cancella prenotazioni e fermi piu' vecchi del termine di conservazione.
 *
 * L'informativa privacy dice che le prenotazioni restano in archivio per
 * un tempo preciso e poi spariscono. Senza questa funzione quella riga
 * sarebbe una dichiarazione a vuoto: i nomi e i numeri di telefono
 * resterebbero li' per sempre.
 *
 * Gira il primo del mese alle 4 del mattino, ora di Roma: il salone e'
 * chiuso e nessuno sta prenotando.
 */
export const pulisciArchivio = onSchedule(
  { schedule: '0 4 1 * *', timeZone: 'Europe/Rome' },
  async () => {
    const esito = await cancellaPrenotazioniScadute(db);
    console.log(
      `[pulizia] termine ${MESI_CONSERVAZIONE} mesi (prima del ${esito.soglia}): ` +
        `cancellate ${esito.prenotazioniCancellate} prenotazioni e ${esito.fermiCancellati} fermi` +
        (esito.altreDaFare ? ' — raggiunto il tetto, il resto al giro dopo' : ''),
    );
  },
);
