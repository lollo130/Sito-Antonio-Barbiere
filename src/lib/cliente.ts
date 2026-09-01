// Il cliente che usa l'app, ricordato sul suo telefono.
//
// NON è un account: non c'è registrazione sul server, non c'è password, non
// c'è niente da recuperare. I dati stanno solo nel telefono di chi li ha
// scritti, e servono a una cosa sola: non dover riscrivere nome e numero a
// ogni prenotazione. Chi disinstalla l'app o cancella i dati del browser
// ricomincia da capo, e va benissimo così.
//
// Questo tiene fede al vincolo del progetto (SPECIFICA.md § 1: nessun
// account, nessuna password) e insieme dà al cliente abituale l'accesso
// immediato chiesto dal titolare.

export type Cliente = {
  nome: string;
  cognome: string;
  telefono: string;
  salvatoIl: string;
};

const CHIAVE = 'cliente-v1';

// Stesso vincolo del database, così l'errore arriva prima e in italiano.
export const REGEX_TELEFONO = /^[0-9+ ]{8,20}$/;

export function leggiCliente(): Cliente | null {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const c = JSON.parse(grezzo) as Cliente;
    return c && c.nome && c.telefono ? c : null;
  } catch {
    // Incognito, storage pieno o disattivato: si prosegue senza ricordarsi
    // nulla. Mai far esplodere la pagina per questo.
    return null;
  }
}

export function salvaCliente(dati: Omit<Cliente, 'salvatoIl'>): void {
  try {
    localStorage.setItem(
      CHIAVE,
      JSON.stringify({ ...dati, salvatoIl: new Date().toISOString() } satisfies Cliente),
    );
  } catch {
    /* vale per questa visita */
  }
  avvisa();
}

export function dimenticaCliente(): void {
  try {
    localStorage.removeItem(CHIAVE);
  } catch {
    /* vedi sopra */
  }
  avvisa();
}

/** Vero quando la pagina gira dentro l'app installata, non nel browser. */
export function inApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return !!(navigator as unknown as { standalone?: boolean }).standalone;
}

const ascoltatori = new Set<() => void>();

export function ascoltaCliente(f: () => void): () => void {
  ascoltatori.add(f);
  return () => ascoltatori.delete(f);
}

function avvisa() {
  ascoltatori.forEach((f) => f());
}

export function validaCliente(nome: string, cognome: string, telefono: string): string | null {
  if (nome.trim().length < 2) return 'Manca il nome';
  if (cognome.trim().length < 2) return 'Manca il cognome';
  if (!REGEX_TELEFONO.test(telefono.trim()))
    return 'Il numero di telefono non va bene: solo cifre, spazi e il segno +';
  return null;
}
