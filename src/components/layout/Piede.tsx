import { Link } from 'react-router-dom';
import { INDIRIZZO_SALONE, TELEFONO_SALONE } from '../../lib/salone';

export default function Piede() {
  return (
    <footer className="mt-16 border-t border-stone-200 py-10 text-center">
      <p className="text-lg text-stone-700">
        {INDIRIZZO_SALONE} · {TELEFONO_SALONE}
      </p>
      <p className="mt-3 text-base text-stone-500">
        <Link to="/privacy" className="underline">
          Privacy
        </Link>
        {' · '}
        <Link to="/installa" className="underline">
          Installa l'app
        </Link>
      </p>
    </footer>
  );
}
