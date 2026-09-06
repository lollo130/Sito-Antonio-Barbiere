// Il fogliame che invade le fasce della pagina.
//
// STORIA DEI DUE ERRORI, perché spiegano com'è fatto adesso.
//
// 1. Prima le foglie potevano stare solo NEGLI ANGOLI. Con quattro posizioni
//    possibili la simmetria non era un difetto di gusto, era obbligata: una
//    a sinistra, una a destra, sempre. Adesso crescono lungo un BORDO, in
//    punti scelti a mano e volutamente irregolari — 7%, 24%, 46%, 63%…
//    Una pianta che spunta a metà del bordo inferiore non sembra appiccicata:
//    sembra una pianta che sta sotto la pagina, che è esattamente l'effetto.
//
// 2. Le foglie uscivano dal bordo di una percentuale messa a occhio — 30, 44,
//    in un caso 80 — e di alcune restava dentro il solo picciolo. Misurando
//    l'inchiostro riga per riga si scopre che il gambo è il 9-20% del
//    disegno, a seconda di quale: oltre quella soglia si comincia a tagliare
//    la lamina. Ora ogni disegno ha il suo PICCIOLO misurato, e quanto esce
//    si conta a partire da lì.
//
// LA REGOLA CHE COMANDA TUTTO: una pianta entra dal picciolo, mai dalla
// punta. In natura il gambo viene da fuori — dal vaso, dal terreno — e la
// foglia si apre verso l'interno. In tutti e cinque i disegni il picciolo sta
// in basso, quindi:
//   - bordo basso -> rotazione vicino a 0°, il gambo esce in giù;
//   - bordo alto  -> vicino a 180°, il gambo esce in su e la foglia pende.
// Lo scarto è una ventina di gradi, quel tanto che toglie l'aria di griglia.
//
// Il disordine è scritto a mano una volta e resta sempre quello. Non è
// casuale a ogni caricamento: la pagina ballerebbe a ogni visita e non si
// potrebbe più correggere una pianta venuta male.
//
// Il fogliame può permettersi di essere fitto perché il contenuto sta dentro
// una cornice, ed è la cornice a tenere il testo al sicuro. La maschera sfuma
// comunque il tratto prima che arrivi alle parole.
//
// LA PROFONDITA': una foresta non e' una fila di piante, sono piani. Le
// piccole stanno piu' su e piu' lontane dal bordo, e la maschera le sbiadisce
// come la foschia fa con gli alberi in fondo; le grandi stanno sul bordo e
// coprono le altre. Nell'elenco di ogni macchia il fondale viene per primo,
// perche' chi e' disegnato prima finisce sotto.
//
// Sono SVG: 18-34 kB compressi, nitidi a qualunque misura, e le stesse cinque
// immagini ripetute quaranta volte restano cinque scaricamenti.
//
// Incisioni botaniche — attribuzione nel piede del sito.

type Disegno =
  | 'foglia-lancia'
  | 'foglia-larga'
  | 'foglia-sottile'
  | 'monstera-incisa'
  | 'palma';

/** Proporzione di ogni disegno, dal suo viewBox. */
const RAPPORTO: Record<Disegno, number> = {
  'foglia-lancia': 1232 / 1885,
  'foglia-larga': 1204 / 1305,
  'foglia-sottile': 1012 / 1756,
  'monstera-incisa': 1204 / 1305,
  palma: 1584 / 2041,
};

/**
 * Quanta parte del disegno, dal basso, è picciolo o spazio vuoto.
 *
 * Misurato sull'inchiostro riga per riga, non a occhio: si guarda da sotto
 * quante righe hanno un tratto stretto — meno del 18% della larghezza
 * massima — prima che cominci la lamina. È la quota che può uscire dal bordo
 * senza perdere niente di quello che si deve vedere.
 */
const PICCIOLO: Record<Disegno, number> = {
  'foglia-lancia': 9,
  'foglia-larga': 20,
  'foglia-sottile': 11,
  'monstera-incisa': 9,
  palma: 9,
};

/**
 * Le misure sono in vw, non in rem: con una misura fissa la stessa foglia era
 * un dettaglio su un monitor da 2000 px e mezza pagina su un portatile da
 * 800. Sul telefono la frazione è molto più grande perché lo schermo è
 * stretto.
 */
