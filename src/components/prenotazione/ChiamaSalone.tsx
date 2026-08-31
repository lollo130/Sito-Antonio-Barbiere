import { TELEFONO_SALONE, TELEFONO_SALONE_TEL } from '../../lib/salone';

// Presente su ogni schermata del flusso (SPECIFICA.md § 6): per alcuni
// resterà sempre la strada giusta, ed è la via prevista, non un ripiego.
export default function ChiamaSalone() {
  return (
    <a
      href={TELEFONO_SALONE_TEL}
      className="flex min-h-[56px] w-full items-center justify-center rounded-xl border-2 border-amber-700 px-5 text-lg font-semibold text-amber-800 active:bg-amber-50"
    >
      Chiama il salone · {TELEFONO_SALONE}
    </a>
  );
}
