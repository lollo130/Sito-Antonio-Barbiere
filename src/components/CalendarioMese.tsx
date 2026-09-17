import {
  confrontaAnnoMese,
  formattaMeseAnno,
  giorniDelMese,
  giornoSettimanaLunediPrimo,
  mesePrecedente,
  meseSuccessivo,
  type AnnoMese,
} from '../lib/data';
import type { RigaGiorno } from '../lib/agenda';

// Il calendario da parete: cornice, testata verde coi giorni abbreviati, celle
// squadrate col numero in alto a sinistra, fascia con la legenda in fondo. È
// la forma che il titolare ha chiesto esplicitamente (SPECIFICA.md § 5) e la
// settimana comincia di lunedì, non di domenica.
//
// STA QUI E NON DENTRO UNA PAGINA perché lo usano in due: il passo "Quando"
// della prenotazione, dove toccare un giorno porta a scegliere l'ora, e la
// pagina pubblica del calendario, dove toccarlo apre soltanto la giornata da
// guardare. Copiarlo avrebbe voluto dire due calendari che si somigliano
// finché qualcuno non tocca uno dei due.
//
// Non sa niente di prenotazioni: riceve un elenco di giorni già decisi
// libero/pieno e li disegna. Chi ha prenotato, e quanti, non arriva nemmeno
// fin qui (CLAUDE.md § 2).

const NOMI_GIORNI = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

export default function CalendarioMese({
  mese,
  onMese,
  giorni,
  oggi,
  ultimoGiorno,
  primoMese,
  ultimoMese,
  onGiorno,
}: {
  mese: AnnoMese;
  onMese: (m: AnnoMese) => void;
  /** null mentre si sta ancora chiedendo */
  giorni: RigaGiorno[] | null;
  oggi: string;
  /** l'ultimo giorno dentro la finestra prenotabile */
  ultimoGiorno: string;
  primoMese: AnnoMese;
  ultimoMese: AnnoMese;
  onGiorno: (dataStr: string) => void;
}) {
  const statoPerGiorno = new Map(giorni?.map((g) => [g.giorno, g.libero]));
  const giorniGriglia = giorniDelMese(mese.anno, mese.mese);
  const spazioIniziale = giornoSettimanaLunediPrimo(giorniGriglia[0]);
  const celle: (string | null)[] = [...Array(spazioIniziale).fill(null), ...giorniGriglia];
  while (celle.length % 7 !== 0) celle.push(null);

  const puoIndietro = confrontaAnnoMese(mese, primoMese) > 0;
  const puoAvanti = confrontaAnnoMese(mese, ultimoMese) < 0;

  return (
    <div className="overflow-hidden rounded-lg border-2 border-verde bg-carta-chiara">
      <div className="flex items-center justify-between gap-2 border-b-2 border-verde px-2 py-2">
        <button
          type="button"
          disabled={!puoIndietro}
          onClick={() => onMese(mesePrecedente(mese))}
          className="flex h-11 w-11 shrink-0 items-center justify-center font-titolo text-2xl font-bold text-verde disabled:opacity-25"
          aria-label="Mese precedente"
        >
          ‹
        </button>
        <p className="whitespace-nowrap font-titolo text-base font-bold uppercase tracking-[0.06em] text-inchiostro sm:text-lg sm:tracking-[0.12em]">
          {formattaMeseAnno(mese.anno, mese.mese)}
        </p>
        <button
          type="button"
          disabled={!puoAvanti}
          onClick={() => onMese(meseSuccessivo(mese))}
          className="flex h-11 w-11 shrink-0 items-center justify-center font-titolo text-2xl font-bold text-verde disabled:opacity-25"
          aria-label="Mese successivo"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 bg-verde">
        {NOMI_GIORNI.map((n) => (
          <div
            key={n}
            className="py-1.5 text-center font-titolo text-[0.62rem] font-bold tracking-[0.1em] text-carta-chiara"
          >
            {n}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {celle.map((dataStr, i) => {
          const bordi = `${i % 7 !== 6 ? 'border-r' : ''} ${i >= 7 ? 'border-t' : ''} border-bordo`;

          if (!dataStr) {
            return <div key={`vuoto-${i}`} className={`min-h-[56px] bg-carta-chiara ${bordi}`} />;
          }

          const fuoriRange = dataStr < oggi || dataStr > ultimoGiorno;
          const libero = statoPerGiorno.get(dataStr);
          const numero = Number(dataStr.slice(-2));
          const eOggi = dataStr === oggi;
          const selezionabile = !fuoriRange && !!giorni && !!libero;

          let sfondo = 'bg-carta-chiara';
          let testo = 'text-inchiostro';
          if (fuoriRange || !giorni) {
            testo = 'text-bordo';
          } else if (!libero) {
            sfondo = 'bg-pieno';
            testo = 'text-pieno-testo';
          }

          return (
            <button
              key={dataStr}
              type="button"
              disabled={!selezionabile}
              onClick={() => onGiorno(dataStr)}
              className={`relative flex min-h-[56px] flex-col items-start p-1.5 ${sfondo} ${bordi} ${
                selezionabile ? 'active:bg-verde-chiaro' : ''
              }`}
            >
              <span
                className={`font-titolo text-[0.82rem] font-bold tabular-nums ${
                  eOggi
                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-marrone text-carta-chiara'
                    : testo
                }`}
              >
                {numero}
              </span>
              {selezionabile && (
                <span className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full bg-verde" />
              )}
            </button>
          );
        })}
      </div>

      {/* La fascia in fondo, come sui calendari da parete. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-verde bg-carta px-3 py-2.5">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-verde" />
          <span className="font-titolo text-[0.66rem] uppercase tracking-[0.12em] text-inchiostro">
            Libero
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 border border-bordo bg-pieno" />
          <span className="font-titolo text-[0.66rem] uppercase tracking-[0.12em] text-grigio">
            Pieno o chiuso
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-marrone" />
          <span className="font-titolo text-[0.66rem] uppercase tracking-[0.12em] text-grigio">
            Oggi
          </span>
        </span>
      </div>
    </div>
  );
}
