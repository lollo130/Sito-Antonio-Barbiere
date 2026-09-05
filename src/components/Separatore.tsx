// Il passaggio fra una fascia e l'altra.
//
// Prima qui c'era un nastro di foglie alto una novantina di pixel, ripetuto
// quattro volte lungo la pagina. Sommato alle piante negli angoli faceva
// undici elementi decorativi su una schermata sola: il listino e gli orari
// finivano dentro un cespuglio.
//
// Adesso è un filetto doppio con un rombo in mezzo — la stessa cosa che si
// trova in fondo alle pagine dei listini stampati in tipografia. Divide, si
// vede che è voluto, e non ruba attenzione a niente.
//
// Ha un fondo proprio (carta), così funziona fra qualunque coppia di fasce.
export default function Separatore() {
  return (
    <div aria-hidden="true" className="separatore-vintage">
      <span className="separatore-vintage-rombo" />
    </div>
  );
}