type Misura = 'grande' | 'media' | 'piccola' | 'minuta';
const LARGHEZZA: Record<Misura, [telefono: number, schermo: number]> = {
  grande: [64, 22],
  media: [50, 17],
  piccola: [38, 13],
  minuta: [28, 9],
};

type Pianta = {
  disegno: Disegno;
  misura: Misura;
  /** dove sta lungo il bordo, in percentuale della fascia */
  x: number;
  /** gradi: è quello che toglie l'aria di griglia */
  ruota: number;
  /**
   * Quanto esce OLTRE il picciolo, in punti percentuali dell'altezza.
   * Assente significa "fuori esattamente il gambo". Serve solo a variare:
   * già a 10 si comincia a mangiare la lamina.
   */
  extra?: number;
  /**
   * Quanto la pianta si alza dal bordo, in percentuale dell'altezza della
   * fascia. È quello che dà la profondità: le piante del fondale stanno più
   * su e più piccole, e la maschera — che si spegne andando verso il centro
   * — le sbiadisce da sola, come la foschia fa con gli alberi lontani. Il
   * loro picciolo non resta appeso a mezz'aria proprio perché lassù la
   * maschera l'ha già portato a zero.
   */
  alza?: number;
  specchia?: boolean;
  /** le piante di contorno: sul telefono coprirebbero il testo */
  soloDaTablet?: boolean;
};

type Macchia = { bordo: 'alto' | 'basso'; piante: Pianta[] };

/**
 * Le macchie di vegetazione. Le `x` non sono mai equidistanti e non si
 * specchiano fra loro: bastano due piante alla stessa distanza dai due bordi
 * per far tornare l'aria di aiuola.
 */
const MACCHIE = {
  // Il sottobosco dell'apertura. Nove piante su tre piani: prima il
  // fondale, che finisce dietro perche' disegnato per primo, poi la
  // fascia di mezzo, poi il primo piano.
  fondoFitto: {
    bordo: 'basso',
    piante: [
      // fondale — piccole, staccate dal bordo, sbiadite dalla maschera
      { disegno: 'foglia-larga', misura: 'minuta', x: 16, ruota: -6, alza: 9, soloDaTablet: true },
      { disegno: 'palma', misura: 'piccola', x: 34, ruota: 12, alza: 13, soloDaTablet: true },
      { disegno: 'foglia-sottile', misura: 'minuta', x: 57, ruota: -17, alza: 7, soloDaTablet: true },
      { disegno: 'monstera-incisa', misura: 'piccola', x: 79, ruota: 9, alza: 11, soloDaTablet: true },
      // mezzo
      { disegno: 'foglia-sottile', misura: 'piccola', x: 24, ruota: -14, extra: 4, alza: 3, soloDaTablet: true },
      { disegno: 'foglia-lancia', misura: 'piccola', x: 63, ruota: 17, alza: 4, soloDaTablet: true },
      // primo piano
      { disegno: 'palma', misura: 'grande', x: 7, ruota: 8 },
      { disegno: 'monstera-incisa', misura: 'media', x: 46, ruota: 5, extra: 2, soloDaTablet: true },
      { disegno: 'palma', misura: 'media', x: 88, ruota: -11, extra: 3, specchia: true },
    ],
  },
  // Piu' rado, per le fasce dove il contenuto arriva in fondo.
  fondoRado: {
    bordo: 'basso',
    piante: [
      { disegno: 'foglia-sottile', misura: 'minuta', x: 26, ruota: 14, alza: 10, soloDaTablet: true },
      { disegno: 'palma', misura: 'piccola', x: 57, ruota: -8, alza: 12, soloDaTablet: true },
      { disegno: 'foglia-larga', misura: 'minuta', x: 93, ruota: 5, alza: 8, soloDaTablet: true },
      { disegno: 'foglia-lancia', misura: 'piccola', x: 39, ruota: 13, extra: 5, alza: 2, soloDaTablet: true },
      { disegno: 'monstera-incisa', misura: 'media', x: 11, ruota: -9 },
      { disegno: 'palma', misura: 'grande', x: 82, ruota: 6, extra: 2 },
    ],
  },
  // Chioma fitta che pende dall'alto.
  cimaFitta: {
    bordo: 'alto',
    piante: [
      { disegno: 'foglia-sottile', misura: 'minuta', x: 8, ruota: 178, alza: 8, soloDaTablet: true },
      { disegno: 'monstera-incisa', misura: 'piccola', x: 44, ruota: 195, alza: 11, soloDaTablet: true },
      { disegno: 'foglia-larga', misura: 'minuta', x: 61, ruota: 166, alza: 7, soloDaTablet: true },
      { disegno: 'palma', misura: 'piccola', x: 86, ruota: 183, alza: 12, soloDaTablet: true },
      { disegno: 'foglia-sottile', misura: 'piccola', x: 34, ruota: 192, extra: 4, alza: 3, soloDaTablet: true },
      { disegno: 'foglia-lancia', misura: 'minuta', x: 93, ruota: 168, soloDaTablet: true },
      { disegno: 'foglia-larga', misura: 'media', x: 15, ruota: 174 },
      { disegno: 'palma', misura: 'grande', x: 72, ruota: 185, extra: 2 },
    ],
  },
  // Poche foglie in alto, per le fasce basse.
  cimaRada: {
    bordo: 'alto',
    piante: [
      { disegno: 'foglia-lancia', misura: 'minuta', x: 12, ruota: 172, alza: 9, soloDaTablet: true },
      { disegno: 'palma', misura: 'piccola', x: 52, ruota: 189, alza: 12, soloDaTablet: true },
      { disegno: 'foglia-sottile', misura: 'piccola', x: 67, ruota: 171, soloDaTablet: true },
      { disegno: 'monstera-incisa', misura: 'media', x: 28, ruota: 187, extra: 3 },
      { disegno: 'foglia-larga', misura: 'piccola', x: 89, ruota: 181, alza: 4, soloDaTablet: true },
    ],
  },
} satisfies Record<string, Macchia>;

