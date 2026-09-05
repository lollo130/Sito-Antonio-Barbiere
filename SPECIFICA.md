# Sito + sistema prenotazioni — Salone di barbiere (Solarino, SR)

Documento di specifica per l'implementazione. Lo schema del database è in `schema.sql`.

---

## 1. Contesto e vincoli non negoziabili

- Il salone è a **Solarino (SR)**. Il sito deve essere riconoscibilmente *suo*, non un template generico.
- **Il pubblico include persone anziane.** Ogni scelta di interfaccia si giudica su questo. In caso di dubbio, vince la versione con meno passaggi e testo più grande.
- **Nessuna registrazione, nessun account, nessuna password per i clienti.**
- Il titolare vuole "un'app": si realizza come **PWA installabile**, non app nativa.
- Tre operatori all'avvio (2 tagli uomo, 1 tagli donna), ma il numero deve essere **gestibile dal pannello** senza toccare il codice.

## 2. Stack

- **Frontend**: React + Vite + TypeScript, Tailwind.
- **Backend**: Firebase (Firestore + Auth + Cloud Functions).
- **Email**: Resend, chiamato dentro la Cloud Function `prenota`.
- **Hosting**: Firebase Hosting.
- **Fuso orario**: `Europe/Rome` ovunque. Timestamp salvati come `timestamptz`.

---

## 3. Modello dati

Vedi `schema.sql`. Punti da non reinterpretare:

- Il genere del taglio è **categoria del servizio**, mai attributo dell'operatore. Chi fa cosa sta in `operatori_servizi`.
- Gli operatori si **disattivano** (`attivo = false`), non si cancellano: lo storico deve restare leggibile.
- Ogni operatore ha **orari propri** (`orari_operatore`), che possono differire da quelli del salone.
- Prezzi in **centesimi interi**, mai float.
- **Fermi degli slot** (collezione `blocchi`): impediscono due prenotazioni sovrapposte sullo stesso operatore. Ogni prenotazione crea, nella stessa transazione, un documento ogni 5 minuti con ID `{operatore_id}_{istante}`; il secondo che ci prova trova l'ID occupato e la transazione salta. A imporlo è Firestore con l'unicità dell'ID, non il codice. Le prenotazioni con `forzata = true` non scrivono fermi, così il titolare può inserire a mano un cliente in uno slot pieno.
  *Storia*: fino alla migrazione a Firebase lo stesso lavoro lo faceva il vincolo di esclusione Postgres `no_overlap`. Il meccanismo è cambiato, la regola no.

---

## 4. Sicurezza (regole Firestore)

Regola centrale: **il pubblico non legge mai la collezione `prenotazioni`.** Contiene nomi e numeri di telefono. Vale anche per `blocchi`: messi in fila raccontano l'agenda.

- Chi non ha fatto l'accesso legge solo `operatori`, `servizi` (righe attive), `operatori_servizi` e `orari_salone`.
- Le regole **non filtrano le righe** come facevano le RLS: una query pubblica senza `where('attivo','==',true)` non torna meno documenti, viene rifiutata tutta. Per questo le letture pubbliche stanno tutte in `src/lib/db.ts`.
- La disponibilità si ottiene **esclusivamente** dalle Cloud Functions `agendaGiorno` e `agendaMese`, che restituiscono istanti liberi/occupati e nient'altro.
- Le scritture su `prenotazioni` passano **solo dalle Cloud Functions**, che usano l'Admin SDK lato server. Nessun client può scrivere, nemmeno l'admin: prenotazione e fermi devono nascere insieme.
- La chiave del service account non compare mai nel bundle frontend. Nel client solo le `VITE_FIREBASE_*`, che sono pubbliche per progetto e non proteggono niente da sole.
- Il pannello admin richiede Firebase Auth + riga in `profili`. `profili` non è scrivibile da nessun client: si popola con `scripts/crea-admin.mjs`.

---

## 5. Flusso di prenotazione (sito pubblico)

Quattro schermate, una domanda per schermata. Avanzamento visibile ("Passo 2 di 4").

