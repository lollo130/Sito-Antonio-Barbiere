// Dati del salone. Placeholder: da aggiornare con i dati reali del cliente
// (vedi SPECIFICA.md § 11 — indirizzo e telefono in cima alla lista).
export const NOME_SALONE = 'Antonio';
export const SOTTOTITOLO_SALONE = 'Barbiere · Solarino';
export const ANNO_FONDAZIONE = 1982;
export const INDIRIZZO_SALONE = 'Via Rattazzi 12, 96010 Solarino (SR)';
export const VIA_SALONE = 'Via Rattazzi 12';
export const CAP_CITTA_SALONE = '96010 Solarino (SR)';
export const TELEFONO_SALONE = '371 413 5124';
export const TELEFONO_SALONE_TEL = 'tel:+393714135124';
export const EMAIL_SALONE = 'info@dominio-del-salone.it';

// Dati identificativi obbligatori (D.Lgs. 70/2003 art. 7 per il sito,
// GDPR art. 13 per l'informativa: il titolare del trattamento va indicato
// con precisione, "il salone" non basta).
// SEGNAPOSTO: vanno sostituiti prima di considerare il sito a norma.
export const RAGIONE_SOCIALE = '[RAGIONE SOCIALE]';
export const PARTITA_IVA = '[NUMERO]';

// Per quanto restano in archivio le prenotazioni passate. Deve essere un
// tempo deciso e scritto, non "il necessario": il GDPR chiede un criterio
// preciso. 24 mesi copre lo storico utile al salone senza tenersi addosso
// nomi e numeri per sempre. Se il titolare vuole un tempo diverso si cambia
// qui e nell'informativa.
export const MESI_CONSERVAZIONE = 24;

// Ultimo aggiornamento dell'informativa privacy e della pagina cookie.
export const AGGIORNAMENTO_INFORMATIVA = '5 settembre 2026';

// Orari di apertura: segnaposto finché non arrivano quelli veri (§ 11).
export const GIORNI_CHIUSURA = 'Chiuso domenica e lunedì';
export const ORARIO_SINTESI = 'Aperto oggi fino alle 19:30';
