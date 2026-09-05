// Test della logica di disponibilità, senza toccare niente.
//
// È l'unico test che gira offline: non serve Firebase, non serve rete, non
// serve l'emulatore. Prova le tre cose che il passaggio da Postgres a
// Firestore ha spostato dal database al codice, e che quindi adesso possono
// sbagliare da sole:
//
//   1. l'ora di Roma, ora legale compresa (la faceva `at time zone`);
//   2. la griglia degli orari proposti (la faceva `generate_series`);
//   3. i fermi che tengono occupato uno slot (li faceva `no_overlap`).
//
// Uso: npm --prefix functions run build && node scripts/test-disponibilita.mjs

import {
  agendaDaProposte,
  proposteDelGiorno,
} from '../functions/lib/disponibilita.js';
import {
  allineatoAlPasso,
  idBlocco,
  istantiDaFermare,
} from '../functions/lib/blocchi.js';
import {
  confiniGiornoRoma,
  dataRomaDi,
  giornoSettimanaRoma,
  istanteRoma,
  offsetRoma,
} from '../functions/lib/roma.js';

let fallito = false;
function esito(ok, etichetta, dettaglio) {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${etichetta}${dettaglio ? ' — ' + dettaglio : ''}`);
  if (!ok) fallito = true;
}
const uguali = (a, b, etichetta) =>
  esito(a === b, etichetta, a === b ? '' : `atteso ${b}, ottenuto ${a}`);

// =====================================================================
console.log('\n1. Ora di Roma\n');

uguali(offsetRoma('2026-01-15'), '+01:00', 'gennaio è ora solare');
uguali(offsetRoma('2026-07-15'), '+02:00', 'luglio è ora legale');
uguali(istanteRoma('2026-01-15', '09:00').toISOString(), '2026-01-15T08:00:00.000Z', "le 9 d'inverno");
uguali(istanteRoma('2026-07-15', '09:00').toISOString(), '2026-07-15T07:00:00.000Z', "le 9 d'estate");

// Mezzanotte a Roma è ancora il giorno prima in UTC: il giro deve tornare.
uguali(dataRomaDi(istanteRoma('2026-07-15', '00:00')), '2026-07-15', 'mezzanotte resta nel suo giorno');
uguali(
  confiniGiornoRoma('2026-07-15').fine.toISOString(),
  '2026-07-15T22:00:00.000Z',
  'il giorno finisce alla mezzanotte di Roma',
);

// 0 = domenica, come extract(dow) in Postgres.
uguali(giornoSettimanaRoma('2026-09-06'), 0, 'domenica vale 0');
uguali(giornoSettimanaRoma('2026-09-12'), 6, 'sabato vale 6');

// =====================================================================
console.log('\n2. Griglia degli orari\n');

const OPERATORE = { id: 'op1', nome: 'Antonio', ordine: 1 };
const ALTRO = { id: 'op2', nome: 'Marco', ordine: 2 };

function contesto({ operatori = [OPERATORE], occupati = new Map(), chiusure = [] } = {}) {
  const orari = new Map();
  operatori.forEach((o) =>
    orari.set(o.id, [{ giorno: 4, ora_inizio: '09:00', ora_fine: '13:00' }]),
  );
  return { operatori, orari, occupati, chiusure };
}

// Giovedì 3 settembre 2026, guardato da molto prima: il preavviso non toglie
// niente e la griglia si vede tutta.
const GIORNO = '2026-09-03';
const MOLTO_PRIMA = new Date('2026-08-01T00:00:00Z');

const base = proposteDelGiorno(contesto(), GIORNO, 30, MOLTO_PRIMA);
// 09:00 → 12:30 ogni 15 minuti, estremo incluso: 15 proposte.
uguali(base.length, 15, 'una proposta ogni 15 minuti fino a ora_fine - durata');
uguali(base[0].inizio.toISOString(), '2026-09-03T07:00:00.000Z', 'la prima è alle 09:00 di Roma');
uguali(
  base[base.length - 1].inizio.toISOString(),
  '2026-09-03T10:30:00.000Z',
  "l'ultima è alle 12:30, così il servizio finisce alle 13:00",
);
esito(
  base.every((p) => p.libero),
  'senza prenotazioni sono tutte libere',
);

// Una durata più lunga accorcia la coda della giornata.
uguali(
  proposteDelGiorno(contesto(), GIORNO, 60, MOLTO_PRIMA).length,
  13,
  'un servizio da un\'ora ha due proposte in meno',
);

// Preavviso: chi guarda a mezzogiorno non vede più la mattina.
const aMezzogiorno = new Date('2026-09-03T09:45:00Z'); // 11:45 a Roma
const tardi = proposteDelGiorno(contesto(), GIORNO, 30, aMezzogiorno);
esito(
  tardi.every((p) => p.inizio.getTime() > aMezzogiorno.getTime() + 30 * 60_000),
  'niente proposte con meno di 30 minuti di preavviso',
);

// Sovrapposizione. Una prenotazione dalle 10:00 alle 10:30 di Roma occupa le
// proposte delle 09:45, 10:00 e 10:15 — un servizio da 30 minuti che parte lì
// le finisce addosso — ma NON quella delle 09:30, che finisce quando l'altra
// comincia, né quella delle 10:30, che comincia quando l'altra finisce. È il
// comportamento degli intervalli semiaperti, lo stesso di tstzrange '[)'.
const occupati = new Map([
  [OPERATORE.id, [{ inizio: istanteRoma(GIORNO, '10:00'), fine: istanteRoma(GIORNO, '10:30') }]],
]);
const conOccupato = proposteDelGiorno(contesto({ occupati }), GIORNO, 30, MOLTO_PRIMA);
// Le ore qui sotto sono ore di Roma, quelle che il cliente legge sul telefono.
const alle = (ora) =>
  conOccupato.find((p) => p.inizio.getTime() === istanteRoma(GIORNO, ora).getTime());
uguali(alle('09:30').libero, true, "le 09:30 restano libere: finiscono quando l'altra comincia");
uguali(alle('09:45').libero, false, 'le 09:45 sono occupate');
uguali(alle('10:00').libero, false, "l'orario prenotato è occupato");
uguali(alle('10:15').libero, false, 'le 10:15 sono occupate');
uguali(alle('10:30').libero, true, "le 10:30 sono libere: cominciano quando l'altra finisce");

// Chiusura del salone: vale per tutti, non per un operatore solo.
const chiuso = proposteDelGiorno(
  contesto({
    operatori: [OPERATORE, ALTRO],
    chiusure: [{ inizio: new Date('2026-09-03T00:00:00Z'), fine: new Date('2026-09-04T00:00:00Z') }],
  }),
  GIORNO,
  30,
  MOLTO_PRIMA,
);
esito(chiuso.every((p) => !p.libero), 'una chiusura spegne tutta la giornata');

// Agenda pubblica: una riga per istante, e il nome esce solo se resta libero
// un operatore soltanto (CLAUDE.md § 2).
const dueOperatori = contesto({ operatori: [OPERATORE, ALTRO], occupati });
const agenda = agendaDaProposte(proposteDelGiorno(dueOperatori, GIORNO, 30, MOLTO_PRIMA));
uguali(agenda.length, 15, 'una riga per istante, non una per operatore');
const rigaContesa = agenda.find(
  (r) => r.inizio.getTime() === istanteRoma(GIORNO, '10:00').getTime(),
);
uguali(rigaContesa.libero, true, "le 10:00 restano libere: c'è l'altro operatore");
uguali(rigaContesa.operatoreNome, 'Marco', 'col nome, perché è rimasto libero lui solo');
uguali(
  agenda.find((r) => r.inizio.getTime() === istanteRoma(GIORNO, '09:00').getTime()).operatoreNome,
  null,
  'nessun nome quando sono liberi in due',
);

// =====================================================================
console.log('\n3. Fermi degli slot\n');

const inizio = new Date('2026-09-03T08:00:00.000Z');
uguali(istantiDaFermare(inizio, 30).length, 6, 'mezz\'ora sono sei fermi da 5 minuti');
uguali(
  istantiDaFermare(inizio, 30).at(-1).toISOString(),
  '2026-09-03T08:25:00.000Z',
  "l'ultimo fermo è prima della fine, non sulla fine",
);
uguali(idBlocco('op1', inizio), 'op1_202609030800', "l'ID del fermo è prevedibile");

// Due prenotazioni attaccate non devono condividere nemmeno un fermo: è la
// prova che back-to-back funziona come faceva l'intervallo semiaperto.
const primi = istantiDaFermare(inizio, 30).map((d) => idBlocco('op1', d));
const secondi = istantiDaFermare(new Date('2026-09-03T08:30:00.000Z'), 30).map((d) =>
  idBlocco('op1', d),
);
esito(
  primi.every((id) => !secondi.includes(id)),
  'due prenotazioni una dopo l\'altra non si toccano',
);
// Sovrapposte sì, invece.
const sovrapposti = istantiDaFermare(new Date('2026-09-03T08:15:00.000Z'), 30).map((d) =>
  idBlocco('op1', d),
);
esito(
  sovrapposti.some((id) => primi.includes(id)),
  'due prenotazioni sovrapposte litigano sullo stesso fermo',
);

esito(allineatoAlPasso(inizio), 'un orario sulla griglia è accettato');
esito(!allineatoAlPasso(new Date('2026-09-03T08:07:00.000Z')), 'le 08:07 sono rifiutate');
esito(!allineatoAlPasso(new Date('2026-09-03T08:00:30.000Z')), 'i secondi sono rifiutati');

console.log(fallito ? '\nQualcosa non va: vedi le righe FAIL.' : '\nTutto a posto.');
process.exit(fallito ? 1 : 0);
