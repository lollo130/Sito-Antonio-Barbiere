import Intestazione from '../components/layout/Intestazione';
import Piede from '../components/layout/Piede';
import { CATEGORIE_IN_USO, apriPreferenze } from '../lib/consenso';
import { EMAIL_SALONE, NOME_SALONE } from '../lib/salone';

// Informativa cookie, separata dalla privacy policy come chiedono le
// Linee guida del Garante del 10 giugno 2021.
export default function Cookie() {
  return (
    <>
      <Intestazione />

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-titolo text-3xl font-bold uppercase text-inchiostro">
          Informativa sui cookie
        </h1>

        <p className="font-lettura mt-5 text-lg leading-relaxed text-grigio">
          Questo sito usa pochissime cose e le diciamo in chiaro. Non c'è pubblicità, non c'è
          profilazione, non vendiamo dati a nessuno.
        </p>

        <Sezione titolo="Cosa sono i cookie">
          <p>
            Sono piccoli file che un sito lascia sul tuo telefono o computer. Alcuni servono a far
            funzionare il sito e basta. Altri servono a chi lo gestisce per capire come viene usato,
            o a servizi esterni per riconoscerti. I primi si possono usare senza chiedere niente, per
            i secondi serve il tuo permesso.
          </p>
        </Sezione>

        <Sezione titolo="Quelli che usiamo (tecnici)">
          <Elenco
            voci={[
              [
                'Sessione del pannello',
                "Solo per il titolare del salone quando entra nella propria area riservata. Serve a non dover reinserire la password a ogni pagina. Non riguarda i clienti che prenotano.",
              ],
              [
                'Scelta sui cookie',
                'Se scegli cosa accettare, ci ricordiamo la tua scelta per non richiedertela ogni volta.',
              ],
            ]}
          />
          <p className="mt-4">
            Sono cookie <strong>tecnici</strong>: la legge non richiede il tuo consenso e non si
            possono disattivare, perché senza il sito non funziona.
          </p>
        </Sezione>

        <Sezione titolo="Quelli che NON usiamo">
          <Elenco
            voci={[
              ['Statistiche e analisi', 'Nessuna. Non sappiamo chi visita il sito.'],
              ['Pubblicità e profilazione', 'Nessuna.'],
              ['Bottoni e riquadri dei social', 'Nessuno.'],
              [
                'Caratteri esterni',
                'I caratteri del sito sono ospitati sul nostro server, non su Google: aprendo questa pagina non contatti nessun altro sito.',
              ],
            ]}
          />
        </Sezione>

        {CATEGORIE_IN_USO.length > 0 && (
          <Sezione titolo="Quelli per cui ti chiediamo il permesso">
            <Elenco voci={CATEGORIE_IN_USO.map((c) => [c.nome, c.descrizione])} />
            <button
              type="button"
              onClick={apriPreferenze}
              className="mt-5 min-h-[56px] w-full rounded-lg border-2 border-verde font-titolo text-lg font-bold uppercase text-verde"
            >
              Cambia le tue scelte
            </button>
          </Sezione>
        )}

        <Sezione titolo="Come cancellarli">
          <p>
            Puoi cancellare i cookie dalle impostazioni del tuo browser, nella sezione dedicata alla
            privacy o ai dati dei siti. Se lo fai dovrai rifare l'accesso al pannello, se sei il
            titolare. Per chi prenota non cambia nulla: il sito funziona senza registrazione.
          </p>
        </Sezione>

        <Sezione titolo="Chi tratta i dati">
          <p>
            Il titolare del trattamento è {NOME_SALONE}, [RAGIONE SOCIALE], con sede a Solarino (SR),
            P. IVA [NUMERO]. Per qualsiasi richiesta puoi scrivere a{' '}
            <a href={`mailto:${EMAIL_SALONE}`} className="font-bold text-marrone underline">
              {EMAIL_SALONE}
            </a>{' '}
            o chiamare il salone.
          </p>
        </Sezione>

        <p className="mt-10 text-sm text-grigio">Ultimo aggiornamento: agosto 2026.</p>
      </main>

      <Piede />
    </>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="font-titolo text-xl font-bold uppercase tracking-wide text-inchiostro">
        {titolo}
      </h2>
      <div className="font-lettura mt-3 flex flex-col gap-3 text-lg leading-relaxed text-grigio">{children}</div>
    </section>
  );
}

function Elenco({ voci }: { voci: [string, string][] }) {
  return (
    <dl className="overflow-hidden rounded-lg border-2 border-bordo">
      {voci.map(([nome, testo], i) => (
        <div key={nome} className={`bg-carta-chiara px-4 py-3 ${i > 0 ? 'border-t border-bordo' : ''}`}>
          <dt className="font-titolo text-base font-bold text-inchiostro">{nome}</dt>
          <dd className="font-lettura mt-1 text-base leading-relaxed text-grigio">{testo}</dd>
        </div>
      ))}
    </dl>
  );
}
