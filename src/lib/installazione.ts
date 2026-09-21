import { useEffect, useState } from 'react';

// Mettere il sito sulla schermata Home del telefono.
//
// Qui dentro ci sono due cose che sembrano una sola:
//
//  1. capire DOVE siamo (Android, iPhone con Safari, iPhone con altro,
//     computer, oppure già installata), perché le istruzioni da dare sono
//     diverse e non esiste un modo unico;
//  2. tenere da parte l'invito di Chrome a installare, che arriva quando
//     vuole lui e una volta sola.
//
// Il punto 2 è il motivo per cui questo file esiste invece di stare dentro
// la pagina che lo usa. Chrome lancia `beforeinstallprompt` poco dopo il
// caricamento: se l'ascolto comincia quando si apre la pagina "installa",
// l'invito è già passato e il pulsante non compare mai — restano solo le
// istruzioni a parole, che è proprio quello che si voleva evitare. Qui
// l'ascolto parte quando parte l'applicazione, e l'invito resta in attesa
// finché qualcuno lo usa.

export type Ambiente = 'installata' | 'android' | 'ios-safari' | 'ios-altro' | 'desktop';

/** L'invito di Chrome, arrivato prima che qualcuno fosse pronto a usarlo. */
type Invito = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let invitoInSospeso: Invito | null = null;
const inAscolto = new Set<(invito: Invito | null) => void>();

function avvisaTutti() {
  inAscolto.forEach((f) => f(invitoInSospeso));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // blocca il banner automatico: l'invito lo facciamo noi
    invitoInSospeso = e as Invito;
    avvisaTutti();
  });
  window.addEventListener('appinstalled', () => {
    invitoInSospeso = null;
    avvisaTutti();
  });
}

export function rilevaAmbiente(): Ambiente {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'installata';
  // iOS segnala l'app installata su una proprietà non standard di navigator
  if ((navigator as unknown as { standalone?: boolean }).standalone) return 'installata';

  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad recenti

  if (iOS) {
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return safari ? 'ios-safari' : 'ios-altro';
  }
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Lo stato dell'installazione, pronto per una schermata.
 *
 * `ambiente` parte da 'desktop' e si corregge al primo render: leggere
 * navigator durante il render renderebbe il componente diverso a ogni
 * chiamata, e su questo non c'è fretta di un decimo di secondo.
 */
export function useInstallazione() {
  const [ambiente, setAmbiente] = useState<Ambiente>('desktop');
  const [invito, setInvito] = useState<Invito | null>(null);
  const [esito, setEsito] = useState<'niente' | 'in-corso' | 'rifiutata'>('niente');

  useEffect(() => {
    setAmbiente(rilevaAmbiente());
    setInvito(invitoInSospeso);

    const aggiorna = (i: Invito | null) => {
      setInvito(i);
      if (i === null) setAmbiente(rilevaAmbiente());
    };
    inAscolto.add(aggiorna);
    return () => {
      inAscolto.delete(aggiorna);
    };
  }, []);

  async function installa() {
    if (!invito) return;
    setEsito('in-corso');
    await invito.prompt();
    const { outcome } = await invito.userChoice;
    invitoInSospeso = null;
    setInvito(null);
    setEsito(outcome === 'accepted' ? 'niente' : 'rifiutata');
  }

  return { ambiente, installa, invito, esito };
}

// ---------------------------------------------------------------- i tag
//
// Il sito si presenta come DUE app diverse a seconda di dove ci si trova:
// "Antonio" per i clienti, "Agenda" sotto /admin. La prima impostazione la
// fa uno script dentro index.html, prima ancora che React parta (il motivo
// è spiegato lì). Questa funzione serve al caso opposto: si è arrivati a
// /admin da dentro il sito, senza ricaricare la pagina, e i tag sono ancora
// quelli di prima.

const AGENDA = {
  manifesto: '/manifest-agenda.json',
  icona: '/icons/agenda-apple-touch.png',
  nome: 'Agenda',
  tema: '#1f3e33',
};

const SALONE = {
  manifesto: '/manifest.json',
  icona: '/icons/apple-touch-icon.png',
  nome: 'Antonio',
  tema: '#2e5949',
};

export function aggiornaTagApp(percorso: string) {
  if (typeof document === 'undefined') return;
  const quale = percorso.startsWith('/admin') ? AGENDA : SALONE;

  const manifesto = document.getElementById('manifesto') as HTMLLinkElement | null;
  const icona = document.getElementById('icona-ios') as HTMLLinkElement | null;
  const nome = document.getElementById('nome-ios') as HTMLMetaElement | null;
  const tema = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;

  // Si riscrive solo ciò che cambia davvero: toccare l'href del manifest
  // fa ripartire la lettura del manifest in Chrome, e non c'è motivo di
  // farlo a ogni cambio di schermata dentro il pannello.
  if (manifesto && !manifesto.href.endsWith(quale.manifesto)) manifesto.href = quale.manifesto;
  if (icona && !icona.href.endsWith(quale.icona)) icona.href = quale.icona;
  if (nome && nome.content !== quale.nome) nome.content = quale.nome;
  if (tema && tema.content !== quale.tema) tema.content = quale.tema;
}
