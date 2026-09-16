import { useState } from 'react';
import Intestazione from '../components/layout/Intestazione';
import Piede from '../components/layout/Piede';
import { dimenticaCliente, leggiCliente } from '../lib/cliente';
import {
  AGGIORNAMENTO_INFORMATIVA,
  EMAIL_SALONE,
  INDIRIZZO_SALONE,
  MESI_CONSERVAZIONE,
  NOME_SALONE,
  PARTITA_IVA,
  RAGIONE_SOCIALE,
  TELEFONO_SALONE,
  TELEFONO_SALONE_TEL,
} from '../lib/salone';

// Informativa privacy — GDPR (Reg. UE 2016/679) art. 13.
//
// L'articolo 13 elenca cosa va detto a chi lascia i propri dati, e non è un
// elenco a piacere: chi è il titolare, perché tratti i dati, con quale base
// giuridica, chi altro li vede, dove finiscono, per quanto li tieni, che
// diritti ha la persona e a chi può fare reclamo. Mancarne uno rende
// l'informativa incompleta anche se il testo è simpatico.
//
// Scritta in italiano semplice, non in legalese: la leggono anche persone
// anziane, ed è una richiesta del progetto, non un vezzo. Le voci di legge
// stanno nei commenti, non addosso al lettore.
export default function Privacy() {
  return (
    <>
      <Intestazione />

      <main className="font-lettura mx-auto max-w-2xl px-5 pb-12 pt-24">
        <h1 className="font-titolo text-3xl font-semibold text-inchiostro">Privacy</h1>
        <p className="mt-3 text-base text-grigio">
          Ultimo aggiornamento: {AGGIORNAMENTO_INFORMATIVA}
        </p>

        <div className="mt-8 flex flex-col gap-7 text-lg leading-relaxed text-inchiostro">
          <Voce titolo="In due righe">
            <p>
              Per prenotare ci servono il tuo nome e il tuo numero di telefono. Li usiamo solo per
              tenerti il posto e avvisarti se qualcosa cambia. Non li vendiamo, non li diamo a
              nessuno per farti pubblicità, e li cancelliamo se ce lo chiedi.
            </p>
          </Voce>

          {/* Art. 13.1.a — identità e dati di contatto del titolare. */}
          <Voce titolo="Chi tratta i tuoi dati">
            <p>
              Il titolare del trattamento è {RAGIONE_SOCIALE} ({NOME_SALONE}), {INDIRIZZO_SALONE},
              P. IVA {PARTITA_IVA}.
            </p>
            <p className="mt-2">
              Per qualsiasi cosa riguardi i tuoi dati puoi scrivere a{' '}
              <a className="font-bold text-marrone underline" href={`mailto:${EMAIL_SALONE}`}>
                {EMAIL_SALONE}
              </a>{' '}
              oppure chiamare il{' '}
              <a className="font-bold text-marrone underline" href={TELEFONO_SALONE_TEL}>
                {TELEFONO_SALONE}
              </a>
              .
            </p>
          </Voce>

          <Voce titolo="Quali dati raccogliamo">
            <p>
              Quando prenoti dal sito: <strong>nome</strong> e <strong>numero di telefono</strong>,
              che sono obbligatori. <strong>Cognome</strong> ed <strong>email</strong> solo se li
              scrivi tu: sono facoltativi e servono a mandarti la conferma.
            </p>
            <p className="mt-2">
              Insieme a questi restano registrati il servizio che hai scelto, il giorno e l'ora, e
              chi te lo farà.
            </p>
            <p className="mt-2">
              Non chiediamo documenti, non chiediamo dati di pagamento, non c'è nessuna
              registrazione e nessuna password: il sito non ti crea un account.
            </p>
          </Voce>

          {/* Art. 13.1.c — finalità e base giuridica. Art. 13.2.e — natura
              del conferimento e conseguenze del rifiuto. */}
          <Voce titolo="Perché li raccogliamo, e con quale diritto">
            <p>
              Per un motivo solo: gestire la tua prenotazione. Sapere chi aspettare, per quale
              servizio, e poterti avvisare se dobbiamo spostare o disdire.
            </p>
            <p className="mt-2">
              La legge lo consente perché serve a darti il servizio che ci hai chiesto: è
              l'esecuzione di un accordo fra te e il salone. Non ti chiediamo un consenso separato,
              perché senza questi dati la prenotazione non si può proprio prendere. Se preferisci
              non lasciarli, chiama il salone e fissiamo l'appuntamento a voce.
            </p>
          </Voce>

          {/* Art. 13.1.e — destinatari. */}
          <Voce titolo="Chi altro li vede">
            <p>
              Nessuno, a parte chi lavora in salone e le società che ci forniscono gli strumenti
              tecnici. Queste trattano i dati per conto nostro, sono vincolate da un contratto e
              non possono usarli per i fatti loro:
            </p>
            <Elenco
              voci={[
                ['Google', 'Fornisce il database e i programmi che tengono l\'agenda (Firebase).'],
                ['Netlify', 'Ospita le pagine del sito.'],
                [
                  'Resend',
                  'Spedisce le email di conferma. Entra in gioco solo se lasci il tuo indirizzo email.',
                ],
              ]}
            />
            <p className="mt-3">
              I tuoi dati non vengono venduti, non vengono ceduti a fini pubblicitari e non vengono
              pubblicati da nessuna parte.
            </p>
          </Voce>

          {/* Art. 13.1.f — trasferimenti verso paesi terzi. */}
          <Voce titolo="Dove sono conservati">
            <p>
              Il database e i programmi che lo usano stanno su server in Europa. Google è però una
              società statunitense e in alcuni casi tecnici i dati possono essere consultati fuori
              dall'Unione Europea: succede sulla base della decisione di adeguatezza della
              Commissione Europea sugli Stati Uniti e delle clausole contrattuali standard.
            </p>
          </Voce>

          {/* Art. 13.2.a — periodo di conservazione. */}
          <Voce titolo="Per quanto li teniamo">
            <p>
              Le prenotazioni restano in archivio {MESI_CONSERVAZIONE} mesi dalla data
              dell'appuntamento, poi vengono cancellate. Serve al salone per avere lo storico di chi
              è passato e quando.
            </p>
            <p className="mt-2">
              Se ci chiedi di cancellare i tuoi dati prima, lo facciamo — salvo quello che siamo
              obbligati a conservare per legge, per esempio i documenti fiscali.
            </p>
          </Voce>

          {/* Art. 15-22 — diritti dell'interessato. */}
          <Voce titolo="Cosa puoi chiedere">
            <p>In qualsiasi momento, e gratis, hai diritto di chiedere:</p>
            <Elenco
              voci={[
                ['Di vederli', 'Sapere quali dati abbiamo su di te e averne una copia.'],
                ['Di correggerli', 'Se il nome è sbagliato o hai cambiato numero.'],
                ['Di cancellarli', 'Togliamo tutto, salvo obblighi di legge.'],
                ['Di limitarne l\'uso', 'Li teniamo fermi senza usarli, mentre si chiarisce qualcosa.'],
                ['Di portarli altrove', 'Te li diamo in un file leggibile da un altro programma.'],
                ['Di opporti', 'Puoi dirci di smettere di usarli.'],
              ]}
            />
            <p className="mt-3">
              Basta scrivere a{' '}
              <a className="font-bold text-marrone underline" href={`mailto:${EMAIL_SALONE}`}>
                {EMAIL_SALONE}
              </a>{' '}
              o chiamare il salone. Rispondiamo entro un mese.
            </p>
          </Voce>

          {/* Art. 13.2.d — diritto di reclamo all'autorità di controllo. */}
          <Voce titolo="Se pensi che sbagliamo">
            <p>
              Puoi rivolgerti al Garante per la protezione dei dati personali, Piazza Venezia 11,
              00187 Roma —{' '}
              <a
                className="font-bold text-marrone underline"
                href="https://www.garanteprivacy.it"
                rel="noopener"
              >
                garanteprivacy.it
              </a>
              . Puoi anche rivolgerti al giudice.
            </p>
          </Voce>

          {/* Art. 13.2.f — processi decisionali automatizzati. */}
          <Voce titolo="Niente decisioni automatiche">
            <p>
              Non c'è nessun sistema che decide qualcosa su di te da solo, e non ti profiliamo: non
              costruiamo nessuna scheda sulle tue abitudini.
            </p>
          </Voce>

          <Voce titolo="I dati che restano sul tuo telefono">
            <p>
              Per non farti riscrivere tutto a ogni prenotazione, il sito ricorda nome, cognome e
              numero <strong>dentro il tuo telefono o computer</strong>. Non è un account: quei dati
              non vengono spediti da nessuna parte se non quando prenoti davvero, e spariscono se
              cancelli i dati del browser o disinstalli l'app.
            </p>
            <p className="mt-3">Se vuoi toglierli subito da questo dispositivo:</p>
            <BottoneDimentica />
          </Voce>
        </div>
      </main>

      <Piede />
    </>
  );
}

