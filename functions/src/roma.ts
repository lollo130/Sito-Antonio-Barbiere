// Europe/Rome, in un posto solo.
//
// Postgres faceva tutto da sé: `(data + ora) at time zone 'Europe/Rome'`
// sapeva quando c'è l'ora legale. Node no. Qui l'offset del giorno si
// calcola con Intl invece di scriverlo fisso, altrimenti il sito sbaglia
// di un'ora per sei mesi l'anno.
//
// Limite noto, lo stesso che aveva il client: l'offset è quello di
// mezzogiorno UTC del giorno chiesto. Nelle due notti del cambio d'ora una
// fascia oraria fra l'una e le tre di notte verrebbe calcolata con
// l'offset sbagliato. Il salone apre alle nove: non ci arriva mai.

const FORMATO_DATA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const FORMATO_OFFSET = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Rome',
  timeZoneName: 'shortOffset',
});

/** Giorno di calendario a Roma dell'istante dato: "2026-09-03". */
export function dataRomaDi(istante: Date): string {
  const parti = FORMATO_DATA.formatToParts(istante);
  const get = (t: string) => parti.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** "+01:00" d'inverno, "+02:00" d'estate. */
export function offsetRoma(dataStr: string): string {
  const parti = FORMATO_OFFSET.formatToParts(new Date(`${dataStr}T12:00:00Z`));
  const tz = parti.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+2';
  const ore = Number(tz.match(/GMT([+-]\d+)/)?.[1] ?? 2);
  return `${ore >= 0 ? '+' : '-'}${String(Math.abs(ore)).padStart(2, '0')}:00`;
}

/** L'istante UTC che a Roma è `dataStr` alle `ora` ("09:30"). */
export function istanteRoma(dataStr: string, ora: string): Date {
  return new Date(`${dataStr}T${ora}:00${offsetRoma(dataStr)}`);
}

/** [inizio, fine) del giorno a Roma, come istanti UTC. */
export function confiniGiornoRoma(dataStr: string): { inizio: Date; fine: Date } {
  return {
    inizio: istanteRoma(dataStr, '00:00'),
    fine: istanteRoma(aggiungiGiorni(dataStr, 1), '00:00'),
  };
}

export function aggiungiGiorni(dataStr: string, giorni: number): string {
  const [a, m, g] = dataStr.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, g));
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
}

/**
 * 0 = domenica … 6 = sabato. Stessa convenzione di `extract(dow)` in
 * Postgres, perché è quella con cui sono scritte le righe di
 * `orari_operatore` e `orari_salone`.
 */
export function giornoSettimanaRoma(dataStr: string): number {
  return new Date(`${dataStr}T12:00:00Z`).getUTCDay();
}

/** Tutti i giorni del mese, come "YYYY-MM-DD". */
export function giorniDelMese(anno: number, mese: number): string[] {
  const ultimo = new Date(Date.UTC(anno, mese, 0)).getUTCDate();
  return Array.from({ length: ultimo }, (_, i) => {
    const g = String(i + 1).padStart(2, '0');
    return `${anno}-${String(mese).padStart(2, '0')}-${g}`;
  });
}

export function eDataValida(dataStr: unknown): dataStr is string {
  return typeof dataStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataStr);
}
