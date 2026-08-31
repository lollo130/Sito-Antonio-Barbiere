type Props = {
  etichetta: string;
  selezionato: boolean;
  onClick: () => void;
  className?: string;
};

export default function BottoneToggle({ etichetta, selezionato, onClick, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[48px] rounded-lg border-2 px-4 py-2 text-base font-semibold ${
        selezionato ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-900'
      } ${className}`}
    >
      {etichetta}
    </button>
  );
}
