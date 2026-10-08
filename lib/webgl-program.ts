/**
 * Compilar un shader de pantalla completa sin congelar la página.
 *
 * El ventanal de la Ranger y el océano de Miller montan su programa al llegar
 * a la página. Compilado a la manera de siempre —`compileShader` y en seguida
 * `getShaderParameter(COMPILE_STATUS)` / `getProgramParameter(LINK_STATUS)`—
 * el driver termina el trabajo en ese mismo instante, dentro del commit que
 * pinta la página nueva. Medido 2026-10-07 (GPU real, llegada a Contacto
 * desde la home): una tarea de ~380 ms justo al cambiar de página, la mitad
 * esperando al enlace. Con la red lenta y un móvil es el «se queda frisado».
 *
 * Aquí el estado no se lee hasta que el programa está listo:
 * `KHR_parallel_shader_compile` deja compilar en otro hilo y
 * `COMPLETION_STATUS_KHR` se pregunta fotograma a fotograma. Sin la extensión
 * la lectura sólo se aplaza al fotograma siguiente, fuera del commit.
 */

/** Crea y compila, sin leer `COMPILE_STATUS`: el enlace dirá si falló. */
export function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

interface ParallelShaderCompile {
  COMPLETION_STATUS_KHR: number;
}

/**
 * Llama a `done(linked)` cuando el programa (ya pasado por `linkProgram`) ha
 * terminado de enlazar. Devuelve la cancelación, para la limpieza del efecto.
 */
export function whenLinked(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  done: (linked: boolean) => void,
): () => void {
  const parallel = gl.getExtension("KHR_parallel_shader_compile") as ParallelShaderCompile | null;
  let frame = 0;
  const poll = () => {
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
      frame = requestAnimationFrame(poll);
      return;
    }
    frame = 0;
    done(Boolean(gl.getProgramParameter(program, gl.LINK_STATUS)));
  };
  frame = requestAnimationFrame(poll);
  return () => cancelAnimationFrame(frame);
}
