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
      className={`flex min-h-[64px] w-full items-center justify-between gap-4 rounded-2xl border-2 px-5 py-3 text-left text-lg font-bold transition-colors ${
        selezionato
          ? 'border-inchiostro bg-inchiostro text-carta'
          : 'border-bordo bg-carta text-inchiostro active:bg-ottone-chiaro'
      } ${className}`}
      {...resto}
    >
      <span>{etichetta}</span>
      {dettaglio && <span className="text-base font-normal opacity-90">{dettaglio}</span>}
    </button>
  );
}
