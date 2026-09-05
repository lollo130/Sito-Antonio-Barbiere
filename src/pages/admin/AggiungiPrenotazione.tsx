import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aggiungiGiorni, dataRomaDi, formattaGiornoEsteso, formattaOra } from '../../lib/data';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { agendaDelGiorno, type RigaAgenda } from '../../lib/agenda';
import { aggiungiPrenotazione } from '../../lib/admin';
import { db } from '../../lib/firebase';

// SPECIFICA.md § 7.2 — "Aggiungi prenotazione a mano". Copre chi prenota per
// telefono o entra dalla porta. Senza questa schermata il calendario diventa
// falso e il pannello viene abbandonato in due settimane.
//
// § 7.4 — Il pannello NON impone i propri vincoli: se il titolare vuole
// infilare un cliente in uno slot già pieno deve poterlo fare. Si prova
// l'inserimento normale, e se lo slot è già fermato la funzione risponde
// `slot_occupato`: si mostra l'avviso e si offre il salvataggio con
// `forzata = true`, che i fermi non li scrive affatto.

type Servizio = { id: string; nome: string; durata_minuti: number };
type Operatore = { id: string; nome: string };

// Stesso vincolo del database, così l'errore arriva prima e in italiano.
const REGEX_TELEFONO = /^[0-9+ ]{8,20}$/;

