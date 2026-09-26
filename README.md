# Jonás Orbit v3

[![CI](https://github.com/JonasJavier/jonas-orbit-v3/actions/workflows/ci.yml/badge.svg)](https://github.com/JonasJavier/jonas-orbit-v3/actions/workflows/ci.yml)

Portafolio experimental de **Jonás Javier Encarnación**: una interfaz de
navegación espacial que combina contenido editorial, WebGL progresivo y una
arquitectura accesible basada en rutas reales.

> **Estado:** desarrollo activo. La arquitectura y los seis destinos ya están
> implementados, pero la valoración visual, algunas piezas editoriales, las
> licencias de audio y el dominio de producción siguen abiertos. Las capturas y
> métricas publicadas aquí representan el estado actual; no una versión final.

![System Map de Jonás Orbit v3](docs/media/readme/system-map.webp)

_System Map · build de producción · 1440 × 860 · movimiento encendido ·
captura del 26 de septiembre de 2026 · valoración visual pendiente._

## La experiencia

La portada es un mapa narrativo: cada cuerpo tiene una identidad visual y abre
una parte distinta del portafolio. La escena 3D es una mejora progresiva; el
contenido, la navegación y las rutas siguen funcionando sin JavaScript.

| Destino | Contenido | Ruta |
| --- | --- | --- |
| Gargantúa | Sobre mí | `/es/sobre-mi` |
| Miller | Formación | `/es/formacion` |
| Endurance | Proyectos | `/es/proyectos` |
| Edmunds | Creatividad | `/es/creatividad` |
| Tesseracto | Experimentos | `/es/experimentos` |
| Ranger | Contacto | `/es/contacto` |

## Principios técnicos

- **Contenido antes que canvas.** El HTML servido contiene la información y
  los enlaces esenciales; WebGL nunca es el contenido ni el candidato a LCP.
- **Movimiento y sonido bajo control.** Dos controles globales, estados
  legibles y una experiencia reducida completa para equipos limitados.
- **Identidad por dominio.** `WorldId` une estructura y prosa; los slugs no son
  claves de negocio y el texto visible vive en MDX.
- **Calidad verificable.** TypeScript estricto, ESLint sin warnings, Knip,
  Vitest, Playwright, Lighthouse CI y comprobación de enlaces.
- **Decisiones trazables.** El plan, los contratos visuales y el registro de
  decisiones explican tanto el resultado como las restricciones que lo forman.

## Stack

- Next.js 16 y React 19
- TypeScript 5
- Three.js y WebGL2
- Velite como único pipeline MDX
- Vitest, Testing Library y Playwright
- OpenNext sobre Cloudflare Workers

Todas las versiones están fijadas en `package.json`; las actualizaciones de
dependencias se hacen como tareas dedicadas y pasan la suite completa.

## Desarrollo local

### Requisitos

- Node.js 24 (ver `.nvmrc`)
- npm

```bash
npm ci
cp .env.example .env.local
npm run dev
```

En Windows con VBS/HVCI, `workerd` puede fallar al iniciar. El ejemplo de
entorno usa `CF_DEV_CONTEXT=off`; Next.js se ejecuta normalmente y el contacto
lee las variables desde `process.env`.

### Comandos

| Comando | Propósito |
| --- | --- |
| `npm run dev` | Desarrollo local; compila Velite antes de iniciar |
| `npm run content` | Compila y valida el contenido |
| `npm run test` | Suite unitaria y de componentes |
| `npm run test:e2e` | E2E en Chromium desktop y móvil; requiere build previo |
| `npm run check` | Lint, tipos, código muerto, tests y build de producción |
| `npm run preview` | Build y preview local de OpenNext/Cloudflare |

## Arquitectura del repositorio

```text
app/          rutas, metadatos y endpoints
components/   interfaz, escenas y módulos por destino
content/      datos estructurales y contenido MDX
lib/          contratos y lógica compartida
e2e/          pruebas de navegación y flujos críticos
public/       recursos servidos por la aplicación
docs/         planes, decisiones, diseño y revisiones
tools/        captura y medición reproducible de la escena
infra/        infraestructura como código
```

El mapa completo de documentación está en [`docs/README.md`](docs/README.md).
La fuente de verdad del alcance y los criterios de cierre es el
[`plan Misión Endurance`](docs/plans/jonas-orbit-v3-mission-endurance.md); las
decisiones vigentes y sus trampas de medición están en
[`docs/registro-de-decisiones.md`](docs/registro-de-decisiones.md).

## Calidad y rendimiento

Cada cambio debe conservar tres perfiles distintos:

1. HTML semántico y navegación sin JavaScript.
2. Perfil ligero (`?no3d=1`) para auditorías y equipos limitados.
3. Experiencia WebGL completa cuando el usuario mantiene los efectos activos.

CI ejecuta lint, typecheck, detección de código huérfano, tests, build,
Playwright, Lighthouse y revisión de enlaces. Los presupuestos y la metodología
están documentados en [`lighthouserc.json`](lighthouserc.json) y en el
[`Appendix A del plan`](docs/plans/jonas-orbit-v3-mission-endurance.md).

## Colaboración y seguridad

Antes de proponer cambios, lee [`CONTRIBUTING.md`](CONTRIBUTING.md) y
[`AGENTS.md`](AGENTS.md). Los problemas de seguridad se reportan siguiendo
[`SECURITY.md`](SECURITY.md), sin publicar secretos ni detalles explotables.

## Licencia y recursos

Este repositorio **no tiene todavía una licencia de código abierto**. El código,
las fotografías, el audio y las piezas visuales conservan todos sus derechos
hasta que el propietario publique una licencia explícita. La procedencia de los
recursos externos se documenta junto a cada colección.
