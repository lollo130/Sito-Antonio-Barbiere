import { useState } from 'react';
import BottoneScelta from '../../components/prenotazione/BottoneScelta';
import { formattaGiornoEsteso, formattaOra, dataRomaDi } from '../../lib/data';
import { chiamaPrenota, type PrenotazioneConfermata, type SlotAlternativo } from '../../lib/prenota';
import type { Servizio } from './Passo1Servizio';

// SPECIFICA.md § 5, passo 4: solo nome e telefono obbligatori.

const TELEFONO_REGEX = /^[0-9+ ]{8,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function valida(nome: string, telefono: string, email: string): string | null {
  if (nome.trim().length < 2 || nome.trim().length > 60) return 'Manca il nome, o non è valido.';
  if (!TELEFONO_REGEX.test(telefono.trim())) return 'Manca il numero di telefono, o non è valido.';
  if (email.trim() && !EMAIL_REGEX.test(email.trim())) return "L'indirizzo email non è valido.";
  return null;
}

const classeCampo =
  'min-h-[56px] w-full rounded-xl border-2 border-stone-300 px-4 text-lg text-stone-900 focus:border-stone-900 focus:outline-none';
const classeEtichetta = 'block text-lg font-semibold text-stone-900';

type Props = {
  servizio: Servizio;
  inizio: string;
  operatorePreferenza: string | null;
  onIndietro: () => void;
  onConfermata: (prenotazione: PrenotazioneConfermata) => void;
};

export default function Passo4Dati({ servizio, inizio, operatorePreferenza, onIndietro, onConfermata }: Props) {
  const [inizioEffettivo, setInizioEffettivo] = useState(inizio);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [alternative, setAlternative] = useState<SlotAlternativo[] | null>(null);

  async function invia(inizioDaUsare: string) {
    const erroreCampi = valida(nome, telefono, email);
    if (erroreCampi) {
      setErrore(erroreCampi);
      return;
    }
    setErrore(null);
    setAlternative(null);
    setInviando(true);

    try {
      const risposta = await chiamaPrenota({
        servizio_id: servizio.id,
        operatore_id: operatorePreferenza,
        inizio: inizioDaUsare,
        cliente_nome: nome.trim(),
        cliente_cognome: cognome.trim() || undefined,
        cliente_telefono: telefono.trim(),
        cliente_email: email.trim() || undefined,
      });

      if (!risposta.ok) {
        setErrore(risposta.errore);
        if (risposta.codice === 'slot_non_disponibile') {
          setAlternative(risposta.alternative ?? []);
        }
        return;
      }

      onConfermata(risposta.prenotazione);
    } catch {
      setErrore('Non riesco a completare la prenotazione. Riprova tra poco, o chiama il salone.');
    } finally {
      setInviando(false);
    }
  }

  function scegliAlternativa(slot: SlotAlternativo) {
    setInizioEffettivo(slot.inizio);
    setAlternative(null);
    invia(slot.inizio);
  }

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onIndietro} className="self-start text-lg font-medium text-stone-600">
        ‹ Indietro
      </button>
      <h1 className="font-titolo text-3xl font-semibold text-stone-900">I tuoi dati</h1>

      <p className="text-lg text-stone-700">
        {servizio.nome} — {formattaGiornoEsteso(dataRomaDi(inizioEffettivo))}, alle {formattaOra(inizioEffettivo)}
      </p>

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          invia(inizioEffettivo);
        }}
      >
        <div className="flex flex-col gap-2">
          <label className={classeEtichetta} htmlFor="nome">
            Nome
          </label>
          <input
            id="nome"
            type="text"
            autoComplete="given-name"
            className={classeCampo}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={classeEtichetta} htmlFor="cognome">
            Cognome <span className="font-normal text-stone-600">(facoltativo)</span>
          </label>
          <input
            id="cognome"
            type="text"
            autoComplete="family-name"
            className={classeCampo}
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={classeEtichetta} htmlFor="telefono">
            Telefono
          </label>
          <input
            id="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={classeCampo}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={classeEtichetta} htmlFor="email">
            Email <span className="font-normal text-stone-600">(facoltativa)</span>
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={classeCampo}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <p className="text-base text-stone-600">
          I tuoi dati servono solo per gestire la prenotazione.{' '}
          <a href="/privacy" className="underline">
            Leggi come li trattiamo.
          </a>
        </p>

        {errore && <p className="text-lg font-medium text-red-700">{errore}</p>}

        {alternative && alternative.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-lg text-stone-700">Puoi scegliere uno di questi orari:</p>
            {alternative.map((s) => (
              <BottoneScelta
                key={s.inizio}
                etichetta={`${formattaGiornoEsteso(dataRomaDi(s.inizio))}, alle ${formattaOra(s.inizio)}`}
                onClick={() => scegliAlternativa(s)}
              />
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={inviando}
          className="flex min-h-[56px] w-full items-center justify-center rounded-xl bg-stone-900 px-6 text-lg font-semibold text-white disabled:opacity-60"
        >
          {inviando ? 'Prenoto…' : 'Prenota'}
        </button>
      </form>
    </div>
  );
}
