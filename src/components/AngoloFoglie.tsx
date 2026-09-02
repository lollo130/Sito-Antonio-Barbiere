// Angolo di foglie tropicali disegnate a inchiostro.
//
// Ritagliato dall'angolo in alto a sinistra di una cornice più grande, e
// posizionato in modo che una parte esca dallo schermo: è quello che dà
// l'idea del fogliame che continua oltre il bordo.
//
// Come le altre decorazioni: "multiply" toglie il bianco, una virata lo
// porta sul verde della palette, l'opacità bassa lo tiene dietro al testo.
// Su telefono resta ma molto attenuato, perché qui non copre nulla di
// leggibile — sta nell'angolo, non in mezzo.
export default function AngoloFoglie() {
  return (
    <img
      src="/sfondi/angolo.webp"
      srcSet="/sfondi/angolo-600.webp 600w, /sfondi/angolo.webp 1100w"
      sizes="(max-width: 767px) 60vw, 28rem"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className="angolo-foglie pointer-events-none absolute -bottom-10 -right-12 w-[18rem] select-none md:-bottom-16 md:-right-16 md:w-[28rem]"
    />
  );
}