export type NomeMacchia = keyof typeof MACCHIE;

export default function Decoro({
  macchie,
  suScuro = false,
}: {
  /**
   * Le macchie di questa fascia, TUTTE INSIEME.
   *
   * Non e' un vezzo di comodita': e' la ragione per cui le foglie si
   * coprono invece di sommarsi. La fusione "multiply" agisce sul gruppo,
   * quindi due gruppi separati si fondono ciascuno col colore della fascia
   * e dove si incrociano si vedono tutt'e due in trasparenza. Dentro un
   * gruppo solo, invece, le foglie si compongono fra loro normalmente —
   * cioe' quella sopra copre quella sotto, come due foglie vere — e solo il
   * risultato finito viene fuso col fondo.
   */
  macchie: NomeMacchia[];
  /** true sulle fasce scure: il tratto va schiarito invece che scurito */
  suScuro?: boolean;
}) {
  const bordi = new Set(macchie.map((m) => (MACCHIE[m] as Macchia).bordo));
  const sfumatura =
    bordi.size === 2
      ? 'sfuma-da-entrambi'
      : bordi.has('alto')
        ? 'sfuma-dalla-cima'
        : 'sfuma-dal-fondo';

  return (
    <span
      aria-hidden="true"
      className={`decoro ${suScuro ? 'decoro-su-scuro' : ''} pointer-events-none absolute inset-0 block overflow-hidden ${sfumatura}`}
    >
      {macchie.flatMap((nome) => {
        const { bordo, piante } = MACCHIE[nome] as Macchia;
        const dallAlto = bordo === 'alto';

        return piante.map((p: Pianta, i) => {
          const [telefono, schermo] = LARGHEZZA[p.misura];
          const fuori = PICCIOLO[p.disegno] + (p.extra ?? 0);
          return (
            <img
              key={`${nome}-${p.disegno}-${i}`}
              src={`/sfondi/${p.disegno}.svg`}
              alt=""
              loading="lazy"
              decoding="async"
              style={
                {
                  left: `${p.x}%`,
                  [dallAlto ? 'top' : 'bottom']: `${p.alza ?? 0}%`,
                  // -50% centra la pianta sulla sua x, poi la spinta oltre
                  // il bordo, poi la rotazione.
                  transform: `translate(-50%, ${dallAlto ? '-' : ''}${fuori}%) rotate(${p.ruota}deg)${
                    p.specchia ? ' scaleX(-1)' : ''
                  }`,
                  '--larga-telefono': `${telefono}vw`,
                  '--larga-schermo': `${schermo}vw`,
                  aspectRatio: String(RAPPORTO[p.disegno]),
                } as React.CSSProperties
              }
              className={`absolute max-w-none select-none ${
                p.soloDaTablet ? 'hidden md:block' : 'block'
              }`}
            />
          );
        });
      })}
    </span>
  );
}
