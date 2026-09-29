/**
 * La cookie donde el selector de idioma recuerda la elección del visitante.
 *
 * Sólo la lee el redirect de `/` en `next.config.ts`: quien eligió español
 * vuelve a entrar en español. Un buscador no la trae y siempre recibe el
 * idioma por defecto. No identifica a nadie ni sale del sitio.
 */
export const LANGUAGE_COOKIE = "jonas-orbit-lang";
