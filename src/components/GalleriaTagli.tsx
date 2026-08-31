// Galleria dei tagli (richiesta del titolare).
//
// COME AGGIUNGERE LE FOTO VERE: metti i file in `public/foto/` e scrivi il
// nome in `file` qui sotto. Finché `file` è null si vede un riquadro
// disegnato con la didascalia: la pagina resta in piedi e non sembra rotta.
// Formato consigliato: quadrate, lato 800px, JPEG. Scattale col telefono in
// negozio, di mattina, con la luce della vetrina.
const TAGLI: { titolo: string; file: string | null }[] = [
  { titolo: 'Taglio classico', file: null },
  { titolo: 'Sfumatura alta', file: null },
  { titolo: 'Barba modellata', file: null },
  { titolo: 'Taglio a rasoio', file: null },
];

export default function GalleriaTagli() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TAGLI.map((t) => (
        <figure key={t.titolo} className="flex flex-col gap-2">
          <div className="aspect-square overflow-hidden rounded-lg border-2 border-verde bg-pieno">
            {t.file ? (
              <img
                src={`/foto/${t.file}`}
                alt={t.titolo}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-pieno-testo">
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M7 8h.01" />
                </svg>
                <span className="font-titolo text-[0.58rem] uppercase tracking-[0.14em]">Foto</span>
              </div>
            )}
          </div>
          <figcaption className="font-titolo text-[0.72rem] uppercase tracking-[0.1em] text-grigio">
            {t.titolo}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
