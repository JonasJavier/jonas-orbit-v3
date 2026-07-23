# Experimento diferido: navegación adaptativa por intención

## Estado

DEFERRED — no aprobado para implementación.

## Idea original

Permitir que el visitante indique una intención principal:

- Contratarme.
- Necesito un proyecto.
- Explorar.

La intención podría personalizar CTAs, accesos sugeridos y énfasis visual sin cambiar el orden narrativo de los mundos ni la trayectoria de la cámara.

## Por qué se retiró del alcance actual

La función fue eliminada de F1A/F1B porque:

- Añadía una interacción adicional al hero.
- Competía con la regla de acceso rápido de 30 segundos.
- Requería query params, persistencia, estado y tests adicionales.
- La herramienta de analytics seleccionada no permite medir su efecto.
- No existía una hipótesis verificable que justificara su complejidad.
- Los beneficios podían obtenerse inicialmente mediante dos CTAs directos:
  - "Ver proyectos".
  - "Trabajemos juntos".
- El CV descargable cubre de manera más directa el objetivo de empleo.

## Condiciones obligatorias para reconsiderarlo

Este experimento solo puede volver a evaluarse cuando se cumplan TODAS estas condiciones:

1. F2 está completa, desplegada y estable.
2. Existe una hipótesis concreta y falsable.

   Ejemplo:
   "Permitir que los visitantes seleccionen su intención incrementará en al menos X % la llegada al caso de estudio o CTA relevante frente al hero estándar".

3. Existe analytics con eventos personalizados, como Umami o Plausible, capaz de medir:
   - Selección de intención.
   - Clics posteriores.
   - Llegada a proyectos.
   - Llegada a contacto.
   - Descarga del CV.
   - Conversión por variante.

4. Se define una métrica principal y un periodo de evaluación antes de implementar.

5. La función no añade contenido obligatorio, no cambia el orden de los mundos y no crea tres coreografías o trayectorias diferentes.

6. No perjudica:
   - Accesibilidad.
   - Rendimiento.
   - LCP.
   - CLS.
   - Navegación por teclado.
   - Reduced motion.
   - Acceso rápido a proyectos y contacto.

7. Se compara mediante un experimento controlado contra el hero estándar.

## Límites de implementación si se retoma

- La secuencia narrativa seguirá siendo única.
- La cámara tendrá una sola trayectoria.
- No se reordenará el DOM.
- La personalización se limitará a CTAs, sugerencias y énfasis visual.
- La variante predeterminada seguirá funcionando sin seleccionar intención.
- Debe existir una forma de omitir la selección.
- La feature debe poder eliminarse sin modificar el modelo de contenido ni la arquitectura de escenas.

## Criterio de éxito

Solo se conservará si produce una mejora medible en conversiones o navegación relevante sin degradar rendimiento, accesibilidad o claridad.

Si no demuestra valor durante el periodo de prueba, debe eliminarse completamente.

## Dependencias

- F2 completa.
- Umami, Plausible u otra herramienta con eventos personalizados.
- Hipótesis y métricas aprobadas.
- Nueva aprobación explícita de alcance.

## Prioridad

PARKED / EXPERIMENTAL.

No forma parte del roadmap comprometido y no debe aparecer como trabajo pendiente necesario para considerar terminado el portafolio.

(Al crear el repositorio nuevo en el paso 10 de Next Steps, mover este archivo a `docs/experiments/intention-adaptive-navigation.md` del repo.)
