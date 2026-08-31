type Props = { passo: number; totale?: number };

export default function Progresso({ passo, totale = 4 }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-bold text-grigio">
        Passo {passo} di {totale}
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: totale }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < passo ? 'bg-inchiostro' : 'bg-bordo'}`}
          />
        ))}
      </div>
    </div>
  );
}
