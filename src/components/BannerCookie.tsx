import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CATEGORIE_IN_USO,
  ascoltaAperturaPreferenze,
  revocaConsenso,
  salvaScelte,
  scelteSalvate,
  serveBanner,
  type CategoriaId,
  type Scelte,
} from '../lib/consenso';

// Banner del consenso (Linee guida Garante 10 giugno 2021).
// "Rifiuta" ha esattamente lo stesso peso grafico di "Accetta": stessa
// dimensione, stessa posizione, stesso corpo. Nessuna casella pre-spuntata.
// Chiudere senza scegliere vale come rifiuto.
export default function BannerCookie() {
  const [visibile, setVisibile] = useState(false);
  const [pannello, setPannello] = useState(false);
  const [scelte, setScelte] = useState<Scelte>({});

  useEffect(() => {
    if (serveBanner()) setVisibile(true);
    return ascoltaAperturaPreferenze(() => {
      setScelte(scelteSalvate() ?? {});
      setPannello(true);
      setVisibile(true);
    });
  }, []);

  if (!visibile) return null;

  function decidiTutto(valore: boolean) {
    const tutte: Scelte = {};
    CATEGORIE_IN_USO.forEach((c) => {
      tutte[c.id] = valore;
    });
    salvaScelte(tutte);
    chiudi();
  }

  function salvaSceltaParziale() {
    const complete: Scelte = {};
    CATEGORIE_IN_USO.forEach((c) => {
      complete[c.id] = scelte[c.id] === true;
    });
    salvaScelte(complete);
    chiudi();
  }

  function chiudi() {
    setPannello(false);
    setVisibile(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Informativa sui cookie"
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-verde bg-carta-chiara px-5 py-5 shadow-[0_-6px_24px_rgba(42,36,30,0.14)]"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div>
          <p className="font-titolo text-lg font-bold uppercase text-inchiostro">Cookie</p>
          <p className="mt-2 text-base leading-relaxed text-grigio">
            Usiamo cookie tecnici, che servono a far funzionare il sito e non si possono
            disattivare. Per il resto decidi tu.{' '}
            <Link to="/cookie" className="font-bold text-marrone underline">
              Leggi l'informativa
            </Link>
            .
          </p>
        </div>

        {pannello && (
          <div className="flex flex-col gap-3 rounded-lg border-2 border-bordo bg-carta p-4">
            <RigaCategoria nome="Tecnici" descrizione="Fanno funzionare il sito. Sempre attivi." bloccata />
            {CATEGORIE_IN_USO.map((c) => (
              <RigaCategoria
                key={c.id}
                nome={c.nome}
                descrizione={c.descrizione}
                attiva={scelte[c.id] === true}
                onCambia={(v) => setScelte((s) => ({ ...s, [c.id]: v }))}
                id={c.id}
              />
            ))}
          </div>
        )}

        {/* Accetta e Rifiuta identici: stessa forma, stessa dimensione. */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => decidiTutto(false)}
            className="min-h-[56px] flex-1 rounded-lg border-2 border-verde bg-carta-chiara font-titolo text-lg font-bold uppercase text-verde"
          >
            Rifiuta
          </button>
          <button
            type="button"
            onClick={() => decidiTutto(true)}
            className="min-h-[56px] flex-1 rounded-lg border-2 border-verde bg-verde font-titolo text-lg font-bold uppercase text-carta-chiara"
          >
            Accetta
          </button>
        </div>

        {pannello ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={salvaSceltaParziale}
              className="min-h-[52px] flex-1 rounded-lg border-2 border-bordo font-titolo text-base font-bold uppercase text-inchiostro"
            >
              Salva le mie scelte
            </button>
            <button
              type="button"
              onClick={() => {
                revocaConsenso();
                setScelte({});
              }}
              className="min-h-[52px] flex-1 rounded-lg border-2 border-bordo font-titolo text-base font-bold uppercase text-grigio"
            >
              Azzera
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setScelte(scelteSalvate() ?? {});
              setPannello(true);
            }}
            className="self-center font-titolo text-base font-bold text-grigio underline"
          >
            Scegli tu
          </button>
        )}
      </div>
    </div>
  );
}

function RigaCategoria({
  nome,
  descrizione,
  attiva,
  onCambia,
  bloccata,
  id,
}: {
  nome: string;
  descrizione: string;
  attiva?: boolean;
  onCambia?: (v: boolean) => void;
  bloccata?: boolean;
  id?: CategoriaId;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-titolo text-base font-bold text-inchiostro">{nome}</p>
        <p className="text-sm leading-relaxed text-grigio">{descrizione}</p>
      </div>
      {bloccata ? (
        <span className="shrink-0 font-titolo text-sm uppercase text-grigio">sempre</span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={attiva === true}
          aria-label={nome}
          onClick={() => onCambia?.(!attiva)}
          data-categoria={id}
          className={`h-11 w-20 shrink-0 rounded-full border-2 font-titolo text-sm font-bold uppercase ${
            attiva
              ? 'border-verde bg-verde text-carta-chiara'
              : 'border-bordo bg-carta-chiara text-grigio'
          }`}
        >
          {attiva ? 'sì' : 'no'}
        </button>
      )}
    </div>
  );
}
