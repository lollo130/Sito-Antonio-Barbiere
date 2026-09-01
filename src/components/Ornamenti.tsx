// Ornamenti del salone: pelle e piante.
//
// Disegnati a mano invece di prendere icone già pronte, perché quello che
// caratterizza la bottega sono due cose precise — le poltrone vintage in
// pelle e le piante verdi — e un'icona generica di sedia non le racconta.
// L'icona della poltrona di Lucide (ISC) è servita da riferimento per le
// proporzioni, il disegno è nuovo.
//
// Restano decorazioni: stanno dietro al testo, non lo coprono mai e non
// portano informazione. Con un pubblico anziano la leggibilità viene prima.

const PELLE_SCURA = '#4e341c';
const PELLE = '#6b4a2b';
const PELLE_CHIARA = '#8a6238';
const VERDE = '#2e5949';
const VERDE_CHIARO = '#3f7360';
const OTTONE = '#9c7b3f';

/** La poltrona del barbiere, in pelle, con le cuciture. */
export function PoltronaInPelle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 210" className={className} aria-hidden="true">
      {/* base */}
      <path d="M62 196h76l-8-16H70z" fill={PELLE_SCURA} />
      <rect x="90" y="150" width="20" height="34" fill={OTTONE} />
      <ellipse cx="100" cy="196" rx="46" ry="7" fill={PELLE_SCURA} opacity="0.35" />

      {/* seduta */}
      <rect x="44" y="126" width="112" height="30" rx="10" fill={PELLE} />
      <rect x="44" y="126" width="112" height="10" rx="5" fill={PELLE_CHIARA} opacity="0.5" />

      {/* braccioli */}
      <rect x="34" y="106" width="18" height="34" rx="9" fill={PELLE_SCURA} />
      <rect x="148" y="106" width="18" height="34" rx="9" fill={PELLE_SCURA} />

      {/* schienale, con la trapuntatura */}
      <rect x="54" y="34" width="92" height="96" rx="18" fill={PELLE} />
      <rect x="54" y="34" width="92" height="96" rx="18" fill="none" stroke={PELLE_SCURA} strokeWidth="2" />
      <g stroke={PELLE_SCURA} strokeWidth="1.4" opacity="0.65">
        <path d="M75 52 125 52M75 78 125 78M75 104 125 104" />
        <path d="M83 44v96M100 44v96M117 44v96" />
      </g>
      <g fill={OTTONE}>
        <circle cx="83" cy="52" r="2.4" />
        <circle cx="100" cy="52" r="2.4" />
        <circle cx="117" cy="52" r="2.4" />
        <circle cx="83" cy="78" r="2.4" />
        <circle cx="100" cy="78" r="2.4" />
        <circle cx="117" cy="78" r="2.4" />
        <circle cx="83" cy="104" r="2.4" />
        <circle cx="100" cy="104" r="2.4" />
        <circle cx="117" cy="104" r="2.4" />
      </g>

      {/* poggiatesta */}
      <rect x="76" y="10" width="48" height="22" rx="10" fill={PELLE_SCURA} />
      <rect x="76" y="10" width="48" height="8" rx="4" fill={PELLE_CHIARA} opacity="0.4" />
    </svg>
  );
}

/** Pianta in vaso: quella che sta in un angolo del salone. */
export function PiantaInVaso({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 210" className={className} aria-hidden="true">
      {/* steli */}
      <g stroke={VERDE} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M70 136C70 110 56 92 38 78M70 136c0-26 14-44 32-58M70 136V44" />
      </g>

      {/* foglie: tonde e piene, tipo pianta da appartamento */}
      <g fill={VERDE}>
        <path d="M38 78c-16-4-26-16-26-30 16-4 30 4 36 18 3 7 0 14-10 12Z" />
        <path d="M70 90C56 82 50 66 54 50c16 4 26 18 24 34-1 7-4 9-8 6Z" fill={VERDE_CHIARO} />
        <path d="M70 44c-10-12-10-28 0-40 10 12 10 28 0 40Z" />
      </g>
      <g fill={VERDE_CHIARO}>
        <path d="M102 78c16-4 26-16 26-30-16-4-30 4-36 18-3 7 0 14 10 12Z" />
        <path d="M70 106c14-8 20-24 16-40-16 4-26 18-24 34 1 7 4 9 8 6Z" fill={VERDE} />
      </g>

      {/* nervature */}
      <g stroke="#1f3e33" strokeWidth="1.1" opacity="0.35" fill="none" strokeLinecap="round">
        <path d="M36 76 16 54M70 88 58 56M104 76l20-22M70 40V10M70 102l10-30" />
      </g>
      {/* vaso in terracotta */}
      <path d="M40 138h60l-8 56a6 6 0 0 1-6 5H54a6 6 0 0 1-6-5z" fill={PELLE} />
      <rect x="36" y="130" width="68" height="14" rx="4" fill={PELLE_CHIARA} />
      <path d="M52 152h36" stroke={PELLE_SCURA} strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

/** Rametto d'ulivo: decorazione discreta per gli angoli delle sezioni. */
export function Rametto({ className = '', rovesciato = false }: { className?: string; rovesciato?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 40"
      className={className}
      aria-hidden="true"
      style={rovesciato ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M4 20h108" stroke={VERDE} strokeWidth="1.6" fill="none" opacity="0.55" />
      <g fill={VERDE} opacity="0.75">
        <ellipse cx="24" cy="13" rx="10" ry="4.5" transform="rotate(-18 24 13)" />
        <ellipse cx="46" cy="12" rx="11" ry="4.8" transform="rotate(-14 46 12)" />
        <ellipse cx="70" cy="13" rx="10" ry="4.5" transform="rotate(-18 70 13)" />
        <ellipse cx="92" cy="15" rx="8" ry="4" transform="rotate(-20 92 15)" />
      </g>
      <g fill={VERDE_CHIARO} opacity="0.7">
        <ellipse cx="34" cy="27" rx="10" ry="4.5" transform="rotate(16 34 27)" />
        <ellipse cx="58" cy="28" rx="11" ry="4.8" transform="rotate(14 58 28)" />
        <ellipse cx="82" cy="27" rx="9" ry="4.2" transform="rotate(18 82 27)" />
      </g>
    </svg>
  );
}

/** Cucitura da tappezzeria: separa le sezioni come la costura di una poltrona. */
export function Cucitura({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 border-t-2 border-dashed border-marrone/45" />
      <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
        <circle cx="8" cy="8" r="3" fill={OTTONE} />
      </svg>
      <span className="h-px flex-1 border-t-2 border-dashed border-marrone/45" />
    </div>
  );
}
