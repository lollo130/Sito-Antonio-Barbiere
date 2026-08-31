import { useState } from 'react';
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
      {/* Solo l'insegna, senza navigazione: qui si fa una cosa sola. */}
      <header className="border-b border-bordo bg-carta-chiara px-5 py-3">
        <div className="mx-auto max-w-md">
          <p className="font-titolo text-2xl leading-tight text-inchiostro">{NOME_SALONE}</p>
          <p className="text-[0.62rem] uppercase tracking-[0.14em] text-marrone">
            {SOTTOTITOLO_SALONE}
          </p>
        </div>
      </header>

      <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-7">
      {!prenotazione && <Progresso passo={passo} />}
      <ChiamaSalone />

      {!servizio && <Passo1Servizio onScelto={setServizio} />}

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
          onConfermata={setPrenotazione}
        />
      )}

      {prenotazione && <ConfermaPrenotazione prenotazione={prenotazione} />}
      </main>
    </>
  );
}
