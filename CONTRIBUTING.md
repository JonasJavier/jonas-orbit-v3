# Contribuir a Jonás Orbit v3

Jonás Orbit es un portafolio personal en desarrollo activo. Las contribuciones
son bienvenidas cuando respetan la dirección narrativa, la autoría del contenido
y los presupuestos de accesibilidad y rendimiento.

## Antes de empezar

1. Lee `AGENTS.md` y el índice de `docs/README.md`.
2. Consulta el plan y la decisión vigente del dominio que vas a tocar.
3. Para cambios amplios, abre primero una propuesta que describa el problema,
   no solo la solución deseada.
4. No inventes contenido, métricas, enlaces de producción ni licencias.

## Preparar el entorno

```bash
npm ci
cp .env.example .env.local
npm run dev
```

El proyecto usa Node 24 y versiones exactas. No actualices dependencias dentro
de una feature; hazlo en una tarea separada y verifica la suite completa.

## Flujo de cambios

- Crea una rama corta y descriptiva desde `main`.
- Mantén los commits enfocados y evita incluir capturas, logs o builds locales.
- Añade o actualiza los tests del Appendix A que correspondan al cambio.
- Si cambia una decisión del producto, registra primero la decisión en
  `docs/registro-de-decisiones.md` y actualiza el índice de `AGENTS.md`.
- Para cambios visuales, adjunta evidencia desktop y móvil e indica el estado
  del interruptor de movimiento. Las capturas de trabajo viven fuera de Git.

## Verificación

Antes de abrir un pull request:

```bash
npm run check
npm run test:e2e
```

`npm run test:e2e` requiere un `npm run build` previo. No canalices
`npm run check` mediante `head`, `tail` u otra tubería: se perdería su código de
salida real.

## Pull requests

Un PR debe explicar el resultado, el alcance, los riesgos y cómo se verificó.
Cuando haya interfaz visible, incluye capturas comparables y señala cualquier
valoración del propietario que siga pendiente. No presentes una decisión visual
pendiente como aprobada.

## Contenido y recursos

- La prosa visible vive en MDX, no en `content/worlds.data.ts`.
- Fotografías, audio, tipografías y referencias externas necesitan procedencia
  y licencia documentadas.
- Nunca incluyas secretos, datos personales innecesarios ni credenciales de
  sesiones de captura.
