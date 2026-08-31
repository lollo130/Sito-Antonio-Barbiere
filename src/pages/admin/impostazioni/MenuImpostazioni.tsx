import { Link } from 'react-router-dom';

export default function MenuImpostazioni() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-8">
      <Link to="/admin" className="self-start text-lg font-medium text-stone-600">
        ‹ Torna a Oggi
      </Link>
      <h1 className="font-titolo text-3xl font-semibold text-stone-900">Impostazioni</h1>

      <div className="flex flex-col gap-3">
        <Link
          to="/admin/impostazioni/operatori"
          className="flex min-h-[56px] items-center rounded-xl border-2 border-stone-300 px-5 text-lg font-semibold text-stone-900"
        >
          Operatori
        </Link>
        <Link
          to="/admin/impostazioni/servizi"
          className="flex min-h-[56px] items-center rounded-xl border-2 border-stone-300 px-5 text-lg font-semibold text-stone-900"
        >
          Servizi
        </Link>
        <Link
          to="/admin/impostazioni/orari"
          className="flex min-h-[56px] items-center rounded-xl border-2 border-stone-300 px-5 text-lg font-semibold text-stone-900"
        >
          Orari del salone e chiusure
        </Link>
        <Link
          to="/admin/impostazioni/assenze"
          className="flex min-h-[56px] items-center rounded-xl border-2 border-stone-300 px-5 text-lg font-semibold text-stone-900"
        >
          Assenze operatori
        </Link>
      </div>
    </main>
  );
}
