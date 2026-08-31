import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  etichetta: ReactNode;
  dettaglio?: ReactNode;
  selezionato?: boolean;
};

export default function BottoneScelta({
  etichetta,
  dettaglio,
  selezionato,
  className = '',
  ...resto
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={selezionato}
      className={`flex min-h-[56px] w-full items-center justify-between gap-4 rounded-xl border-2 px-5 py-3 text-left text-lg font-semibold transition-colors ${
        selezionato
          ? 'border-stone-900 bg-stone-900 text-white ring-2 ring-amber-400 ring-offset-2'
          : 'border-stone-300 bg-white text-stone-900 active:bg-stone-100'
      } ${className}`}
      {...resto}
    >
      <span>{etichetta}</span>
      {dettaglio && <span className="text-base font-normal opacity-80">{dettaglio}</span>}
    </button>
  );
}
