// Cornice botanica a tutta fascia.
//
// A differenza delle decorazioni d'angolo, questa è l'illustrazione INTERA:
// le foglie girano tutto intorno e lo spazio vuoto sta al centro, dove va il
// testo. Non essendo ritagliata non ha bordi mozzati — che è il difetto che
// si vedeva usando un pezzo di cornice come angolo.
//
// Serve alla fascia verde scura, quindi il disegno è invertito (tratto chiaro
// su nero) e fuso in "screen": sul verde restano solo le linee chiare.
//
// Illustrazione Freepik (Harryarts) — attribuzione nel piede del sito.
export default function Cornice() {
  return (
    <img
      src="/sfondi/cornice-chiara.webp"
      srcSet="/sfondi/cornice-chiara-800.webp 800w, /sfondi/cornice-chiara.webp 1200w"
      sizes="100vw"
      alt=""
      aria-hidden="true"
      decoding="async"
      className="cornice pointer-events-none absolute inset-0 h-full w-full select-none"
    />
  );
}
