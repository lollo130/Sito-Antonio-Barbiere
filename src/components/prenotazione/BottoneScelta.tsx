import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  etichetta: ReactNode;
  dettaglio?: ReactNode;
  selezionato?: boolean;
  /** un'immagine prima dell'etichetta: per ora il ritratto dell'operatore */
  davanti?: ReactNode;
};

export default function BottoneScelta({
  etichetta,
  dettaglio,
  selezionato,
  davanti,
  className = '',
  ...resto
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={selezionato}
      className={`flex min-h-[64px] w-full items-center justify-between gap-4 rounded-2xl border-2 px-5 py-3 text-left text-lg font-bold transition-colors ${
        selezionato
          ? 'border-inchiostro bg-inchiostro text-carta-chiara'
          : 'border-bordo bg-carta-chiara text-inchiostro active:bg-marrone-chiaro'
      } ${className}`}
      {...resto}
    >
      <span className="flex items-center gap-3">
        {davanti}
        <span>{etichetta}</span>
      </span>
      {dettaglio && <span className="text-base font-normal opacity-90">{dettaglio}</span>}
    </button>
  );
}
