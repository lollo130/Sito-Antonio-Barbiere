// Consenso ai cookie — Linee guida del Garante del 10 giugno 2021.
//
// Le regole che contano, e come sono rispettate qui:
//  - "Rifiuta" ha lo stesso peso grafico di "Accetta" (vedi BannerCookie).
//  - Nessuna casella pre-spuntata: le categorie partono tutte a false.
//  - Lo scroll non è consenso: si decide solo con i bottoni.
//  - Chiudere il banner senza scegliere equivale a rifiutare.
//  - La scelta si può cambiare in qualsiasi momento (link nel piede).
//  - I cookie tecnici non si chiedono e non si possono disattivare.
//
// IMPORTANTE — il banner compare SOLO se il sito usa davvero qualcosa di non
// tecnico. Oggi non usa niente: nessuna analitica, nessuna mappa incorporata,
// nessun social, e i caratteri sono ospitati sul nostro server e non su
// Google. Un banner che chiede il permesso per nulla è fastidioso e il
// Garante stesso scoraggia i banner inutili.
// QUANDO AGGIUNGI LA MAPPA O LE STATISTICHE: metti `inUso: true` sulla
// categoria qui sotto. Da quel momento il banner compare da solo e il
// contenuto resta bloccato finché il visitatore non acconsente.

export type CategoriaId = 'mappa' | 'statistiche';

export type Categoria = {
  id: CategoriaId;
  nome: string;
  descrizione: string;
  inUso: boolean;
};

export const CATEGORIE: Categoria[] = [
  {
    id: 'mappa',
    nome: 'Mappa',
    descrizione:
      'Serve a mostrare la mappa di Google con la posizione del salone. Google riceve il tuo indirizzo IP.',
    inUso: false,
  },
  {
    id: 'statistiche',
    nome: 'Statistiche',
    descrizione:
      'Serve a sapere quante persone visitano il sito e quali pagine guardano. Nessun dato viene usato per la pubblicità.',
    inUso: false,
  },
];

export const CATEGORIE_IN_USO = CATEGORIE.filter((c) => c.inUso);

const CHIAVE = 'consenso-cookie-v1';

export type Scelte = Partial<Record<CategoriaId, boolean>>;
type Salvato = { scelte: Scelte; data: string };

function leggi(): Salvato | null {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const v = JSON.parse(grezzo) as Salvato;
    return v && typeof v === 'object' && v.scelte ? v : null;
  } catch {
    // Modalità in incognito, storage pieno o disattivato: si prosegue come
    // se non ci fosse consenso. Mai far esplodere la pagina per questo.
    return null;
  }
}

export function scelteSalvate(): Scelte | null {
  return leggi()?.scelte ?? null;
}

export function haConsenso(id: CategoriaId): boolean {
  return leggi()?.scelte[id] === true;
}

/** Il banner serve solo se c'è qualcosa di non tecnico e non è ancora stato deciso. */
export function serveBanner(): boolean {
  if (CATEGORIE_IN_USO.length === 0) return false;
  const salvato = leggi();
  if (!salvato) return true;
  return CATEGORIE_IN_USO.some((c) => typeof salvato.scelte[c.id] !== 'boolean');
}

export function salvaScelte(scelte: Scelte): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify({ scelte, data: new Date().toISOString() }));
  } catch {
    // niente da fare: la scelta vale per questa visita
  }
  avvisa();
}

export function dataDelConsenso(): string | null {
  return leggi()?.data ?? null;
}

export function revocaConsenso(): void {
  try {
    localStorage.removeItem(CHIAVE);
  } catch {
    /* vedi sopra */
  }
  avvisa();
}

// Notifica minimale, così banner e piede restano allineati senza librerie.
const ascoltatori = new Set<() => void>();

export function ascoltaConsenso(f: () => void): () => void {
  ascoltatori.add(f);
  return () => ascoltatori.delete(f);
}

function avvisa() {
  ascoltatori.forEach((f) => f());
}

// Evento per riaprire il pannello dal link "Preferenze cookie" nel piede.
const EVENTO_APRI = 'apri-preferenze-cookie';

export function apriPreferenze(): void {
  window.dispatchEvent(new Event(EVENTO_APRI));
}

export function ascoltaAperturaPreferenze(f: () => void): () => void {
  window.addEventListener(EVENTO_APRI, f);
  return () => window.removeEventListener(EVENTO_APRI, f);
}
