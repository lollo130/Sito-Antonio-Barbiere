# Istruzioni per Claude Code

Progetto: sito + sistema di prenotazioni per un salone di barbiere a Solarino (SR).
La specifica completa è in `SPECIFICA.md`.

Il backend è **Firebase** (Firestore, Cloud Functions, Firebase Auth, Hosting).
Il modello dei dati sta in `firestore.rules` e in `functions/src/`; `schema.sql`
resta come documento di partenza — descrive il vecchio backend Supabase e serve
solo a capire da dove viene il progetto e a rifare il travaso dei dati.
Leggi `SPECIFICA.md`, `firestore.rules` e `functions/src/blocchi.ts` prima di
scrivere codice.

## Decisioni già prese — non reinterpretare

Queste non sono preferenze, sono vincoli discussi col cliente:

1. **La difesa contro la doppia prenotazione la fa il database, mai il codice applicativo.**
   In Postgres era il vincolo `no_overlap` (exclude constraint). Firestore non ha
   vincoli di esclusione, quindi il ruolo è passato ai **fermi** in `blocchi`:
   documenti con ID prevedibile `{operatore_id}_{istante}`, uno ogni 5 minuti,
   creati con `create` dentro la stessa transazione della prenotazione. Se un
   fermo esiste già la transazione salta per intero.
   Quello che regge è **l'unicità dell'ID imposta da Firestore**, non un
   controllo "prima leggo poi scrivo": quello sarebbe una difesa finta.
   Non sostituirlo con una lettura di controllo, non toglierlo perché
   "complica le scritture". Le righe con `forzata = true` restano fuori dai
   fermi, di proposito, come restavano fuori dal vincolo.
   Il ragionamento per esteso sta in `functions/src/blocchi.ts`.

2. **Il client non legge mai la collezione `prenotazioni`.** Contiene nomi e numeri
   di telefono. La disponibilità pubblica passa solo dalle Cloud Functions
   `agendaGiorno` e `agendaMese`, che restituiscono istanti liberi/occupati e
   mai una riga. Stessa cosa per `blocchi`: messi in fila raccontano l'agenda.
   Attenzione: le regole Firestore **non filtrano le righe** come facevano le
   RLS. Una query pubblica senza `where('attivo','==',true)` non torna meno
   documenti, viene rifiutata tutta. Per questo le letture pubbliche stanno in
   `src/lib/db.ts` e non sparse nelle pagine.

3. **Le scritture su `prenotazioni` passano solo dalle Cloud Functions**, che usano
   l'Admin SDK lato server. Le regole vietano la scrittura a chiunque, admin
   compreso: prenotazione e fermi devono nascere e morire nella stessa
   transazione (vedi § 1), e una regola non sa guardare altri documenti.
   La chiave del service account non deve mai finire nel bundle frontend.
   Le chiavi `VITE_FIREBASE_*` invece sono pubbliche per progetto: nel bundle
   ci vanno, e non proteggono niente.

4. **La categoria uomo/donna è un attributo del servizio, non dell'operatore.**
   Chi fa cosa sta in `operatori_servizi`.

5. **Gli operatori si disattivano, non si cancellano** (`attivo = false`).

6. **Niente account, niente password, niente email obbligatoria per i clienti.**
   Il form di prenotazione ha due campi obbligatori: nome e telefono.

7. **Il pannello admin non impone i propri vincoli.** Se il titolare inserisce a mano un
   cliente in uno slot pieno, mostra l'avviso e salva con `forzata = true`.

## Interfaccia: il pubblico include persone anziane

Requisiti, non suggerimenti:

- Testo minimo 18px, aree toccabili minimo 56px.
- **Mai** `<select>`, mai date picker nativi: sempre bottoni. Il passo "Quando" è un
  calendario mensile vero (griglia 7 colonne, richiesto esplicitamente dal titolare),
  che al tocco di un giorno apre l'agenda oraria di quel giorno — mostra anche gli slot
  occupati, mai il nome di chi/quale operatore. Le celle del mese sono sotto i 56px
  (limite fisico della griglia su telefono): compromesso accettato consapevolmente
  (vedi SPECIFICA.md § 5-6 per la cronologia della decisione).
- Date per esteso ("giovedì 4 settembre"), orari in formato 24h.
- Un'azione principale per schermata, sempre nella stessa posizione.
- Messaggi di errore in italiano semplice, che dicono cosa fare:
  "Manca il numero di telefono", non "Campo obbligatorio non valorizzato".
- Pulsante "Chiama il salone" visibile in ogni schermata del flusso.

## Convenzioni tecniche

- React + Vite + TypeScript, Tailwind. Niente librerie UI pesanti.
- Firebase SDK modulare (`firebase/firestore`, non i bundle "compat".)
- Fuso `Europe/Rome` ovunque. Sul database istanti come `Timestamp`, mai
  stringhe e mai date "naive". Le conversioni da e per l'ora di Roma stanno in
  `functions/src/roma.ts` e in `src/lib/data.ts`: sono due copie della stessa
  logica, in due runtime diversi, ed è voluto.
- Prezzi in centesimi interi, mai float.
- Nomi di tabelle, colonne, variabili e testi dell'interfaccia **in italiano**
  (il cliente e chi manterrà il codice sono italiani).
- Componenti piccoli, un file per schermata.

## Ordine di lavoro suggerito

1. Regole Firestore + verifica che blocchino davvero l'accesso pubblico a
   `prenotazioni` (`npm run verifica:regole`: prova a leggerla senza account,
   deve fallire).
2. Cloud Function `prenota`, con la gestione della corsa sullo stesso slot
   (`npm run test:prenota`: cinque richieste insieme, una sola deve passare).
3. Flusso pubblico di prenotazione, quattro schermate.
4. Pannello `/admin`, partendo dalla schermata "Oggi".
5. PWA: manifest, service worker, pagina `/installa`.
6. Pagine pubbliche, privacy policy, JSON-LD `LocalBusiness`.

## Fuori scope

Statistiche, incassi, report, storico clienti, programma fedeltà, pagamenti online,
notifiche push, app nativa. Se sembrano utili, non implementarle: sono lavori a parte.
