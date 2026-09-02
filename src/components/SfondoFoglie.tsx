// Sfondo della galleria: una foglia di monstera disegnata a inchiostro.
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
      srcSet="/sfondi/monstera-700.webp 700w, /sfondi/monstera.webp 1300w"
      sizes="(max-width: 767px) 90vw, 40rem"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className="sfondo-foglie pointer-events-none absolute -right-16 top-1/2 w-[34rem] max-w-[95%] -translate-y-1/2 select-none md:-right-24 md:w-[42rem]"
    />
  );
}
