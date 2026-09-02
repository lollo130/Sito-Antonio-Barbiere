// Foglia decorativa che spunta dal bordo della pagina.
//
// Acquerello su fondo bianco: con "multiply" il bianco sparisce e resta solo
// il verde, che è già quello della palette. Una parte della foglia esce dallo
// schermo di proposito — è quello che dà l'idea della pianta oltre il bordo,
// invece di un'illustrazione appoggiata lì in mezzo.
//
// Sparisce sotto i 768px: su un telefono coprirebbe il testo, e la
// leggibilità viene prima della decorazione.
//
// Illustrazioni Freepik (Planolla) — attribuzione nel piede del sito.
// Le due fronde vengono dallo stesso disegno ma sono piante diverse, così i
// due lati della pagina non sembrano un doppione.
export default function Foglia({
  lato,
  nome = lato === 'destra' ? 'foglia' : 'foglia-2',
}: {
  lato: 'destra' | 'sinistra';
  nome?: 'foglia' | 'foglia-2';
}) {
  const posizione =
    lato === 'destra'
      ? 'right-0 translate-x-[34%] rotate-[10deg]'
      : 'left-0 -translate-x-[34%] -rotate-[10deg]';

  return (
    <img
      src={`/sfondi/${nome}.webp`}
      srcSet={`/sfondi/${nome}-500.webp 500w, /sfondi/${nome}.webp 900w`}
      sizes="26rem"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={`foglia-decorativa pointer-events-none absolute top-1/2 hidden w-[26rem] -translate-y-1/2 select-none md:block ${posizione}`}
    />
  );
}
