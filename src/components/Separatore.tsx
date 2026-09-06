// Il passaggio fra una fascia e l'altra.
//
// Prima qui c'era un nastro di foglie alto una novantina di pixel, ripetuto
// quattro volte lungo la pagina. Sommato alle piante faceva undici elementi
// decorativi su una schermata sola: il listino e gli orari finivano dentro
// un cespuglio. Adesso è un filetto doppio con un rombo in mezzo — la stessa
// cosa che si trova in fondo ai listini stampati in tipografia.
//
// E soprattutto SFUMA. Prima aveva un fondo suo, color carta, uguale fra
// qualunque coppia di fasce: comodo da scrivere, ma metteva due stacchi
// netti al posto di uno. Fra il verde dell'apertura e la pietra del listino
// si vedevano tre bande piatte una sull'altra.
//
// Adesso ogni separatore sa da quale colore viene e a quale va, e ci fa un
// gradiente in mezzo. I due colori li passa chi lo usa, perché è la pagina a
// sapere come sono ordinate le fasce — il separatore da solo non può
// saperlo, e indovinarlo guardando i fratelli nel DOM sarebbe un modo
// fragile per ottenere la stessa cosa.

/** I fondi delle fasce, come si chiamano nella palette. */
type Fondo = 'verde' | 'verde-chiaro' | 'pieno' | 'carta' | 'carta-chiara' | 'inchiostro';

export default function Separatore({ da, a }: { da: Fondo; a: Fondo }) {
  return (
    <div
      aria-hidden="true"
      className="separatore-vintage"
      style={
        {
          '--da': `var(--color-${da})`,
          '--a': `var(--color-${a})`,
        } as React.CSSProperties
      }
    >
      <span className="separatore-vintage-rombo" />
    </div>
  );
}
