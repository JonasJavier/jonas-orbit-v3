/**
 * Instrumentos sin estado de la cabina: el visor, el radar y la cinta de
 * rumbo. Son SVG y HTML puros — se sirven desde el servidor, no dependen de
 * JavaScript y sólo el CSS los anima cuando el vuelo está activo.
 */

/**
 * Visor de la cabina. El ventanal ocupa toda la pantalla, así que la nave ya
 * no se dibuja como un marco: se sugiere con cuatro esquinas de retículo al
 * borde del cristal y los reflejos de los instrumentos sobre el vidrio. Es el
 * plano más cercano y el que más se mueve contra la cabeza.
 */
export function RangerVisor() {
  return (
    <div className="ranger-visor" aria-hidden="true">
      <i className="ranger-visor__corner" data-corner="tl" />
      <i className="ranger-visor__corner" data-corner="tr" />
      <i className="ranger-visor__corner" data-corner="bl" />
      <i className="ranger-visor__corner" data-corner="br" />
      <i className="ranger-visor__glass" />
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
