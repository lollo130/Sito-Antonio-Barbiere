// Il ritratto di un operatore, dove serve: nel pannello e nella schermata in
// cui il cliente sceglie chi lo taglia.
//
// Quando la foto non c'è NON si mette una sagoma grigia di persona: si mette
// l'iniziale del nome sul colore che quell'operatore ha già in agenda. Così un
// salone che non ha ancora caricato le foto non sembra rotto — sembra fatto
// così — e i due posti in cui l'operatore compare, l'agenda a colori e questo
// cerchio, dicono la stessa cosa.

export default function Ritratto({
  nome,
  foto,
  colore = '#888888',
  misura = 48,
}: {
  nome: string;
  foto?: string | null;
  /** il colore dell'operatore in agenda, usato quando manca la foto */
  colore?: string;
  misura?: number;
}) {
  const stile = { width: misura, height: misura };

  if (foto) {
    return (
      <img
        src={foto}
        alt=""
        aria-hidden="true"
        style={stile}
        className="shrink-0 rounded-full border-2 border-bordo object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ ...stile, backgroundColor: colore }}
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-bordo font-titolo font-bold uppercase text-carta-chiara"
    >
      {nome.trim().charAt(0) || '?'}
    </span>
  );
}