function Voce({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-titolo text-xl font-bold text-inchiostro">{titolo}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Elenco({ voci }: { voci: [string, string][] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {voci.map(([nome, cosa]) => (
        <li key={nome}>
          <strong>{nome}</strong> — {cosa}
        </li>
      ))}
    </ul>
  );
}

/**
 * "Dimentica i miei dati".
 *
 * L'informativa dice che i dati ricordati sul dispositivo si possono
 * togliere: senza un pulsante che lo faccia davvero sarebbe una frase e
 * basta. Compare solo se c'è qualcosa da cancellare.
 */
function BottoneDimentica() {
  // Letto una volta all'avvio invece che dentro un effetto: leggiCliente()
  // non lancia mai (ha il suo try/catch per il browser in incognito) e così
  // il pulsante compare subito, senza il lampeggio del primo render.
  const [presenti] = useState(() => leggiCliente() !== null);
  const [fatto, setFatto] = useState(false);

  if (fatto) {
    return (
      <p className="mt-3 text-lg font-semibold text-verde">
        Fatto: su questo dispositivo non è rimasto niente.
      </p>
    );
  }

  if (!presenti) {
    return (
      <p className="mt-3 text-base text-grigio">
        Su questo dispositivo non c'è nessun dato ricordato.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        dimenticaCliente();
        setFatto(true);
      }}
      className="mt-3 min-h-[56px] w-full rounded-lg border-2 border-verde px-6 font-titolo text-lg font-bold uppercase text-verde"
    >
      Dimentica i miei dati
    </button>
  );
}
