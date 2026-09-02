// Sfondo a tutta fascia: tre foglie di monstera disegnate a inchiostro.
//
// Il disegno è nero su bianco. Con "multiply" il bianco sparisce, e una
// virata lo porta sul verde della palette. Tenuto molto tenue perché sta
// dietro alle foto dei tagli e non deve rubare loro l'attenzione.
//
// Si carica solo quando si arriva a quel punto della pagina, e il browser
// sceglie da solo la misura giusta fra telefono e schermo grande.
export default function SfondoFoglie() {
  return (
    <img
      src="/sfondi/monstera.webp"
      srcSet="/sfondi/monstera-800.webp 800w, /sfondi/monstera.webp 1600w"
      sizes="100vw"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className="sfondo-foglie pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
    />
  );
}
