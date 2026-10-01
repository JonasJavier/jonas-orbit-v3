/**
 * El cielo del blog: fondo propio, fijo y opaco, sin WebGL.
 *
 * Una página para leer no puede tener Gargantúa detrás: la escena persistente
 * duerme en estas rutas (`gargantua-system.tsx`) y su último fotograma queda
 * tapado por este cielo. Es espacio profundo y nada más —dos capas del campo
 * estelar de Edmunds a escalas distintas, nebulosas lejanas muy veladas y una
 * órbita— para que diga «universo» sin competir con el texto.
 */
export function BlogSky() {
  return (
    <div className="blog-sky" aria-hidden="true">
      <span className="blog-sky__nebula" />
      <span className="blog-sky__stars blog-sky__stars--far" />
      <span className="blog-sky__stars blog-sky__stars--near" />
      <svg className="blog-sky__orbit" viewBox="0 0 1000 1000" fill="none" focusable="false">
        <ellipse cx="500" cy="500" rx="480" ry="190" transform="rotate(-18 500 500)" />
        <ellipse cx="500" cy="500" rx="360" ry="130" transform="rotate(-18 500 500)" strokeDasharray="2 10" />
        <circle cx="866" cy="281" r="3.5" />
      </svg>
    </div>
  );
}
