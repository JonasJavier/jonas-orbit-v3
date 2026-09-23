/**
 * Instrumentos sin estado de la cabina: el visor y el radar. Son SVG y HTML
 * puros — se sirven desde el servidor, no dependen de JavaScript y sólo el CSS
 * los anima cuando el movimiento está encendido.
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
