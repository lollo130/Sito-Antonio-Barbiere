import { useEffect, useState } from 'react';
import BottoneScelta from '../../components/prenotazione/BottoneScelta';
import CalendarioMese from '../../components/CalendarioMese';
import OrariDelGiorno from '../../components/OrariDelGiorno';
import {
  aggiungiGiorni,
  annoMeseDi,
  confrontaAnnoMese,
  dataRomaDi,
  formattaGiornoEsteso,
  meseSuccessivo,
  type AnnoMese,
} from '../../lib/data';
import {
  agendaDelGiorno,
  agendaDelMese,
  precarica,
  type RigaAgenda,
  type RigaGiorno,
} from '../../lib/agenda';
import type { Servizio } from './Passo1Servizio';

// Il passo "Quando" (SPECIFICA.md § 5): un mese alla volta a griglia, giorni
// colorati libero/pieno, si tocca un giorno e si apre l'agenda oraria.
//
// La griglia del mese sta in components/CalendarioMese.tsx, perché la usa
// anche la pagina pubblica /calendario. Qui restano le cose che riguardano il
// PRENOTARE: cercare il primo giorno libero, scegliere l'ora, andare avanti.

const FINESTRA_MASSIMA_GIORNI = 60;

type Props = {
  servizio: Servizio;
  onScelto: (inizio: string) => void;
  onIndietro: () => void;
};

