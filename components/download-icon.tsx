/**
 * Glifo de descarga compartido: una bandeja y una flecha, en trazo fino.
 *
 * Es el único icono de descarga del sitio —cabecera, Miller y la Ranger lo
 * comparten— para que «CV» se reconozca por su forma en cualquier página.
 * Hereda `currentColor` y se dimensiona en `em` desde el texto que acompaña.
 */
export function DownloadIcon() {
  return (
    <svg className="download-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 2.5v8M4.8 7.6 8 10.8l3.2-3.2M3 13.5h10" />
    </svg>
  );
}
