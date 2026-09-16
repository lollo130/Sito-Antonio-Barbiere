import { useState } from 'react';
import { agendaDelMese, dimenticaAgenda, precarica } from '../lib/agenda';
import { annoMeseDi, dataRomaDi } from '../lib/data';
import ChiamaSalone from '../components/prenotazione/ChiamaSalone';
import Progresso from '../components/prenotazione/Progresso';
import ConfermaPrenotazione from './prenotazione/ConfermaPrenotazione';
import Passo1Servizio, { type Servizio } from './prenotazione/Passo1Servizio';
import Passo2Quando from './prenotazione/Passo2Quando';
import Passo3Operatore from './prenotazione/Passo3Operatore';
import Passo4Dati from './prenotazione/Passo4Dati';
import type { PrenotazioneConfermata } from '../lib/prenota';
import { NOME_SALONE, SOTTOTITOLO_SALONE } from '../lib/salone';

// Le quattro schermate di SPECIFICA.md § 5, più la conferma finale.
export default function Prenota() {
  const [servizio, setServizio] = useState<Servizio | null>(null);
  const [inizio, setInizio] = useState<string | null>(null);
  const [operatore, setOperatore] = useState<string | null | undefined>(undefined);
  const [prenotazione, setPrenotazione] = useState<PrenotazioneConfermata | null>(null);

  const passo = !servizio ? 1 : !inizio ? 2 : operatore === undefined ? 3 : 4;

  return (
    <>
      {/* Solo l'insegna, senza navigazione né telefono: qui si fa una cosa
          sola, e il numero sta già nel bottone "Chiama il salone" qui sotto,
          che per specifica deve restare visibile a ogni passo.
          Scura come quella delle pagine pubbliche: chi tocca "Prenota ora"
          non deve vedere la testata cambiare colore sotto le mani. */}
      <header className="border-b border-bronzo bg-verde-scuro px-5 py-2.5">
        <div className="mx-auto max-w-md">
          <p className="font-titolo text-xl font-bold leading-none tracking-wide text-carta-chiara">
            {NOME_SALONE}
          </p>
          <p className="mt-1 text-[0.58rem] uppercase leading-none tracking-[0.18em] text-cuoio-chiaro">
            {SOTTOTITOLO_SALONE}
          </p>
        </div>
      </header>

      <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-7">
      {!prenotazione && <Progresso passo={passo} />}
      <ChiamaSalone />

      {!servizio && (
        <Passo1Servizio
          onScelto={(s) => {
            // Il calendario parte QUI, non quando appare la schermata dopo.
            // È la stessa chiamata che farà il passo 2: la cache tiene la
            // promessa, quindi là non ne parte una seconda — o la trova
            // arrivata, o si mette in coda a questa. Guadagnati gratis i
            // decimi fra il tocco e il disegno della schermata, che è anche
            // il momento in cui si sveglia la funzione se dormiva.
            precarica(agendaDelMese(s.id, annoMeseDi(dataRomaDi(new Date().toISOString()))));
            setServizio(s);
          }}
        />
      )}

      {servizio && !inizio && (
        <Passo2Quando servizio={servizio} onScelto={setInizio} onIndietro={() => setServizio(null)} />
      )}

      {servizio && inizio && operatore === undefined && (
        <Passo3Operatore servizio={servizio} onScelto={setOperatore} onIndietro={() => setInizio(null)} />
      )}

      {servizio && inizio && operatore !== undefined && !prenotazione && (
        <Passo4Dati
          servizio={servizio}
          inizio={inizio}
          operatorePreferenza={operatore}
          onIndietro={() => setOperatore(undefined)}
          onConfermata={(p) => {
            // Da adesso ogni risposta tenuta da parte descrive un'agenda che
            // non esiste piu': quello slot l'ha appena preso questo cliente.
            dimenticaAgenda();
            setPrenotazione(p);
          }}
        />
      )}

      {prenotazione && <ConfermaPrenotazione prenotazione={prenotazione} />}
      </main>
    </>
  );
}
