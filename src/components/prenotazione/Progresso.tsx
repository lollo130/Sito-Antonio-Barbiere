type Props = { passo: number; totale?: number };

export default function Progresso({ passo, totale = 4 }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg font-medium text-stone-600">
        Passo {passo} di {totale}
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: totale }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < passo ? 'bg-amber-600' : 'bg-stone-200'}`}
          />
        ))}
      </div>
    </div>
  );
}
