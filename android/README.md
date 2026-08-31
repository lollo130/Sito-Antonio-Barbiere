# App Android (TWA)

Impacchetta la PWA in una vera app Android installabile, con la sua icona e
senza barra del browser. Non tocca il sito: l'app è un guscio che apre il sito
a schermo intero, quindi ogni correzione pubblicata arriva subito anche
nell'app, senza ripubblicare niente.

**Non esiste l'equivalente per iPhone.** Vedi in fondo.

---

## Cosa serve prima di cominciare

- [ ] Il **dominio definitivo in HTTPS** (anche l'indirizzo `.netlify.app` va bene per provare, ma l'app andrà rifatta quando cambi dominio: il collegamento è legato al dominio).
- [ ] **Java JDK 17+** e **Android SDK**. Se non li hai, Bubblewrap li scarica da solo al primo avvio: circa 1,5 GB.
- [ ] Un telefono Android per provare.

## 1. Genera il progetto

```
npx @bubblewrap/cli init --manifest https://IL-TUO-DOMINIO/manifest.json
```

Alla prima esecuzione chiede se può scaricare JDK e Android SDK: rispondi di sì.
Poi fa alcune domande. Le risposte che contano:

| Domanda | Risposta |
|---|---|
| Application ID / package | `it.solarino.barbiereantonio` |
| Application name | `Antonio — Barbiere` |
| Short name | `Antonio` |
| Start URL | `/admin` |
| Theme color | `#2e5949` |
| Background color | `#fbf8f1` |
| Include support for Play Billing | no |

Ti fa creare una **chiave di firma** (keystore) con una password.
**Conservala: senza, non potrai più aggiornare l'app.** Mettila nel gestore di
password, non in questa cartella e mai nel repository.

## 2. Collega l'app al sito

Prendi l'impronta della chiave:

```
keytool -list -v -keystore android.keystore -alias android
```

Copia la riga che comincia con `SHA256:` e genera il file di collegamento:

```
node scripts/genera-assetlinks.mjs 14:6D:E9:...:C7 it.solarino.barbiereantonio
```

Poi **ripubblica il sito** e controlla che
`https://IL-TUO-DOMINIO/.well-known/assetlinks.json` si apra davvero nel
browser. Se non c'è, l'app funziona lo stesso ma mostra la barra degli
indirizzi in cima: si vede subito che è un browser travestito.

## 3. Costruisci il pacchetto

```
npx @bubblewrap/cli build
```

Produce due file:

- `app-release-signed.apk` — da installare direttamente sul telefono
- `app-release-bundle.aab` — da caricare sul Play Store

## 4. Installalo sul telefono del titolare

Il modo semplice, senza Play Store: copia l'`.apk` sul telefono (cavo, Drive,
WhatsApp a te stesso) e aprilo. Android chiederà il permesso di installare da
origini sconosciute e mostrerà un avviso di Play Protect: è normale per le app
non passate dallo store. **Fallo tu di persona il giorno della consegna**, non
mandare l'APK e basta.

## Se invece lo vuoi sul Play Store

Costa 25 € una tantum, e c'è una trappola: gli account aperti come **privato**
devono trovare **12 tester** che tengano l'app installata per **14 giorni
consecutivi** prima di poter pubblicare. Per un barbiere è impraticabile.
Con un account **azienda** l'obbligo non c'è, ma serve un codice D-U-N-S
(il barbiere ha la P. IVA, quindi si può ottenere — sono settimane).

Valutalo solo se lui ci tiene a "essere sul Play Store". Per l'uso reale —
un'icona sul suo telefono — l'APK diretto basta e avanza.

---

## E su iPhone?

Non si può. L'unico modo sarebbe un'app nativa sull'App Store: 99 € l'anno di
programma sviluppatore Apple, e la linea guida 4.2 di Apple rifiuta le app che
sono solo un sito impacchettato — un pannello prenotazioni in un guscio verrebbe
quasi certamente respinto.

Su iPhone si usa **Aggiungi a schermata Home** da Safari. Con i meta tag già
presenti in `index.html`, l'icona è la stessa dell'app Android e il nome sotto
l'icona è "Antonio": all'atto pratico, sulla schermata Home, è indistinguibile
da un'app scaricata.
