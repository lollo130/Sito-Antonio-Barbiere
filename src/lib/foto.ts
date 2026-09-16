// La foto di un operatore, ridotta a qualcosa che sta dentro il suo documento.
//
// PERCHÉ NON FIREBASE STORAGE. Sarebbe il posto giusto per le immagini, e per
// un sito con centinaia di foto non ci sarebbero dubbi. Qui gli operatori sono
// due o tre e la foto è una faccia dentro un cerchio da 64 px: Storage
// vorrebbe un servizio da attivare a mano in console, un file di regole in
// più da tenere allineato a quelle di Firestore, un deploy separato e un pezzo
// di SDK nel bundle — e fino a quel momento il bottone "carica foto" sarebbe
// lì che non funziona, senza dire perché. Questo progetto ha già pagato quel
// prezzo una volta, con l'account admin che sembrava esserci e non c'era.
//
// Quindi la foto viaggia dentro il documento dell'operatore, come testo. Il
// costo vero è che quel documento lo legge anche il pubblico, nel passo "chi
// lo fa": per questo qui sotto si stringe finché non pesa quanto una piccola
// icona, e c'è un tetto invalicabile che vale anche nelle regole Firestore.
//
// Se un giorno gli operatori diventassero dieci o servissero foto grandi, il
// punto da cambiare è uno solo: questa funzione restituisce una stringa, e a
// chi la usa non importa se è un data URL o l'indirizzo di un file altrove.

/** Lato del quadrato finale. 256 regge anche gli schermi a densità doppia. */
const LATO = 256;

/**
 * Quanto può pesare la stringa finale.
 *
 * 40.000 caratteri sono circa 30 kB di immagine — meno di una delle foglie
 * della home. Lo stesso numero sta in `firestore.rules`: qui serve a dare un
 * messaggio comprensibile, là a impedire davvero la scrittura. Un limite che
 * vive solo nel browser non è un limite.
 */
export const MASSIMO_CARATTERI = 40_000;

/** Le qualità da provare, dalla migliore in giù, finché una ci sta dentro. */
const QUALITA = [0.8, 0.7, 0.6, 0.5, 0.4];

export type EsitoFoto = { ok: true; foto: string } | { ok: false; errore: string };

/**
 * Riduce un file scelto dall'utente a un quadrato piccolo.
 *
 * Il ritaglio è centrale: le foto di una persona sono quasi sempre inquadrate
 * al centro, e chiedere al titolare di ritagliarle a mano vorrebbe dire
 * costruire un editor per un caso che capita tre volte in cinque anni.
 */
export async function preparaFoto(file: File): Promise<EsitoFoto> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, errore: 'Questo non è un file immagine. Scegli una foto.' };
  }

  let immagine: ImageBitmap;
  try {
    // `from-image` applica la rotazione scritta nei dati EXIF: senza, le foto
    // fatte col telefono in verticale arrivano coricate.
    immagine = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return { ok: false, errore: 'Non riesco ad aprire questa immagine. Provane un’altra.' };
  }

  const tela = document.createElement('canvas');
  tela.width = LATO;
  tela.height = LATO;
  const pennello = tela.getContext('2d');
  if (!pennello) {
    immagine.close();
    return { ok: false, errore: 'Il browser non riesce a ridurre l’immagine.' };
  }

  // Ritaglio centrale: si prende il quadrato più grande che ci sta dentro.
  const lato = Math.min(immagine.width, immagine.height);
  const x = (immagine.width - lato) / 2;
  const y = (immagine.height - lato) / 2;
  pennello.drawImage(immagine, x, y, lato, lato, 0, 0, LATO, LATO);
  immagine.close();

  for (const qualita of QUALITA) {
    const dati = tela.toDataURL('image/webp', qualita);
    // Se il browser non sa scrivere WebP restituisce un PNG, che pesa troppo:
    // meglio accorgersene qui che scoprirlo da un salvataggio rifiutato.
    if (!dati.startsWith('data:image/webp')) {
      const ripiego = tela.toDataURL('image/jpeg', qualita);
      if (ripiego.length <= MASSIMO_CARATTERI) return { ok: true, foto: ripiego };
      continue;
    }
    if (dati.length <= MASSIMO_CARATTERI) return { ok: true, foto: dati };
  }

  return {
    ok: false,
    errore: 'La foto resta troppo pesante anche ridotta. Provane una meno dettagliata.',
  };
}
