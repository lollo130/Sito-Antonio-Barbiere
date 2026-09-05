# Salone Antonio — Solarino

Sito e prenotazioni per un barbiere di Solarino (SR).
React + Vite + TypeScript + Tailwind davanti, **Firebase** dietro.

- Specifica: [`SPECIFICA.md`](SPECIFICA.md)
- Vincoli di progetto, da leggere prima di scrivere codice: [`CLAUDE.md`](CLAUDE.md)
- Perché la doppia prenotazione è impossibile: [`functions/src/blocchi.ts`](functions/src/blocchi.ts)

## Com'è fatto

| Pezzo | Dove |
|---|---|
| Sito e pannello | `src/`, servito da Firebase Hosting |
| Dati | Firestore, regole in `firestore.rules` |
| Prenotazioni e disponibilità | Cloud Functions in `functions/src/` |
| Accesso al pannello | Firebase Auth + una riga in `profili` |

Il sito pubblico **non legge mai** le prenotazioni: chiede a `agendaGiorno` e
`agendaMese` quali istanti sono liberi. Scrivere una prenotazione passa sempre
da una Cloud Function, perché insieme alla riga vanno creati i *fermi* dello
slot nella stessa transazione.

## Primo avvio

```bash
npm install
npm --prefix functions install
cp .env.example .env   # poi riempilo con i valori del progetto Firebase
```

Le chiavi `VITE_FIREBASE_*` stanno in Firebase console → Impostazioni progetto →
Le tue app → Web. Non sono segrete.

Per gli script da riga di comando serve anche una chiave del service account
(Firebase console → Account di servizio → Genera nuova chiave privata), salvata
fuori dal repository e indicata da `GOOGLE_APPLICATION_CREDENTIALS`.

```bash
npm run dev          # sito in locale
npm run emulatori    # Firestore, Auth e Functions in locale
```

## Preparare un progetto nuovo

```bash
firebase use --add                 # collega il progetto Firebase
firebase deploy --only firestore   # regole + indici
npm run semina                     # dati segnaposto: operatori, servizi, orari
npm run crea:admin titolare@esempio.it "una-password-lunga"
```

`crea:admin` esiste perché la collezione `profili` non è scrivibile da nessun
client: è quella che decide chi entra nel pannello.

## Travaso da Supabase

Il backend precedente era Supabase. `schema.sql` e `supabase/` restano nel
repository come documentazione del punto di partenza e per poter rifare il
travaso; si possono cancellare quando i dati sono passati e il progetto vecchio
è spento.

```bash
node --env-file=.env scripts/migra-a-firestore.mjs --prova   # dice cosa farebbe
npm run migra                                                # travasa davvero
```

Ricostruisce anche i fermi in `blocchi` a partire dalle prenotazioni: senza,
quelle migrate non impedirebbero una nuova prenotazione sopra di loro.
Gli account admin non si migrano — gli uid di Supabase Auth non valgono su
Firebase Auth. Vanno rifatti con `npm run crea:admin`.

## Controlli

```bash
npm run verifica:regole    # il pubblico non deve leggere le prenotazioni
npm run verifica:agenda    # l'agenda dice occupato senza dire di chi
npm run test:prenota       # cinque prenotazioni insieme: una sola deve passare
```

Il terzo è quello che conta: dimostra che i fermi in `blocchi` fanno il lavoro
che faceva l'exclude constraint di Postgres. Se un giorno fallisce, due clienti
hanno preso lo stesso posto.

## Pubblicare

```bash
firebase functions:secrets:set RESEND_API_KEY   # una volta sola
npm run deploy                                  # build + hosting + functions + regole
```

Le funzioni stanno in `europe-west1`. La regione è scritta in due punti —
`functions/src/index.ts` e `src/lib/firebase.ts` — e vanno tenuti uguali,
altrimenti le chiamate finiscono a `us-central1` e rispondono 404.

`netlify.toml` è avanzato dal vecchio hosting: si può cancellare appena il
dominio punta a Firebase.

## App Android

L'app è una TWA generata con Bubblewrap (`android/README.md`). Dipende dal
dominio, non dall'hosting: cambiando host non va rigenerata, purché
`/.well-known/assetlinks.json` continui a essere servito com'è.