export default function Passo2Quando({ servizio, onScelto, onIndietro }: Props) {
  const oggi = dataRomaDi(new Date().toISOString());
  const ultimoGiorno = aggiungiGiorni(oggi, FINESTRA_MASSIMA_GIORNI - 1);
  const primoMese = annoMeseDi(oggi);
  const ultimoMese = annoMeseDi(ultimoGiorno);

  const [vista, setVista] = useState<'mese' | 'giorno'>('mese');
  const [mese, setMese] = useState<AnnoMese>(primoMese);
  const [giorniMese, setGiorniMese] = useState<RigaGiorno[] | null>(null);
  const [erroreMese, setErroreMese] = useState<string | null>(null);
  const [cercandoPrimoLibero, setCercandoPrimoLibero] = useState(false);

  const [giornoScelto, setGiornoScelto] = useState<string | null>(null);
  const [righeGiorno, setRigheGiorno] = useState<RigaAgenda[] | null>(null);
  const [erroreGiorno, setErroreGiorno] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    setGiorniMese(null);
    setErroreMese(null);
    agendaDelMese(servizio.id, mese)
      .then((r) => {
        if (!attivo) return;
        setGiorniMese(r);
        // Appena si sa quali giorni sono liberi, si chiedono gli orari del
        // primo: è la casella che quasi tutti toccano per prima, e intanto
        // che la persona legge il calendario la risposta è già per strada.
        // Se poi tocca un altro giorno non si è perso niente — una chiamata
        // che nessuno aspetta e che la cache terrà comunque da parte.
        const primoLibero = r.find((g) => g.giorno >= oggi && g.libero);
        if (primoLibero) precarica(agendaDelGiorno(servizio.id, primoLibero.giorno));
      })
      .catch(() => {
        if (attivo) setErroreMese('Non riesco a controllare il calendario. Riprova tra poco.');
      });
    return () => {
      attivo = false;
    };
    // `oggi` è una data in forma di stringa, ricalcolata a ogni disegno ma
    // sempre uguale a se stessa fino a mezzanotte: come dipendenza è stabile.
  }, [servizio.id, mese, oggi]);

  function apriGiorno(dataStr: string) {
    setGiornoScelto(dataStr);
    setVista('giorno');
    setRigheGiorno(null);
    setErroreGiorno(null);
    agendaDelGiorno(servizio.id, dataStr)
      .then(setRigheGiorno)
      .catch(() => setErroreGiorno('Non riesco a controllare gli orari. Riprova tra poco.'));
  }

  async function vaiAlPrimaPossibile() {
    setCercandoPrimoLibero(true);
    setErroreMese(null);
    try {
      // I mesi da guardare si sanno già tutti in partenza: la finestra è di
      // 60 giorni e quindi tocca al massimo tre mesi. Chiederli UNO ALLA
      // VOLTA, come si faceva prima, voleva dire aspettare tre viaggi in fila
      // per la risposta più lenta — e quasi sempre la risposta era nel primo,
      // ma i due dopo si pagavano lo stesso quando non lo era.
      // Chiesti insieme, si aspetta il più lento e basta. Il primo di solito
      // è già in cache, perché è quello precaricato alla scelta del servizio.
      const daGuardare: AnnoMese[] = [];
      let cursore = primoMese;
      for (let i = 0; i < 3; i++) {
        daGuardare.push(cursore);
        if (confrontaAnnoMese(cursore, ultimoMese) >= 0) break;
        cursore = meseSuccessivo(cursore);
      }

      const risposte = await Promise.all(
        daGuardare.map((m) => agendaDelMese(servizio.id, m)),
      );

      for (const [i, giorni] of risposte.entries()) {
        const trovato = giorni.find((g) => g.giorno >= oggi && g.giorno <= ultimoGiorno && g.libero);
        if (trovato) {
          setMese(daGuardare[i]);
          apriGiorno(trovato.giorno);
          return;
        }
      }
      setErroreMese('Non ci sono orari liberi nei prossimi 60 giorni.');
    } catch {
      setErroreMese('Non riesco a controllare gli orari liberi. Riprova tra poco.');
    } finally {
      setCercandoPrimoLibero(false);
    }
  }

  // ------------------------------------------------------------------
  // Agenda di un singolo giorno
  // ------------------------------------------------------------------
  if (vista === 'giorno' && giornoScelto) {
    const liberiDelGiorno = righeGiorno?.filter((r) => r.libero).length ?? 0;
    return (
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => setVista('mese')}
          className="self-start font-titolo text-base font-bold text-grigio"
        >
          ‹ TORNA AL CALENDARIO
        </button>

        <h1 className="font-titolo text-2xl font-bold uppercase leading-tight text-inchiostro">
          {formattaGiornoEsteso(giornoScelto)}
        </h1>

        {erroreGiorno && <p className="text-lg font-bold text-allarme-testo">{erroreGiorno}</p>}
        {!righeGiorno && !erroreGiorno && <p className="text-lg text-grigio">Controllo gli orari…</p>}
        {righeGiorno && righeGiorno.length === 0 && !erroreGiorno && (
          <p className="text-lg text-grigio">Il salone è chiuso questo giorno.</p>
        )}

        {righeGiorno && righeGiorno.length > 0 && (
          <>
            <p className="text-lg text-grigio">
              {liberiDelGiorno === 0
                ? 'Tutti gli orari di questo giorno sono presi.'
                : `${liberiDelGiorno} ${liberiDelGiorno === 1 ? 'orario libero' : 'orari liberi'}. Tocca quello che ti va bene.`}
            </p>

            <OrariDelGiorno righe={righeGiorno} onScelto={onScelto} mostraOperatore />
          </>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Vista mensile
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onIndietro}
        className="self-start font-titolo text-base font-bold text-grigio"
      >
        ‹ CAMBIA SERVIZIO
      </button>

      <h1 className="font-titolo text-2xl font-bold uppercase leading-tight text-inchiostro">
        Quando vuoi venire?
      </h1>

      <BottoneScelta
        etichetta={cercandoPrimoLibero ? 'Cerco il primo giorno libero…' : 'Il prima possibile'}
        onClick={vaiAlPrimaPossibile}
        disabled={cercandoPrimoLibero}
      />

      {erroreMese && <p className="text-lg font-bold text-allarme-testo">{erroreMese}</p>}

      <CalendarioMese
        mese={mese}
        onMese={setMese}
        giorni={giorniMese}
        oggi={oggi}
        ultimoGiorno={ultimoGiorno}
        primoMese={primoMese}
        ultimoMese={ultimoMese}
        onGiorno={apriGiorno}
      />

      {!giorniMese && !erroreMese && <p className="text-lg text-grigio">Controllo il calendario…</p>}
    </div>
  );
}
