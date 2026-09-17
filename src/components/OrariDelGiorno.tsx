import { formattaOra } from '../lib/data';
import type { RigaAgenda } from '../lib/agenda';

// Gli orari di una giornata, a griglia e divisi in fasce.
//
// Prima erano una lista verticale, una riga per orario: in una giornata piena
// diventavano trenta righe da scorrere, e per arrivare alle cinque del
// pomeriggio si passava per tutta la mattina. La griglia tiene tutto sotto gli
// occhi senza nascondere niente dietro una tendina — che CLAUDE.md vieta in
// questo passo, per il pubblico anziano del salone.
//
// Lo usano in due, e con due scopi diversi:
//  - nella prenotazione ogni orario è un bottone e porta avanti;
//  - nella pagina pubblica del calendario è solo roba da guardare, e allora
//    gli orari non sono bottoni né cliccabili.
// La differenza la fa `onScelto`: se non c'è, non si tocca niente. Non è un
// bottone disabilitato — è proprio un altro elemento, perché un bottone che
// non fa niente promette qualcosa che non manterrà.

const FASCE = [
  { chiave: 'mattina', titolo: 'Mattina' },
  { chiave: 'pomeriggio', titolo: 'Pomeriggio' },
  { chiave: 'sera', titolo: 'Sera' },
] as const;

/**
 * In quale fascia cade un istante.
 *
 * Si guarda l'ora di Roma, non quella del telefono: chi guardasse dall'estero
 * vedrebbe altrimenti la mattina finire nel pomeriggio.
 */
function fasciaDi(istante: string): (typeof FASCE)[number]['chiave'] {
  const ora = Number(formattaOra(istante).slice(0, 2));
  if (ora < 13) return 'mattina';
  if (ora < 18) return 'pomeriggio';
  return 'sera';
}

export default function OrariDelGiorno({
  righe,
  onScelto,
  mostraOperatore = false,
}: {
  righe: RigaAgenda[];
  /** assente sulla pagina di sola consultazione: gli orari non si toccano */
  onScelto?: (inizio: string) => void;
  /**
   * Il nome di chi è libero, quando ne resta uno solo. Lo prevede
   * SPECIFICA.md § 5 sui liberi, mai sugli occupati — e mai sulla pagina
   * pubblica del calendario, che è una vetrina e non una prenotazione.
   */
  mostraOperatore?: boolean;
}) {
  return (
    <>
      {FASCE.map((fascia) => {
        const diQuestaFascia = righe.filter((r) => fasciaDi(r.inizio) === fascia.chiave);
        if (diQuestaFascia.length === 0) return null;

        return (
          <div key={fascia.chiave} className="flex flex-col gap-3">
            <h2 className="font-titolo text-sm font-bold uppercase tracking-[0.2em] text-marrone">
              {fascia.titolo}
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {diQuestaFascia.map((r) => {
                const aspetto = `relative flex min-h-[64px] items-center justify-center rounded-xl border-2 px-1 pb-3 ${
                  r.libero
                    ? 'border-verde bg-carta-chiara text-verde'
                    : 'border-bordo bg-pieno text-pieno-testo line-through decoration-1'
                }`;

                const dentro = (
                  <>
                    <span className="font-titolo text-xl font-bold tabular-nums">
                      {formattaOra(r.inizio)}
                    </span>
                    {/* Il nome sta appeso in fondo al riquadro invece che sotto
                        l'ora: ce l'hanno solo alcuni orari, e messo nel flusso
                        spingeva l'ora più in alto proprio in quelli, lasciando
                        la riga a quote diverse. */}
                    {mostraOperatore && r.libero && r.operatore_nome && (
                      <span className="absolute inset-x-0 bottom-1 truncate px-1 font-titolo text-[0.6rem] uppercase tracking-wider text-marrone">
                        {r.operatore_nome}
                      </span>
                    )}
                  </>
                );

                if (!onScelto) {
                  return (
                    <div
                      key={r.inizio}
                      className={aspetto}
                      aria-label={`${formattaOra(r.inizio)}, ${r.libero ? 'libero' : 'occupato'}`}
                    >
                      {dentro}
                    </div>
                  );
                }

                return (
                  <button
                    key={r.inizio}
                    type="button"
                    disabled={!r.libero}
                    onClick={() => onScelto(r.inizio)}
                    aria-label={`${formattaOra(r.inizio)}${r.libero ? '' : ', occupato'}`}
                    className={`${aspetto} ${
                      r.libero ? 'active:bg-verde active:text-carta-chiara' : ''
                    }`}
                  >
                    {dentro}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
