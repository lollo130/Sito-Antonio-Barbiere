import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { NOME_SALONE } from '../../lib/salone';

// Il guscio di tutte le schermate del pannello.
//
// Prima ogni schermata si disegnava da sola: stesso <main>, stesso margine,
// stesso titolo, ricopiati sette volte, e ogni pagina decideva per conto suo
// se e dove mettere un "torna indietro". Il risultato non era brutto, era
// SCONNESSO — e soprattutto identico al sito pubblico, tanto che il titolare
// non aveva modo di capire a colpo d'occhio se stava guardando la sua agenda
// o la pagina che vedono i clienti.
//
// Qui il pannello prende una faccia sua:
//
//  - una barra scura in cima, sempre la stessa, con il nome della bottega e
//    la via d'uscita. Il fondo verde scuro non compare da nessuna parte nel
//    sito pubblico se non nell'apertura: serve proprio a dire "sei dietro il
//    banco";
//  - il fondo della pagina e' la pietra, non la carta, e il contenuto sta su
//    una scheda chiara. Cosi' il lavoro vero si stacca dal fondo invece di
//    galleggiarci;
//  - il titolo e il ritorno indietro li mette il guscio, non la pagina:
//    stanno sempre nello stesso punto, che e' quello che chiede SPECIFICA.md
//    sull'azione principale sempre nella stessa posizione.
//
// L'uscita e' nella barra e non in fondo a una schermata sola: su un pannello
// usato da una persona sola, su un computer in negozio, uscire deve essere
// possibile da ovunque ci si trovi.

const RITORNO = 'min-h-[44px] self-start font-titolo text-base font-bold text-marrone';

export default function GuscioAdmin({
  titolo,
  sottotitolo,
  azioni,
  indietro,
  largo = false,
  children,
}: {
  titolo: string;
  /** una riga sotto al titolo: quante cose da fare, che giorno è */
  sottotitolo?: ReactNode;
  /** i bottoni della schermata, in alto a destra */
  azioni?: ReactNode;
  /**
   * Il ritorno indietro; assente sulla schermata principale.
   * A volte porta a un altro indirizzo (`a`), a volte chiude solo una scheda
   * aperta dentro la stessa pagina (`onClick`) — e le due cose devono avere
   * lo stesso aspetto, perché per chi guarda sono la stessa cosa.
   */
  indietro?: { etichetta: string; a?: string; onClick?: () => void };
  /** true per l'agenda, che ha bisogno di tutta la larghezza */
  largo?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-pieno">
      <header className="bg-verde-scuro">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link to="/admin" className="flex items-baseline gap-2">
            <span className="font-titolo text-xl font-bold text-carta-chiara">{NOME_SALONE}</span>
            <span className="font-titolo text-[0.62rem] uppercase tracking-[0.2em] text-cuoio-chiaro">
              pannello
            </span>
          </Link>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="min-h-[44px] rounded-lg border-2 border-cuoio-chiaro px-4 font-titolo text-sm font-bold uppercase tracking-wide text-cuoio-chiaro"
          >
            Esci
          </button>
        </div>
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col gap-5 px-4 py-6 sm:px-6 ${
          largo ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        {indietro &&
          (indietro.a ? (
            <Link to={indietro.a} className={RITORNO}>
              ‹ {indietro.etichetta}
            </Link>
          ) : (
            <button type="button" onClick={indietro.onClick} className={RITORNO}>
              ‹ {indietro.etichetta}
            </button>
          ))}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-titolo text-2xl font-bold uppercase tracking-wide text-inchiostro sm:text-3xl">
              {titolo}
            </h1>
            {sottotitolo && <p className="mt-1 text-base text-grigio">{sottotitolo}</p>}
          </div>
          {azioni && <div className="flex flex-wrap items-center gap-2">{azioni}</div>}
        </div>

        <div className="scheda-admin flex flex-1 flex-col gap-5 rounded-xl bg-carta-chiara p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
