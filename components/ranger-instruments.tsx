/**
 * Instrumentos sin estado de la cabina: el marco del ventanal, el radar y la
 * cinta de rumbo. Son SVG y HTML puros — se sirven desde el servidor, no
 * dependen de JavaScript y sólo el CSS los anima cuando el vuelo está activo.
 */

/**
 * Marco del ventanal. Dos siluetas, una por orientación, dibujadas con
 * `preserveAspectRatio="none"` para que el cristal siempre llene la cabina;
 * los trazos usan `non-scaling-stroke` y no se deforman con el estirado.
 */
export function RangerCanopy() {
  return (
    <div className="ranger-canopy" aria-hidden="true">
      <svg className="ranger-canopy__frame ranger-canopy__frame--wide" viewBox="0 0 1440 900" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="ranger-hull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0d111b" />
            <stop offset="1" stopColor="#04060b" />
          </linearGradient>
          <linearGradient id="ranger-edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7fe5ff" stopOpacity=".55" />
            <stop offset=".5" stopColor="#ffd08a" stopOpacity=".7" />
            <stop offset="1" stopColor="#ffb65c" stopOpacity=".9" />
          </linearGradient>
        </defs>
        <path className="ranger-canopy__hull" fillRule="evenodd" d="M0 0H1440V900H0Z M120 210C120 128 156 84 236 84H1204C1284 84 1320 128 1320 210L1404 900H36Z" />
        <path className="ranger-canopy__bevel" d="M36 900L120 210C120 128 156 84 236 84H1204C1284 84 1320 128 1320 210L1404 900" />
        <path className="ranger-canopy__edge" d="M36 900L120 210C120 128 156 84 236 84H1204C1284 84 1320 128 1320 210L1404 900" />
        <path className="ranger-canopy__strut" d="M896 84H924L1002 900H968Z" />
        <path className="ranger-canopy__strut-edge" d="M924 84L1002 900" />
      </svg>
      <svg className="ranger-canopy__frame ranger-canopy__frame--tall" viewBox="0 0 400 700" preserveAspectRatio="none" focusable="false">
        <path className="ranger-canopy__hull" fillRule="evenodd" d="M0 0H400V700H0Z M28 150C28 102 48 80 96 80H304C352 80 372 102 372 150L400 700H0Z" />
        <path className="ranger-canopy__bevel" d="M0 700L28 150C28 102 48 80 96 80H304C352 80 372 102 372 150L400 700" />
        <path className="ranger-canopy__edge" d="M0 700L28 150C28 102 48 80 96 80H304C352 80 372 102 372 150L400 700" />
      </svg>
      <i className="ranger-canopy__glass" />
    </div>
  );
}

/** Radar de corto alcance. Dos ecos; el barrido sólo gira con el vuelo activo. */
export function RangerScope() {
  return (
    <div className="ranger-scope" aria-hidden="true">
      <i className="ranger-scope__sweep" />
      <i className="ranger-scope__blip" style={{ "--bx": "66%", "--by": "38%", "--bd": "0.9s" } as React.CSSProperties} />
      <i className="ranger-scope__blip" style={{ "--bx": "36%", "--by": "64%", "--bd": "3.2s" } as React.CSSProperties} />
    </div>
  );
}

/**
 * Cinta de rumbo bajo el cristal. El número es la fase orbital de la Ranger en
 * el System Map (`placement.phase`): la nave apunta a donde está en el mapa.
 */
export function RangerTape({ heading }: { heading: number }) {
  const marks = [-20, -10, 0, 10, 20].map((offset) => ({ offset, value: String((heading + offset + 360) % 360).padStart(3, "0") }));
  return (
    <div className="ranger-tape" aria-hidden="true">
      <div className="ranger-tape__scale">
        {marks.map((mark) => <span key={mark.offset} style={{ left: `calc(50% + ${mark.offset * 13}px)` }}>{mark.value}</span>)}
      </div>
      <i className="ranger-tape__caret" />
      <span className="ranger-tape__reading">Rumbo {String(heading).padStart(3, "0")}</span>
    </div>
  );
}
