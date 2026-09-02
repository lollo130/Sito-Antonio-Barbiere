// Nastro di foglie fra una fascia e l'altra.
//
// Serve a dare respiro: due blocchi di colore attaccati si scontrano, con
// una striscia in mezzo il passaggio è netto e la pagina si legge come una
// sequenza di capitoli invece che come un unico rotolo.
//
// Ha un fondo proprio (carta), così funziona fra qualunque coppia di fasce,
// anche fra il verde scuro e la pietra. Il disegno è nero su bianco: il
// bianco sparisce in "multiply" e resta il tratto, virato sul verde.
//
// Illustrazione Freepik (Harryarts) — attribuzione nel piede del sito.
export default function Separatore({ capovolto = false }: { capovolto?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="relative h-16 w-full overflow-hidden bg-carta md:h-24"
    >
      <img
        src="/sfondi/fascia.webp"
        srcSet="/sfondi/fascia-1000.webp 1000w, /sfondi/fascia.webp 2000w"
        sizes="100vw"
        alt=""
        loading="lazy"
        decoding="async"
        className={`separatore absolute inset-0 h-full w-full select-none object-cover ${
          capovolto ? '-scale-y-100' : ''
        }`}
      />
    </div>
  );
}
