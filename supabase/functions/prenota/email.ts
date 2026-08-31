// Invio email via Resend. Non lancia mai: un fallimento qui non deve mai
// far fallire la prenotazione, che a questo punto è già salvata.

const INDIRIZZO_SALONE = 'Via Roma 1, 96010 Solarino (SR)'; // da aggiornare col cliente
const TELEFONO_SALONE = '0931 000000'; // da aggiornare col cliente

export type DatiEmail = {
  servizioNome: string;
  inizio: string; // ISO, UTC
  operatoreNome: string;
  clienteNome: string;
  clienteCognome: string | null;
  clienteTelefono: string;
  clienteEmail: string | null;
};

function formattaGiorno(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Rome',
  }).format(new Date(iso));
}

function formattaOra(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Rome',
  }).format(new Date(iso));
}

async function inviaEmail(apiKey: string, mittente: string, destinatario: string, oggetto: string, testo: string) {
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
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const mittente = Deno.env.get('EMAIL_MITTENTE');
    const emailTitolare = Deno.env.get('EMAIL_TITOLARE');

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
    // Difesa in profondità: qualunque cosa vada storta qui, la prenotazione resta valida.
    console.error('[prenota] invio email fallito in modo imprevisto:', (e as Error).message);
  }
}