1. **Cosa ti serve** — elenco servizi a bottoni grandi, con durata e prezzo scritti in chiaro. Filtro Uomo/Donna in cima.
2. **Quando** — un calendario pubblico vero, non solo la lista degli orari liberi.
   - **Vista mensile**: griglia del mese corrente, Lun-Dom, un giorno per cella. Ogni giorno è colorato **libero** (c'è almeno uno slot disponibile) o **pieno** (nessuno slot, incluso il caso "salone chiuso quel giorno" — stesso trattamento visivo). Giorni passati o oltre la finestra di 60 giorni: disabilitati. Frecce **‹ ›** per cambiare mese, entro la finestra prenotabile.
   - **Tocca un giorno** → si apre l'agenda di quella giornata: colonna verticale di orari, uno per bottone. **Libero** (evidenziato, toccabile — mostra il nome dell'operatore solo se ce n'è uno solo disponibile a quell'ora) oppure **occupato** (in grigio, non toccabile, **mai** un nome — l'utente vede che il posto è pieno, non chi/quale operatore).
   - Un bottone **[Il prima possibile]** in cima salta direttamente al primo giorno con almeno uno slot libero (apre già l'agenda di quel giorno), senza prenotare.
   - *Decisione presa dopo due iterazioni*: prima versione a sole liste di orari liberi, poi agenda a giorni con occupati in vista — il titolare ha chiesto esplicitamente "un calendario vero e proprio", cioè con la vista a griglia mensile. Resta comunque fatto di bottoni — mai un date picker nativo (vedi § 6).
3. **Preferenza operatore** *(facoltativa, si salta da sola)* — "Vuoi un barbiere in particolare?" con **Nessuna preferenza** preselezionato. **Non mostrare questo passo se c'è un solo operatore abilitato al servizio scelto** (es. tagli donna).
4. **Dati** — solo **Nome** (obbligatorio), **Telefono** (obbligatorio), Cognome (facoltativo), Email (facoltativa). Sotto il form, una riga sul trattamento dei dati con link alla privacy policy.

**Conferma finale**: schermata grande con servizio, giorno, ora e **nome dell'operatore assegnato** ("giovedì 4 alle 15:00 con Salvo"), più indirizzo del salone e pulsante "Chiama il salone".

### Assegnazione dell'operatore quando non c'è preferenza
Non a caso e non "il meno occupato": scegliere l'operatore che ha **già una prenotazione adiacente** allo slot richiesto, per non frammentare entrambe le agende con buchi da 30 minuti. A parità, il primo per `ordine`.

### Regole anti-abuso
- Massimo **una prenotazione futura attiva per numero di telefono**.
- Niente prenotazioni a meno di 30 minuti dall'ora corrente (già nella funzione SQL).
- Finestra massima di prenotazione: 60 giorni.

---

## 6. Regole di interfaccia per il pubblico anziano

Non sono suggerimenti estetici, sono requisiti:

- Corpo del testo minimo **18px**, bottoni alti almeno **56px**.
- **Niente menu a tendina** e niente date picker nativi: sempre bottoni. Il calendario del passo "Quando" (§ 5) è una griglia mensile (7 colonne, come richiesto esplicitamente dal titolare) che apre l'agenda oraria di un giorno alla volta al tocco — non un date picker nativo. Le celle del mese sono più strette dei 56px raccomandati altrove (limite fisico di una griglia a 7 colonne su schermo da telefono): compromesso accettato consapevolmente per avere un calendario vero.
- Date scritte per esteso, mai `04/09`. Orari in formato 24h.
- Contrasto WCAG AA minimo. Niente testo grigio chiaro su bianco.
- Un'azione principale per schermata, sempre in fondo e sempre nella stessa posizione.
- Errori in italiano semplice: "Manca il numero di telefono", non "Campo obbligatorio non valorizzato".
- **Pulsante "Chiama il salone" visibile su ogni schermata** del flusso: per alcuni resterà sempre la strada giusta, e va bene così.
- Il sito deve funzionare interamente **senza registrazione e senza email**.

---

## 7. Pannello di gestione (`/admin`)

PWA installabile, **mobile first**. Il titolare la apre dal telefono decine di volte al giorno.

### 7.1 Schermata iniziale: "Oggi"
È la `start_url` del manifest. Risponde a "chi ho adesso" senza toccare niente.

- Lista verticale delle prenotazioni del giorno in ordine di orario. **Non tre colonne affiancate**: su telefono non funzionano.
- Ogni riga: ora, nome cliente, servizio, operatore, **telefono cliccabile** (`tel:`).
- Filtro rapido in cima per isolare un operatore.
- Frecce giorno precedente/successivo + pulsante "Oggi".
- Azioni per riga: **Fatto**, **Non presentato**, **Cancella**.

### 7.2 Azioni rapide
- **Blocca**: un'ora / un pomeriggio / un giorno intero, per un operatore o per tutti.
- **Aggiungi prenotazione a mano** — critica: copre chi prenota per telefono o entra dalla porta. Se manca, il calendario diventa falso e il pannello viene abbandonato in due settimane.

### 7.3 Impostazioni (uso raro, dietro menu)
- **Operatori**: aggiungi, disattiva, spunta i servizi che sa fare, orari settimanali.
- **Servizi**: nome, durata, prezzo, categoria, attivo.
- **Orari salone** e chiusure.
- **Assenze/ferie** per operatore.
- Testi e foto delle pagine pubbliche.

### 7.4 Due regole del pannello
- **Conferma su ogni azione distruttiva** (cancella prenotazione, disattiva operatore). Dita grosse su un telefono: il tocco sbagliato è questione di giorni.
- **Il pannello non impone i propri vincoli.** Se il titolare vuole infilare un cliente in uno slot pieno, deve poterlo fare: mostrare l'avviso di sovrapposizione, poi salvare con `forzata = true`. Un software che dice "no" mentre il cliente è già sulla poltrona viene abbandonato.

### Fuori scope (richieste prevedibili da rimandare)
Statistiche, incassi, report, storico clienti, programma fedeltà, pagamenti online. Non implementare.

---

## 8. Cloud Function `prenota`

Unico punto di scrittura. In ordine, nella stessa invocazione:

1. Valida l'input (nome, telefono con regex, servizio esistente e attivo).
2. Verifica il limite di una prenotazione attiva per telefono.
3. **Rilegge la disponibilità** e sceglie/verifica l'operatore. Se lo slot è sparito nel frattempo, risponde con i 3 slot alternativi più vicini.
4. Scrive prenotazione e fermi in una transazione. Se un fermo esiste già (race condition), ripete il punto 3 anziché restituire un errore generico.
5. Invia le email via Resend:
   - **al titolare**, sempre: servizio, giorno, ora, operatore, nome e **telefono** del cliente;
   - **al cliente**, solo se ha lasciato l'email: conferma con giorno, ora, operatore, indirizzo e numero del salone.
6. Restituisce l'esito.

L'email non deve mai far fallire la prenotazione: se Resend risponde male, la riga resta salvata e l'errore va loggato.

Serve una function analoga `disdici` (link con token nella mail al cliente) se si vuole permettere la disdetta autonoma — opzionale in prima release.

---

## 9. PWA

- `manifest.json` con `start_url: "/admin"`, `display: "standalone"`, icone 192 e 512, nome e colori del salone.
- Service worker per l'installazione. Cache dei soli asset statici: **le prenotazioni devono essere sempre lette dalla rete**, mai da cache.
- L'installazione sulla schermata Home va fatta **di persona il giorno della consegna**: su iPhone si fa da Safari (Condividi → Aggiungi a schermata Home) e da solo non ci arriverà.

### 9.1 Pagina `/installa` — installazione da link

Non esiste un file da scaricare: il link apre il sito e da lì si installa. La pagina rileva il dispositivo e mostra una sola strada.

- **Android / Chrome**: intercettare `beforeinstallprompt`, salvare l'evento, mostrare il pulsante **"Installa app"** che richiama `prompt()`. Due tocchi in tutto.
- **iOS / Safari**: nessuna API di installazione esiste. Mostrare le istruzioni illustrate — Condividi → Aggiungi a schermata Home — con l'icona del tasto Condividi visibile.
- **Già installata** (`display-mode: standalone`): mostrare "L'app è già installata" e un link al pannello.
- **iOS ma non Safari** (Chrome/Firefox su iPhone): avvisare che va aperta con Safari, altrimenti l'installazione non compare.
- In cima alla pagina un **QR code** che punta a `/installa`, così il titolare la manda su WhatsApp a un nuovo collaboratore e si arrangia da solo.

La pagina serve per chi arriva dopo: al titolare l'app la installi tu il giorno della consegna.

**APK sul Play Store** (Bubblewrap + Trusted Web Activity): tecnicamente possibile, fuori scope. Copre solo Android e non risolve il caso iPhone.

---

## 10. Pagine pubbliche

- **Home**: chi sono, foto reali del salone, servizi con prezzi, pulsante Prenota sempre visibile.
- **Dove siamo**: indirizzo a Solarino, mappa, orari, pulsante chiama, link a Google Maps e ai social.
- **Privacy policy**: titolare del trattamento è il salone (non lo sviluppatore), finalità (gestione prenotazioni), dati raccolti (nome, telefono, eventuale email), conservazione, come chiedere la cancellazione.
- SEO locale: title e h1 con il nome del salone + Solarino, dati strutturati `LocalBusiness` (JSON-LD) con indirizzo, orari e telefono.

---

## 11. Da consegnare prima di iniziare (materiale del cliente)

Senza questi dati il lavoro non parte:

- [ ] Listino completo con **durata reale** di ogni servizio
- [ ] Orari di apertura e giorno di chiusura
- [ ] Orari individuali dei tre operatori
- [ ] Nomi degli operatori e chi fa cosa
- [ ] Email da cui partono le conferme (meglio sul dominio nuovo)
- [ ] Foto del salone (Instagram o scatti col telefono, salone pulito, luce di mattina)
- [ ] Indirizzo esatto e numero di telefono
