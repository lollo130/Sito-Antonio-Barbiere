import { Link } from 'react-router-dom';

// Intestazione delle pagine pubbliche (Home, Dove siamo, Privacy).
// Il flusso di prenotazione e il pannello admin restano senza — un
// compito solo, senza distrazioni di navigazione.
export default function Intestazione() {
  return (
    <header className="border-b border-stone-200">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
        <Link to="/" className="font-titolo text-2xl font-semibold text-stone-900">
          Salone
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            to="/dove-siamo"
            className="flex min-h-[48px] items-center px-2 text-lg font-medium text-stone-700"
          >
            Dove siamo
          </Link>
          <Link
            to="/prenota"
            className="flex min-h-[48px] items-center rounded-xl bg-stone-900 px-5 text-lg font-semibold text-white"
          >
            Prenota
          </Link>
        </nav>
      </div>
    </header>
  );
}
