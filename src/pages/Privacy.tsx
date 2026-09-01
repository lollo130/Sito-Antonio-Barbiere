import Intestazione from '../components/layout/Intestazione';
import Piede from '../components/layout/Piede';
import { EMAIL_SALONE, INDIRIZZO_SALONE } from '../lib/salone';

// SPECIFICA.md § 10 — Privacy: titolare è il salone (non lo sviluppatore),
// finalità, dati raccolti, conservazione, come chiedere la cancellazione.
export default function Privacy() {
  return (
    <>
      <Intestazione />

      <main className="font-lettura mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-titolo text-3xl font-semibold text-inchiostro">Privacy</h1>

        <div className="mt-8 flex flex-col gap-6 text-lg leading-relaxed text-inchiostro">
          <div>
            <p className="font-semibold text-inchiostro">Titolare del trattamento</p>
            <p>
              Il salone, {INDIRIZZO_SALONE}. Per qualsiasi richiesta sui tuoi dati scrivi a{' '}
              <a className="underline" href={`mailto:${EMAIL_SALONE}`}>
                {EMAIL_SALONE}
              </a>
              .
            </p>
          </div>

          <div>
            <p className="font-semibold text-inchiostro">Perché raccogliamo i tuoi dati</p>
            <p>Solo per gestire la tua prenotazione: sapere chi aspettare e come contattarti se qualcosa cambia.</p>
          </div>

          <div>
            <p className="font-semibold text-inchiostro">Quali dati raccogliamo</p>
            <p>Nome e numero di telefono. Cognome ed email solo se li lasci tu, sono facoltativi.</p>
          </div>

          <div>
            <p className="font-semibold text-inchiostro">Quanto li conserviamo</p>
            <p>Il tempo necessario a gestire la prenotazione e lo storico del salone, poi vengono cancellati.</p>
          </div>

          <div>
            <p className="font-semibold text-inchiostro">Come chiedere la cancellazione</p>
            <p>Scrivi o chiama il salone: cancelliamo i tuoi dati su richiesta, salvo obblighi di legge.</p>
          </div>
        </div>
      </main>

      <Piede />
    </>
  );
}
