// Formattazione date/ore lato client. Duplica volutamente l'analoga
// logica nella edge function `prenota` (runtime Deno separato).

export function dataRomaDi(iso: string): string {
  const parti = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parti.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function aggiungiGiorni(dataStr: string, giorni: number): string {
  const [y, m, g] = dataStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, g));
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
}

const FORMATTATORE_GIORNO = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Rome',
});

const FORMATTATORE_ORA = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Rome',
});

function maiuscolaIniziale(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "giovedì 4 settembre", con "Oggi"/"Domani" davanti quando pertinente.
export function formattaGiornoEsteso(dataStr: string): string {
  const oggi = dataRomaDi(new Date().toISOString());
  const domani = aggiungiGiorni(oggi, 1);
  // Mezzogiorno UTC: resta nello stesso giorno di calendario a Roma
  // qualunque sia l'ora legale/solare in vigore.
  const testo = maiuscolaIniziale(FORMATTATORE_GIORNO.format(new Date(`${dataStr}T12:00:00Z`)));
  if (dataStr === oggi) return `Oggi, ${testo}`;
  if (dataStr === domani) return `Domani, ${testo}`;
  return testo;
}

export function formattaOra(iso: string): string {
  return FORMATTATORE_ORA.format(new Date(iso));
}

// --- Calendario mensile ---

export type AnnoMese = { anno: number; mese: number }; // mese: 1-12

export function annoMeseDi(dataStr: string): AnnoMese {
  const [anno, mese] = dataStr.split('-').map(Number);
  return { anno, mese };
}

export function meseSuccessivo({ anno, mese }: AnnoMese): AnnoMese {
  return mese === 12 ? { anno: anno + 1, mese: 1 } : { anno, mese: mese + 1 };
}

export function mesePrecedente({ anno, mese }: AnnoMese): AnnoMese {
  return mese === 1 ? { anno: anno - 1, mese: 12 } : { anno, mese: mese - 1 };
}

export function confrontaAnnoMese(a: AnnoMese, b: AnnoMese): number {
  return a.anno !== b.anno ? a.anno - b.anno : a.mese - b.mese;
}

export function giorniDelMese(anno: number, mese: number): string[] {
  const ultimo = new Date(Date.UTC(anno, mese, 0)).getUTCDate();
  return Array.from({ length: ultimo }, (_, i) => {
    const g = String(i + 1).padStart(2, '0');
    const m = String(mese).padStart(2, '0');
    return `${anno}-${m}-${g}`;
  });
}

// 0 = lunedì ... 6 = domenica (convenzione italiana, per allineare la griglia)
export function giornoSettimanaLunediPrimo(dataStr: string): number {
  const d = new Date(`${dataStr}T12:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

const FORMATTATORE_MESE_ANNO = new Intl.DateTimeFormat('it-IT', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Rome',
});

export function formattaMeseAnno(anno: number, mese: number): string {
  return maiuscolaIniziale(FORMATTATORE_MESE_ANNO.format(new Date(Date.UTC(anno, mese - 1, 15))));
}

// --- Confini di un giorno a Roma (per filtrare per data nel pannello admin) ---

// Offset UTC di Europe/Rome nel giorno indicato: "+01:00" o "+02:00" a
// seconda dell'ora legale. Calcolato, non fisso, altrimenti sbaglia sei
// mesi l'anno.
function offsetRoma(dataStr: string): string {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(`${dataStr}T12:00:00Z`));
  const tz = parti.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+2';
  const ore = Number(tz.match(/GMT([+-]\d+)/)?.[1] ?? 2);
  return `${ore >= 0 ? '+' : '-'}${String(Math.abs(ore)).padStart(2, '0')}:00`;
}

// [inizio, fine) del giorno `dataStr` a Roma, come istanti UTC.
export function confiniGiornoRoma(dataStr: string): { inizio: string; fine: string } {
  const offset = offsetRoma(dataStr);
  return {
    inizio: new Date(`${dataStr}T00:00:00${offset}`).toISOString(),
    fine: new Date(`${aggiungiGiorni(dataStr, 1)}T00:00:00${offsetRoma(aggiungiGiorni(dataStr, 1))}`).toISOString(),
  };
}
