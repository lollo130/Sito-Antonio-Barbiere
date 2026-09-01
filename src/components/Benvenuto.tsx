import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NOME_SALONE, ANNO_FONDAZIONE } from '../lib/salone';
import { salvaCliente, validaCliente } from '../lib/cliente';

// Prima apertura dell'app: si presenta e basta.
//
// Compare SOLO dentro l'app installata (vedi App.tsx), mai a chi apre il
// sito dal browser: a un visitatore che cerca gli orari non si sbarra la
// strada con un modulo. Chi ha installato l'app, invece, l'ha fatto per
// prenotare, e scrivere il numero una volta sola gli risparmia di riscriverlo
// per sempre.
//
// Non è una registrazione: niente password, niente email, niente server.
// Resta tutto sul suo telefono.
export default function Benvenuto({ onFatto }: { onFatto: () => void }) {
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [errore, setErrore] = useState<string | null>(null);

  function conferma() {
    const problema = validaCliente(nome, cognome, telefono);
    if (problema) return setErrore(problema);
    salvaCliente({ nome: nome.trim(), cognome: cognome.trim(), telefono: telefono.trim() });
    onFatto();
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-5 py-10">
      <p className="font-titolo text-[0.66rem] uppercase tracking-[0.24em] text-marrone">
        Dal {ANNO_FONDAZIONE} a Solarino
      </p>
      <h1 className="mt-3 font-titolo text-3xl font-bold uppercase leading-tight text-inchiostro">
        Benvenuto da {NOME_SALONE}
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-grigio">
        Scrivi il tuo nome e il tuo numero una volta sola. Da qui in avanti per prenotare ti
        basteranno pochi tocchi: non dovrai più riscriverli.
      </p>

      {errore && (
        <p className="mt-5 rounded-lg border-2 border-allarme bg-allarme-sfondo px-4 py-3 text-lg font-bold text-allarme-testo">
          {errore}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        <Campo etichetta="Nome" valore={nome} onCambia={setNome} tipo="text" auto="given-name" />
        <Campo
          etichetta="Cognome"
          valore={cognome}
          onCambia={setCognome}
          tipo="text"
          auto="family-name"
        />
        <Campo
          etichetta="Telefono"
          valore={telefono}
          onCambia={setTelefono}
          tipo="tel"
          auto="tel"
          aiuto="Serve al salone per avvisarti se cambia qualcosa."
        />
      </div>

      <button
        type="button"
        onClick={conferma}
        className="mt-7 min-h-[60px] rounded-lg bg-verde font-titolo text-xl font-bold uppercase tracking-wide text-carta-chiara"
      >
        Comincia
      </button>

      <p className="mt-5 text-sm leading-relaxed text-grigio">
        I dati restano su questo telefono e servono solo a compilare le tue prenotazioni. Non c'è
        nessuna password e nessun account.{' '}
        <Link to="/privacy" className="font-bold text-marrone underline">
          Come trattiamo i dati
        </Link>
        .
      </p>
    </main>
  );
}

function Campo({
  etichetta,
  valore,
  onCambia,
  tipo,
  auto,
  aiuto,
}: {
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
  tipo: 'text' | 'tel';
  auto: string;
  aiuto?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-titolo text-base font-bold text-inchiostro">{etichetta}</span>
      <input
        type={tipo}
        autoComplete={auto}
        value={valore}
        onChange={(e) => onCambia(e.target.value)}
        className="min-h-[56px] rounded-lg border-2 border-bordo bg-carta-chiara px-4 text-lg text-inchiostro focus:border-verde focus:outline-none"
      />
      {aiuto && <span className="text-sm text-grigio">{aiuto}</span>}
    </label>
  );
}
