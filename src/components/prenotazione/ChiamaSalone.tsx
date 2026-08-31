import { TELEFONO_SALONE, TELEFONO_SALONE_TEL } from '../../lib/salone';

// Presente su ogni schermata del flusso (SPECIFICA.md § 6): per alcuni
// resterà sempre la strada giusta, ed è la via prevista, non un ripiego.
// Resta secondario nel peso visivo perché l'azione principale della
// schermata è un'altra, ma non deve mai sparire.
export default function ChiamaSalone() {
  return (
    <a
      href={TELEFONO_SALONE_TEL}
      className="flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-marrone bg-marrone-chiaro px-5 text-lg font-bold text-marrone"
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
      </svg>
      <span className="whitespace-nowrap">Chiama il salone</span>
      <span className="sr-only">{TELEFONO_SALONE}</span>
    </a>
  );
}
