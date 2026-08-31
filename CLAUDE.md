# Istruzioni per Claude Code

Progetto: sito + sistema di prenotazioni per un salone di barbiere a Solarino (SR).
La specifica completa è in `SPECIFICA.md`, lo schema del database in `schema.sql`.
Leggi entrambi prima di scrivere codice.

## Decisioni già prese — non reinterpretare

Queste non sono preferenze, sono vincoli discussi col cliente:

1. **Il vincolo `no_overlap` in Postgres è l'unica vera difesa contro la doppia prenotazione.**
   Non sostituirlo con un controllo applicativo, non rimuoverlo perché "complica gli insert".
   Le righe con `forzata = true` ne restano fuori di proposito.

2. **Il client non ha mai `select` sulla tabella `prenotazioni`.** Contiene nomi e numeri di
   telefono. La disponibilità pubblica passa solo da `slot_disponibili()`.

3. **Le scritture su `prenotazioni` passano solo dall'edge function** con `service_role` key
   lato server. La `service_role` key non deve mai finire nel bundle frontend.

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
- Fuso `Europe/Rome` ovunque. Timestamp come `timestamptz`. Mai date "naive".
- Prezzi in centesimi interi, mai float.
- Nomi di tabelle, colonne, variabili e testi dell'interfaccia **in italiano**
  (il cliente e chi manterrà il codice sono italiani).
- Componenti piccoli, un file per schermata.

## Ordine di lavoro suggerito

1. Migration da `schema.sql` + verifica che le RLS blocchino davvero l'accesso anon
   a `prenotazioni` (provare a leggerla con la anon key: deve fallire).
2. Edge function `prenota` con la gestione dell'errore `23P01` (race condition).
3. Flusso pubblico di prenotazione, quattro schermate.
4. Pannello `/admin`, partendo dalla schermata "Oggi".
5. PWA: manifest, service worker, pagina `/installa`.
6. Pagine pubbliche, privacy policy, JSON-LD `LocalBusiness`.

## Fuori scope

Statistiche, incassi, report, storico clienti, programma fedeltà, pagamenti online,
notifiche push, app nativa. Se sembrano utili, non implementarle: sono lavori a parte.
