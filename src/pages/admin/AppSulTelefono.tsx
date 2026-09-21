import { useState } from 'react';
import type { ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import GuscioAdmin from '../../components/admin/GuscioAdmin';
import { useInstallazione } from '../../lib/installazione';

// "Metti l'agenda sul telefono".
//
// Non è la stessa cosa della pagina /installa, che è per i clienti: quella
// installa il salone e si apre sulle prenotazioni. Questa installa l'agenda
// e si apre sul lavoro del titolare. Sono due app diverse, con due icone
// diverse, e possono stare tutte e due sullo stesso telefono (il come sta
// in src/lib/installazione.ts).
//
// Il titolare non ha un computer: questa non è una comodità in più, è il
// modo in cui userà il pannello tutti i giorni. Per questo la pagina dice
// una cosa sola, con un'azione sola, e le istruzioni cambiano da sole a
// seconda del telefono invece di elencare tutti i casi possibili.
//
// NON è collegata da nessuna parte, di proposito: né dal sito, né dal menu
// del pannello. Ci si arriva solo scrivendo l'indirizzo, perché l'indirizzo
// si manda a una persona sola. Non è una misura di sicurezza — quella la fa
// l'accesso, che sta comunque davanti — è che una voce di menu "installa
// l'app" letta dal titolare tutti i giorni, quando l'app ce l'ha già
// installata, è solo una cosa in più da non toccare.

/** L'indirizzo di questa pagina: è quello che si manda al titolare. */
function indirizzoInstalla(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/admin/installa`;
}

export default function AppSulTelefono() {
  const { ambiente, installa, invito, esito } = useInstallazione();
  const [copiato, setCopiato] = useState(false);
  const indirizzo = indirizzoInstalla();

  return (
    <GuscioAdmin
      titolo={'L’agenda sul telefono'}
      sottotitolo={'Un’icona che apre direttamente l’agenda, senza passare dal sito'}
      indietro={{ a: '/admin', etichetta: 'Torna all’agenda' }}
    >
      {ambiente === 'installata' && (
        <Riquadro>
          <p className="text-lg font-bold text-inchiostro">
            Su questo telefono è già installata.
          </p>
          <p className="text-base leading-relaxed text-grigio">
            Stai leggendo dentro l&rsquo;app: l&rsquo;icona dell&rsquo;agenda è già fra le altre.
            Per metterla anche su un secondo telefono, apri{' '}
            <strong className="break-all text-inchiostro">{indirizzo}</strong> da quel telefono.
          </p>
        </Riquadro>
      )}

      {ambiente === 'android' && (
        <>
          <p className="text-lg leading-relaxed text-inchiostro">
            Tocca il pulsante qui sotto. L&rsquo;icona dell&rsquo;agenda comparirà fra le altre
            app, e da lì l&rsquo;agenda si apre da sola: niente indirizzi da scrivere, niente
            password da rifare ogni volta.
          </p>
          {invito ? (
            <button
              type="button"
              onClick={installa}
              disabled={esito === 'in-corso'}
              className="flex min-h-[64px] items-center justify-center rounded-lg bg-verde px-6 font-titolo text-lg font-bold uppercase tracking-wide text-carta-chiara disabled:opacity-60"
            >
              {esito === 'in-corso' ? 'Un attimo…' : 'Installa l’agenda'}
            </button>
          ) : (
            <Riquadro>
              <p className="text-lg font-bold text-inchiostro">Il pulsante non c&rsquo;è?</p>
              <p className="text-base leading-relaxed text-grigio">
                Apri il menu del browser — i tre puntini in alto a destra — e scegli{' '}
                <strong className="text-inchiostro">Installa app</strong>, oppure{' '}
                <strong className="text-inchiostro">Aggiungi a schermata Home</strong>. Se
                nessuna delle due compare, l&rsquo;agenda è già installata.
              </p>
            </Riquadro>
          )}
          {esito === 'rifiutata' && (
            <p className="text-base text-grigio">
              Installazione annullata. Ricarica la pagina per riprovare.
            </p>
          )}
        </>
      )}

      {ambiente === 'ios-safari' && (
        <>
          <p className="text-lg leading-relaxed text-inchiostro">
            Su iPhone si fa a mano, in tre passaggi. Dopo, l&rsquo;agenda si apre da
            un&rsquo;icona come tutte le altre app.
          </p>
          <ol className="flex flex-col gap-4">
            <Passo numero={1}>
              Tocca il tasto <strong className="text-inchiostro">Condividi</strong> in fondo allo
              schermo: è il quadrato con la freccia che punta in alto.
            </Passo>
            <Passo numero={2}>
              Scorri l&rsquo;elenco e tocca{' '}
              <strong className="text-inchiostro">Aggiungi a schermata Home</strong>.
            </Passo>
            <Passo numero={3}>
              Tocca <strong className="text-inchiostro">Aggiungi</strong> in alto a destra.
            </Passo>
          </ol>
        </>
      )}

      {ambiente === 'ios-altro' && (
        <Riquadro>
          <p className="text-lg font-bold text-inchiostro">Serve Safari</p>
          <p className="text-base leading-relaxed text-grigio">
            Su iPhone solo Safari sa mettere le app sulla schermata Home. Apri{' '}
            <strong className="text-inchiostro">{indirizzo}</strong> con Safari e torna qui:
            troverai i passaggi.
          </p>
        </Riquadro>
      )}

      {ambiente === 'desktop' && (
        <>
          <Riquadro>
            <p className="text-lg font-bold text-inchiostro">Questo è un computer</p>
            <p className="text-base leading-relaxed text-grigio">
              L&rsquo;agenda si installa dal telefono su cui deve restare. Manda questo
              indirizzo al titolare, o fagli inquadrare il codice con la fotocamera: si apre
              questa stessa pagina, che lì avrà il pulsante giusto per il suo telefono.
            </p>
          </Riquadro>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-lg border-2 border-bordo bg-carta-chiara p-3">
              {indirizzo && (
                <QRCodeSVG
                  value={indirizzo}
                  size={168}
                  className="h-full w-full"
                  title={'Codice QR per aprire l’agenda'}
                />
              )}
            </div>

            <div className="flex w-full flex-col gap-3">
              <p className="break-all font-titolo text-base text-grigio">{indirizzo}</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(indirizzo);
                    setCopiato(true);
                    setTimeout(() => setCopiato(false), 2500);
                  } catch {
                    setCopiato(false);
                  }
                }}
                className="min-h-[56px] rounded-lg border-2 border-verde px-5 font-titolo text-base font-bold uppercase tracking-wide text-verde"
              >
                {copiato ? 'Indirizzo copiato' : 'Copia l’indirizzo'}
              </button>
            </div>
          </div>
        </>
      )}

      <hr className="border-bordo" />

      <div className="flex flex-col gap-2">
        <p className="font-titolo text-base font-bold uppercase tracking-wide text-inchiostro">
          Due icone, due cose diverse
        </p>
        <p className="text-base leading-relaxed text-grigio">
          L&rsquo;icona <strong className="text-inchiostro">verde con la A</strong> è il salone
          come lo vedono i clienti. Quella{' '}
          <strong className="text-inchiostro">marrone col calendario</strong> è la tua agenda.
          Sono due app separate: aprire l&rsquo;una non apre l&rsquo;altra.
        </p>
      </div>
    </GuscioAdmin>
  );
}

function Riquadro({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-bordo bg-pieno px-4 py-4">
      {children}
    </div>
  );
}

function Passo({ numero, children }: { numero: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-verde font-titolo text-base font-bold text-carta-chiara">
        {numero}
      </span>
      <span className="pt-1 text-base leading-relaxed text-grigio">{children}</span>
    </li>
  );
}