export default function AggiungiPrenotazione() {
  const naviga = useNavigate();
  const oggi = dataRomaDi(new Date().toISOString());

  const [giorno, setGiorno] = useState(oggi);
  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [operatori, setOperatori] = useState<Operatore[]>([]);
  const [orari, setOrari] = useState<RigaAgenda[] | null>(null);

  const [servizioId, setServizioId] = useState<string | null>(null);
  const [operatoreId, setOperatoreId] = useState<string | null>(null);
  const [inizio, setInizio] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [telefono, setTelefono] = useState('');

  const [errore, setErrore] = useState<string | null>(null);
  const [sovrapposta, setSovrapposta] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const attivi = (nome: string) =>
      query(collection(db, nome), where('attivo', '==', true), orderBy('ordine'));

    getDocs(attivi('servizi'))
      .then((r) =>
        setServizi(
          r.docs.map((d) => ({
            id: d.id,
            nome: d.get('nome'),
            durata_minuti: d.get('durata_minuti'),
          })),
        ),
      )
      .catch(() => setServizi([]));

    getDocs(attivi('operatori'))
      .then((r) => setOperatori(r.docs.map((d) => ({ id: d.id, nome: d.get('nome') }))))
      .catch(() => setOperatori([]));
  }, []);

  // Gli orari della giornata dipendono dal servizio (la durata cambia la griglia).
  useEffect(() => {
    if (!servizioId) {
      setOrari(null);
      return;
    }
    let attivo = true;
    setOrari(null);
    agendaDelGiorno(servizioId, giorno)
      .then((righe) => {
        if (attivo) setOrari(righe);
      })
      .catch(() => {
        if (attivo) setOrari([]);
      });
    return () => {
      attivo = false;
    };
  }, [servizioId, giorno]);

  const servizio = servizi.find((s) => s.id === servizioId) ?? null;

  async function salva(forza: boolean) {
    if (!servizio) return setErrore('Scegli il servizio');
    if (!operatoreId) return setErrore('Scegli chi lo fa');
    if (!inizio) return setErrore("Scegli l'ora");
    if (nome.trim().length < 2) return setErrore('Manca il nome del cliente');
    if (!REGEX_TELEFONO.test(telefono.trim()))
      return setErrore('Il numero di telefono non va bene: solo cifre, spazi e il segno +');

    setSalvando(true);
    setErrore(null);

    let esito;
    try {
      esito = await aggiungiPrenotazione({
        servizio_id: servizio.id,
        operatore_id: operatoreId,
        inizio,
        cliente_nome: nome.trim(),
        cliente_telefono: telefono.trim(),
        forzata: forza,
      });
    } catch {
      setSalvando(false);
      setErrore('Non sono riuscito a salvare. Riprova.');
      return;
    }

    setSalvando(false);

    if (!esito.ok) {
      // Lo slot è già fermato: si chiede al titolare se forzare.
      if (esito.codice === 'slot_occupato') {
        setSovrapposta(true);
        setErrore(null);
        return;
      }
      setErrore(esito.errore);
      return;
    }

    naviga('/admin');
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-titolo text-2xl font-bold uppercase text-inchiostro">Aggiungi a mano</h1>
        <button
          type="button"
          onClick={() => naviga('/admin')}
          className="font-titolo text-base font-bold text-grigio underline"
        >
          Annulla
        </button>
      </div>

      <Sezione titolo="Giorno">
        <div className="flex items-center gap-3">
          <FrecciaGiorno verso="‹" onClick={() => setGiorno((g) => aggiungiGiorni(g, -1))} etichetta="Giorno precedente" />
          <p className="flex-1 text-center font-titolo text-base font-bold text-inchiostro">
            {formattaGiornoEsteso(giorno)}
          </p>
          <FrecciaGiorno verso="›" onClick={() => setGiorno((g) => aggiungiGiorni(g, 1))} etichetta="Giorno successivo" />
        </div>
      </Sezione>

      <Sezione titolo="Servizio">
        <div className="flex flex-col gap-2">
          {servizi.map((s) => (
            <Scelta
              key={s.id}
              attivo={servizioId === s.id}
              onClick={() => {
                setServizioId(s.id);
                setInizio(null);
              }}
            >
              {s.nome} · {s.durata_minuti} min
            </Scelta>
          ))}
        </div>
      </Sezione>

      <Sezione titolo="Chi lo fa">
        <div className="flex flex-wrap gap-2">
          {operatori.map((o) => (
            <Scelta key={o.id} attivo={operatoreId === o.id} onClick={() => setOperatoreId(o.id)} stretto>
              {o.nome}
            </Scelta>
          ))}
        </div>
      </Sezione>

      <Sezione titolo="Ora">
        {!servizioId && <p className="text-base text-grigio">Scegli prima il servizio.</p>}
        {servizioId && !orari && <p className="text-base text-grigio">Carico gli orari…</p>}
        {orari && orari.length === 0 && (
          <p className="text-base text-grigio">Il salone è chiuso questo giorno. Puoi comunque scegliere un altro giorno.</p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {orari?.map((o) => (
            <button
              key={o.inizio}
              type="button"
              onClick={() => {
                setInizio(o.inizio);
                setSovrapposta(false);
              }}
              className={`min-h-[52px] rounded-lg border-2 font-titolo text-base font-bold tabular-nums ${
                inizio === o.inizio
                  ? 'border-verde bg-verde text-carta-chiara'
                  : o.libero
                    ? 'border-bordo bg-carta-chiara text-inchiostro'
                    : 'border-bordo bg-pieno text-pieno-testo'
              }`}
            >
              {formattaOra(o.inizio)}
            </button>
          ))}
        </div>
        {orari && orari.length > 0 && (
          <p className="mt-2 text-sm text-grigio">
            Gli orari su fondo grigio sono già occupati. Puoi sceglierli lo stesso.
          </p>
        )}
      </Sezione>

      <Sezione titolo="Cliente">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-titolo text-base font-bold text-inchiostro">Nome</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="min-h-[56px] rounded-lg border-2 border-bordo bg-carta-chiara px-4 text-lg text-inchiostro focus:border-verde focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-titolo text-base font-bold text-inchiostro">Telefono</span>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="min-h-[56px] rounded-lg border-2 border-bordo bg-carta-chiara px-4 font-titolo text-lg text-inchiostro focus:border-verde focus:outline-none"
            />
          </label>
        </div>
      </Sezione>

      {errore && (
        <p className="rounded-lg border-2 border-allarme bg-allarme-sfondo px-4 py-3 text-lg font-bold text-allarme-testo">
          {errore}
        </p>
      )}

      {sovrapposta ? (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-allarme bg-allarme-sfondo px-4 py-4">
          <p className="text-lg font-bold text-allarme-testo">C'è già un cliente a quest'ora</p>
          <p className="text-base leading-relaxed text-allarme-testo">
            {inizio ? `Alle ${formattaOra(inizio)} ` : ''}
            l'operatore che hai scelto è già impegnato. Se lo vuoi mettere lo stesso, si può: resterà
            segnato come inserito a mano.
          </p>
          <button
            type="button"
            disabled={salvando}
            onClick={() => salva(true)}
            className="min-h-[56px] rounded-lg bg-allarme font-titolo text-lg font-bold uppercase text-carta-chiara disabled:opacity-60"
          >
            {salvando ? 'Salvo…' : 'Mettilo lo stesso'}
          </button>
          <button
            type="button"
            onClick={() => setSovrapposta(false)}
            className="font-titolo text-base font-bold text-allarme-testo underline"
          >
            No, cambio ora
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={salvando}
          onClick={() => salva(false)}
          className="min-h-[60px] rounded-lg bg-verde font-titolo text-xl font-bold uppercase tracking-wide text-carta-chiara disabled:opacity-60"
        >
          {salvando ? 'Salvo…' : 'Salva prenotazione'}
        </button>
      )}
    </main>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-titolo text-[0.68rem] font-bold uppercase tracking-[0.18em] text-marrone">
        {titolo}
      </h2>
      {children}
    </section>
  );
}

function Scelta({
  attivo,
  onClick,
  children,
  stretto,
}: {
  attivo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  stretto?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={attivo}
      onClick={onClick}
      className={`min-h-[56px] rounded-lg border-2 px-4 font-titolo text-lg font-bold ${
        stretto ? '' : 'w-full text-left'
      } ${attivo ? 'border-verde bg-verde text-carta-chiara' : 'border-bordo bg-carta-chiara text-inchiostro'}`}
    >
      {children}
    </button>
  );
}

function FrecciaGiorno({
  verso,
  onClick,
  etichetta,
}: {
  verso: string;
  onClick: () => void;
  etichetta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etichetta}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-bordo font-titolo text-2xl font-bold text-verde"
    >
      {verso}
    </button>
  );
}
