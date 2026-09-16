// Le letture pubbliche, in un posto solo.
//
// Perché non sparse nelle pagine: le regole di Firestore non filtrano le
// righe come facevano le RLS di Postgres. Con le RLS il sito chiedeva
// "tutti i servizi" e il database ne restituiva solo di attivi. Qui una
// query senza where('attivo','==',true) non torna meno righe: viene
// rifiutata in blocco con "permission-denied". Tenere le query qui dentro
// vuol dire non doverselo ricordare in otto pagine diverse.

import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Tempo massimo che una lettura pubblica può prendersi prima di dichiararsi
 * fallita.
 *
 * Serve perché l'SDK di Firestore, quando non riesce a parlare col server,
 * NON fallisce: riprova, in silenzio, per sempre. Con supabase-js era una
 * fetch normale e l'errore arrivava subito. Senza questa sveglia la pagina
 * resterebbe su "Carico i servizi…" a tempo indeterminato — che per il
 * pubblico di questo sito è peggio di un errore, perché non c'è niente da
 * fare e nemmeno si capisce che c'è un guasto. Andando in errore, invece,
 * compare il messaggio in italiano col numero da chiamare.
 */
const SCADENZA_MS = 8000;

function conScadenza<T>(promessa: Promise<T>): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((_, rifiuta) =>
      setTimeout(() => rifiuta(new Error('Il server non risponde.')), SCADENZA_MS),
    ),
  ]);
}

export type Servizio = {
  id: string;
  nome: string;
  durata_minuti: number;
  prezzo_cent: number;
  categoria: 'uomo' | 'donna' | 'entrambi';
};

export type Operatore = {
  id: string;
  nome: string;
  ordine: number;
  /** il colore in agenda; fa da ripiego quando manca la foto */
  colore: string;
  /** la foto, come data URL, oppure null (vedi src/lib/foto.ts) */
  foto: string | null;
};

export type FasciaSalone = { giorno: number; ora_inizio: string; ora_fine: string };

function servizioDa(d: QueryDocumentSnapshot): Servizio {
  return {
    id: d.id,
    nome: d.get('nome'),
    durata_minuti: d.get('durata_minuti'),
    prezzo_cent: d.get('prezzo_cent'),
    categoria: d.get('categoria'),
  };
}

/**
 * I servizi che il pubblico può vedere e prenotare.
 *
 * Il taglio femminile resta FUORI, per decisione del titolare: il salone
 * riapre quel capitolo più avanti. Non è stato tolto dai dati né dal pannello
 * — i servizi `donna` si possono ancora creare e restano lì con i loro prezzi
 * — viene solo nascosto al pubblico, così quando si riprenderà basterà
 * togliere questo filtro invece di rifare listino e categorie.
 *
 * Il filtro sta qui e non nella pagina di prenotazione perché queste righe le
 * legge anche il listino della home: separandoli, prima o poi la home
 * mostrerebbe un servizio che poi non si riesce a prenotare.
 *
 * I servizi `entrambi` restano: sono cose come la barba o il taglio bambino,
 * che non sono "femminili" — sono per tutti.
 */
export async function serviziAttivi(): Promise<Servizio[]> {
  const risultato = await conScadenza(
    getDocs(query(collection(db, 'servizi'), where('attivo', '==', true), orderBy('ordine'))),
  );
  return risultato.docs.map(servizioDa).filter((s) => s.categoria !== 'donna');
}

export async function operatoriAttivi(): Promise<Operatore[]> {
  const risultato = await conScadenza(
    getDocs(query(collection(db, 'operatori'), where('attivo', '==', true), orderBy('ordine'))),
  );
  return risultato.docs.map((d) => ({
    id: d.id,
    nome: d.get('nome'),
    ordine: d.get('ordine') ?? 0,
    colore: d.get('colore') ?? '#888888',
    // Assente sui documenti creati prima che le foto esistessero, null quando
    // il titolare l'ha tolta: per chi legge sono la stessa cosa.
    foto: d.get('foto') ?? null,
  }));
}

/**
 * Gli operatori attivi che fanno un certo servizio.
 *
 * In Supabase era una join sola (`operatori_servizi!inner`). Firestore non
 * ha join: si leggono gli abbinamenti e si incrociano con gli operatori
 * attivi. Sono due query su due collezioni piccole, e la seconda serve
 * comunque per avere nome e ordine.
 */
export async function operatoriPerServizio(servizioId: string): Promise<Operatore[]> {
  const abbinamenti = await conScadenza(
    getDocs(query(collection(db, 'operatori_servizi'), where('servizio_id', '==', servizioId))),
  );
  const abilitati = new Set(abbinamenti.docs.map((d) => d.get('operatore_id') as string));
  if (abilitati.size === 0) return [];
  return (await operatoriAttivi()).filter((o) => abilitati.has(o.id));
}

export async function orariSalone(): Promise<FasciaSalone[]> {
  const risultato = await conScadenza(
    getDocs(query(collection(db, 'orari_salone'), orderBy('giorno'))),
  );
  return risultato.docs.map((d) => ({
    giorno: d.get('giorno'),
    ora_inizio: d.get('ora_inizio'),
    ora_fine: d.get('ora_fine'),
  }));
}
