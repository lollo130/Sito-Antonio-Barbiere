import Intestazione from '../components/layout/Intestazione';
import Piede from '../components/layout/Piede';
import { EMAIL_SALONE, INDIRIZZO_SALONE } from '../lib/salone';

// SPECIFICA.md § 10 — Privacy: titolare è il salone (non lo sviluppatore),
// finalità, dati raccolti, conservazione, come chiedere la cancellazione.
export default function Privacy() {
  return (
    <>
      <Intestazione />

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-titolo text-3xl font-semibold text-stone-900">Privacy</h1>

        <div className="mt-8 flex flex-col gap-6 text-lg leading-relaxed text-stone-800">
          <div>
            <p className="font-semibold text-stone-900">Titolare del trattamento</p>
            <p>
              Il salone, {INDIRIZZO_SALONE}. Per qualsiasi richiesta sui tuoi dati scrivi a{' '}
              <a className="underline" href={`mailto:${EMAIL_SALONE}`}>
                {EMAIL_SALONE}
              </a>
              .
            </p>
          </div>

          <div>
            <p className="font-semibold text-stone-900">Perché raccogliamo i tuoi dati</p>
            <p>Solo per gestire la tua prenotazione: sapere chi aspettare e come contattarti se qualcosa cambia.</p>
          </div>

          <div>
            <p className="font-semibold text-stone-900">Quali dati raccogliamo</p>
            <p>Nome e numero di telefono. Cognome ed email solo se li lasci tu, sono facoltativi.</p>
          </div>

          <div>
            <p className="font-semibold text-stone-900">Quanto li conserviamo</p>
            <p>Il tempo necessario a gestire la prenotazione e lo storico del salone, poi vengono cancellati.</p>
          </div>

          <div>
            <p className="font-semibold text-stone-900">Come chiedere la cancellazione</p>
            <p>Scrivi o chiama il salone: cancelliamo i tuoi dati su richiesta, salvo obblighi di legge.</p>
          </div>
        </div>
      </main>

      <Piede />
    </>
  );
}
