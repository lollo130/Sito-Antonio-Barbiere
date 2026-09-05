// Invio email via Resend. Non lancia mai: un fallimento qui non deve far
// fallire la prenotazione, che a questo punto è già salvata.
//
// Portato dalla edge function Deno senza cambiare i testi. Cambia solo da
// dove arrivano le chiavi: non più Deno.env, ma i parametri di
// configurazione delle Cloud Functions (vedi index.ts).

import { defineSecret } from 'firebase-functions/params';

// La chiave di Resend è un segreto vero: sta in Secret Manager.
export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// I due indirizzi no: sono configurazione, non credenziali, e soprattutto
// sono FACOLTATIVI. Dichiararli come parametri (defineString) obbligava a
// dargli un valore a ogni deploy, anche solo per pubblicare una correzione
// al calendario — e un progetto senza email configurata non poteva partire.
// Letti dall'ambiente restano vuoti finché non servono: si impostano in
// functions/.env, e finché sono vuoti l'invio si salta e basta.
const leggi = (nome: string) => process.env[nome]?.trim() ?? '';

const INDIRIZZO_SALONE = 'Via Rattazzi 12, 96010 Solarino (SR)';
const TELEFONO_SALONE = '371 413 5124';

export type DatiEmail = {
  servizioNome: string;
  inizio: Date;
  operatoreNome: string;
  clienteNome: string;
  clienteCognome: string | null;
  clienteTelefono: string;
  clienteEmail: string | null;
};

function formattaGiorno(istante: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Rome',
  }).format(istante);
}

function formattaOra(istante: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Rome',
  }).format(istante);
}

async function inviaEmail(
  apiKey: string,
  mittente: string,
  destinatario: string,
  oggetto: string,
  testo: string,
): Promise<void> {
  const risposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: mittente, to: [destinatario], subject: oggetto, text: testo }),
  });
  if (!risposta.ok) {
    throw new Error(`Resend ha risposto ${risposta.status}: ${await risposta.text()}`);
  }
}

export async function inviaEmailPrenotazione(dati: DatiEmail): Promise<void> {
  try {
    const apiKey = RESEND_API_KEY.value();
    const mittente = leggi('EMAIL_MITTENTE');
    const emailTitolare = leggi('EMAIL_TITOLARE');

    const giorno = formattaGiorno(dati.inizio);
    const ora = formattaOra(dati.inizio);
    const nomeCompleto = [dati.clienteNome, dati.clienteCognome].filter(Boolean).join(' ');

    if (apiKey && mittente && emailTitolare) {
      try {
        await inviaEmail(
          apiKey,
          mittente,
          emailTitolare,
          `Nuova prenotazione: ${nomeCompleto} — ${giorno} alle ${ora}`,
          [
            `Servizio: ${dati.servizioNome}`,
            `Giorno: ${giorno}`,
            `Ora: ${ora}`,
            `Operatore: ${dati.operatoreNome}`,
            `Cliente: ${nomeCompleto}`,
            `Telefono: ${dati.clienteTelefono}`,
          ].join('\n'),
        );
      } catch (e) {
        console.error('[prenota] invio email al titolare fallito:', (e as Error).message);
      }
    } else {
      console.warn('[prenota] email al titolare saltata: configurazione Resend mancante');
    }

    if (dati.clienteEmail) {
      if (apiKey && mittente) {
        try {
          await inviaEmail(
            apiKey,
            mittente,
            dati.clienteEmail,
            `Conferma prenotazione — ${giorno} alle ${ora}`,
            [
              `Ciao ${dati.clienteNome},`,
              '',
              'La tua prenotazione è confermata:',
              `${dati.servizioNome} — ${giorno} alle ${ora}, con ${dati.operatoreNome}`,
              '',
              INDIRIZZO_SALONE,
              `Tel. ${TELEFONO_SALONE}`,
            ].join('\n'),
          );
        } catch (e) {
          console.error('[prenota] invio email al cliente fallito:', (e as Error).message);
        }
      } else {
        console.warn('[prenota] email al cliente saltata: configurazione Resend mancante');
      }
    }
  } catch (e) {
    // Difesa in profondità: qualunque cosa vada storta qui, la prenotazione
    // resta valida.
    console.error('[prenota] invio email fallito in modo imprevisto:', (e as Error).message);
  }
}
