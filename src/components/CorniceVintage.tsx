import type { ReactNode } from 'react';

// La cornice che tiene insieme il contenuto di una fascia.
//
// Prima ogni fascia era un blocco di colore con del testo appoggiato sopra e
// del fogliame intorno: niente diceva dove cominciava e dove finiva una cosa.
// Questa è la stessa cornice delle vecchie insegne smaltate e dei listini
// stampati in tipografia — filetto grosso fuori, filetto sottile dentro, un
// rombo a ogni angolo.
//
// È disegnata col CSS, non è un'immagine: si adatta a qualunque altezza, non
// pesa niente da scaricare e resta nitida su ogni schermo. I rombi agli
// angoli sono quattro <span> perché uno pseudo-elemento non basta a farne
// quattro, e messi così restano incollati agli angoli comunque la cornice si
// allunghi.
//
// Decorazione pura: invisibile agli schermi vocali.

const ANGOLI = ['as', 'ad', 'bs', 'bd'] as const;

export default function CorniceVintage({
  children,
  className = '',
  contenuto = '',
  spaziatura = 'p-4 sm:p-9',
}: {
  children: ReactNode;
  /** classi della cornice in sé */
  className?: string;
  /**
   * Classi di impaginazione del contenuto (griglia, colonne…).
   *
   * Vanno qui e non in `className` perché i figli stanno dentro un
   * contenitore loro: una `grid` messa sulla cornice avrebbe come unica
   * cella quel contenitore, e non impaginerebbe niente.
   */
  contenuto?: string;
  /** padding interno, per le fasce che ne vogliono meno */
  spaziatura?: string;
}) {
  return (
    <div className={`cornice-vintage ${spaziatura} ${className}`}>
      {ANGOLI.map((angolo) => (
        <span
          key={angolo}
          aria-hidden="true"
          className={`cornice-vintage-rombo cornice-vintage-rombo-${angolo}`}
        />
      ))}
      <div className={`relative ${contenuto}`}>{children}</div>
    </div>
  );
}
