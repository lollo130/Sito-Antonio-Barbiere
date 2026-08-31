import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Il QR punta al dominio da cui la pagina è servita davvero. Prima leggeva
// VITE_SITE_URL, che è facile dimenticare al segnaposto: il codice veniva
// generato bello e stampabile, e portava su un dominio inesistente.
function urlDiQuestaPagina(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/installa`;
}

/**
 * Pagina /installa — "scaricare l'app da un link".
 *
 * Non esiste un file da scaricare: il link apre il sito e da lì si installa.
 * Android espone beforeinstallprompt e si installa con un pulsante.
 * iOS non ha nessuna API: si può solo spiegare Condividi -> Aggiungi a schermata Home.
 *
 * Testo grande e un'azione sola: questa pagina la leggono anche persone
 * che non hanno mai installato niente in vita loro.
 */

type Ambiente = 'installata' | 'android' | 'ios-safari' | 'ios-altro' | 'desktop';

function rilevaAmbiente(): Ambiente {
  if (window.matchMedia('(display-mode: standalone)').matches) return 'installata';
  // iOS segnala l'app installata su una proprietà non standard di navigator
  if ((navigator as unknown as { standalone?: boolean }).standalone) return 'installata';

  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad recenti

  if (iOS) {
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return safari ? 'ios-safari' : 'ios-altro';
  }
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export default function Installa() {
  const [ambiente, setAmbiente] = useState<Ambiente>('desktop');
  const [promptInstall, setPromptInstall] = useState<Event | null>(null);
  const [esito, setEsito] = useState<'idle' | 'in-corso' | 'rifiutata'>('idle');
  const [urlInstalla, setUrlInstalla] = useState('');
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    setAmbiente(rilevaAmbiente());
    setUrlInstalla(urlDiQuestaPagina());

    const onPrompt = (e: Event) => {
      e.preventDefault();       // blocca il banner automatico di Chrome
      setPromptInstall(e);      // lo useremo noi al tocco del pulsante
    };
    const onInstalled = () => setAmbiente('installata');

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function installa() {
    if (!promptInstall) return;
    setEsito('in-corso');
    const evento = promptInstall as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    setPromptInstall(null);
    setEsito(outcome === 'accepted' ? 'idle' : 'rifiutata');
  }

  return (
    <main className="mx-auto max-w-md px-5 py-10 text-[18px] leading-relaxed">
      <h1 className="font-titolo mb-6 text-3xl font-semibold text-inchiostro">Installa l'app del salone</h1>

      {ambiente === 'installata' && (
        <>
          <p className="mb-6">L'app è già installata su questo telefono.</p>
          <a
            href="/admin"
            className="flex min-h-[56px] items-center justify-center rounded-2xl bg-verde px-6 text-lg font-semibold text-carta-chiara"
          >
            Apri il pannello
          </a>
        </>
      )}

      {ambiente === 'android' && (
        <>
          <p className="mb-6">
            Tocca il pulsante qui sotto. L'icona del salone comparirà tra le altre app.
          </p>
          {promptInstall ? (
            <button
              onClick={installa}
              disabled={esito === 'in-corso'}
              className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-verde px-6 text-lg font-semibold text-carta-chiara disabled:opacity-60"
            >
              Installa app
            </button>
          ) : (
            <p className="rounded-2xl bg-pieno p-4">
              Se il pulsante non compare, apri il menu del browser (i tre puntini in alto)
              e scegli <strong>Installa app</strong> o <strong>Aggiungi a schermata Home</strong>.
            </p>
          )}
          {esito === 'rifiutata' && (
            <p className="mt-4">Installazione annullata. Ricarica la pagina per riprovare.</p>
          )}
        </>
      )}

      {ambiente === 'ios-safari' && (
        <>
          <p className="mb-6">Bastano tre passaggi:</p>
          <ol className="mb-6 space-y-4">
            <li className="flex gap-3">
              <span className="font-bold">1.</span>
              <span>
                Tocca il tasto <strong>Condividi</strong> in fondo allo schermo: è il quadrato
                con la freccia che punta in alto.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">2.</span>
              <span>Scorri l'elenco e tocca <strong>Aggiungi a schermata Home</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold">3.</span>
              <span>Tocca <strong>Aggiungi</strong> in alto a destra.</span>
            </li>
          </ol>
          <p>L'icona del salone comparirà tra le altre app.</p>
        </>
      )}

      {ambiente === 'ios-altro' && (
        <p className="rounded-2xl bg-pieno p-4">
          Per installare l'app su iPhone serve <strong>Safari</strong>. Copia l'indirizzo di
          questa pagina, aprilo con Safari e torna qui: troverai le istruzioni.
        </p>
      )}

      {ambiente === 'desktop' && (
        <p className="rounded-2xl bg-pieno p-4">
          Apri questa pagina dal telefono per installare l'app. Puoi inquadrare il codice QR
          qui sotto con la fotocamera.
        </p>
      )}

      <hr className="my-10 border-bordo" />

      <p className="mb-4 text-grigio">
        Da condividere con chi deve installarla: inquadra il codice con la fotocamera, oppure
        mandagli il link su WhatsApp.
      </p>

      <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-bordo bg-carta-chiara p-3">
        {urlInstalla && (
          <QRCodeSVG
            value={urlInstalla}
            size={168}
            className="h-full w-full"
            title="QR per aprire questa pagina"
          />
        )}
      </div>

      {/* L'indirizzo anche scritto: se la fotocamera non legge il codice,
          si può sempre digitare o dettare al telefono. */}
      <p className="mt-4 break-all font-titolo text-base text-grigio">{urlInstalla}</p>

      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(urlInstalla);
            setCopiato(true);
            setTimeout(() => setCopiato(false), 2500);
          } catch {
            setCopiato(false);
          }
        }}
        className="mt-3 min-h-[56px] w-full rounded-2xl border-2 border-verde font-titolo text-lg font-bold uppercase text-verde"
      >
        {copiato ? 'Link copiato' : 'Copia il link'}
      </button>

    </main>
  );
}
