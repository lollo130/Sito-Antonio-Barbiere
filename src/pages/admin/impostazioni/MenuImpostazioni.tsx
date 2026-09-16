import { Link } from 'react-router-dom';
import GuscioAdmin from '../../../components/admin/GuscioAdmin';

const VOCI = [
  { a: 'operatori', titolo: 'Operatori', spiega: 'Chi lavora, foto, colore in agenda' },
  { a: 'servizi', titolo: 'Servizi', spiega: 'Nomi, durate e prezzi del listino' },
  { a: 'orari', titolo: 'Orari e chiusure', spiega: 'Quando è aperto e quando no' },
  { a: 'assenze', titolo: 'Assenze', spiega: 'Ferie e permessi degli operatori' },
];

export default function MenuImpostazioni() {
  return (
    <GuscioAdmin titolo="Impostazioni" indietro={{ a: '/admin', etichetta: 'Torna all\u2019agenda' }}>
      <div className="flex flex-col gap-3">
        {VOCI.map((v) => (
          <Link
            key={v.a}
            to={`/admin/impostazioni/${v.a}`}
            className="flex min-h-[64px] flex-col justify-center rounded-xl border-2 border-bordo px-5 py-3 transition-colors hover:border-verde"
          >
            <span className="font-titolo text-lg font-bold text-inchiostro">{v.titolo}</span>
            <span className="text-base text-grigio">{v.spiega}</span>
          </Link>
        ))}
      </div>
    </GuscioAdmin>
  );
}
