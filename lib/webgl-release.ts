/**
 * Suelta el contexto WebGL de un canvas que React gestiona, pero sólo cuando
 * el canvas ha salido de verdad del documento.
 *
 * Un efecto se limpia y se vuelve a montar sobre el MISMO canvas más veces de
 * lo que parece: el doble montaje de StrictMode en desarrollo, Fast Refresh y
 * cualquier cambio de dependencias que no retira el `<canvas>`. Si la limpieza
 * pierde el contexto a la vista, el montaje siguiente pide `getContext` a ese
 * canvas, recibe el contexto perdido y su `webglcontextlost` apaga la pieza
 * para siempre: la Ranger llegaba «Detenida» al entrar navegando y sólo volaba
 * tras recargar. Esperar una tarea deja que el montaje siguiente reutilice el
 * contexto vivo; si el canvas ya no está, se libera como antes, para no ocupar
 * uno de los pocos contextos que el navegador concede por pestaña.
 */
export function releaseWhenDetached(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  window.setTimeout(() => {
    if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
  }, 0);
}
