# Jonás Orbit v3

[![CI](https://github.com/JonasJavier/jonas-orbit-v3/actions/workflows/ci.yml/badge.svg)](https://github.com/JonasJavier/jonas-orbit-v3/actions/workflows/ci.yml)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Node.js 24](https://img.shields.io/badge/Node.js-24-5FA04E?logo=nodedotjs&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)

Portafolio espacial de **Jonás Javier Encarnación**: una experiencia narrativa
que combina producto digital, contenido editorial y una escena WebGL progresiva
sin sacrificar accesibilidad, rutas reales ni HTML útil sin JavaScript.

> **Estado del producto:** desarrollo activo y candidato a producción. Los seis
> destinos y los flujos principales están implementados; cuatro proyectos del
> portafolio están en producción y uno está listo para producción. La publicación
> de Jonás Orbit todavía requiere cerrar dominio, secretos, verificación
> multinavegador, licencias de audio y valoración visual del propietario.

![System Map de Jonás Orbit v3](docs/media/readme/system-map.webp)

_System Map · build de producción · 1440 × 860 · movimiento encendido · captura
del 26 de septiembre de 2026 · valoración visual pendiente._

## La experiencia

La portada funciona como un mapa narrativo. Cada cuerpo representa una parte
del portafolio y abre una ruta propia; la escena 3D es una mejora progresiva, no
el contenido.

| Destino | Significado | Ruta |
| --- | --- | --- |
| Gargantúa | Sobre mí | `/es/sobre-mi` |
| Miller | Formación | `/es/formacion` |
| Endurance | Proyectos | `/es/proyectos` |
| Edmunds | Creatividad | `/es/creatividad` |
| Tesseracto | Experimentos | `/es/experimentos` |
| Ranger | Contacto | `/es/contacto` |

### Qué lo hace distinto

- **Contenido antes que canvas.** Nombre, rol, llamadas a la acción, CV y
  navegación existen en el HTML servido; WebGL nunca es el LCP ni la única vía.
- **Movimiento y sonido controlables.** Dos controles globales con estados
  legibles y una experiencia ligera completa para equipos limitados.
- **Cámara determinista.** La ruta activa define la pose; no hay controles de
  órbita ni navegación acoplada al scroll.
- **Casos de estudio verificables.** Alcance, decisiones, arquitectura,
  tecnologías y resultados provienen del contenido real de cada proyecto.
- **Decisiones trazables.** Plan, contratos visuales y registro explican el
  resultado, sus límites y las validaciones pendientes.

## Arquitectura

```text
Ruta de Next.js
  ├─ HTML semántico y metadata
  ├─ Velite: estructura tipada + prosa MDX
  └─ mejora progresiva
       ├─ interfaz React
       ├─ escena Three.js / WebGL2
       └─ audio y movimiento globales

Build de OpenNext → Cloudflare Workers
```

| Capa | Tecnología |
| --- | --- |
| Aplicación | Next.js 16, React 19, TypeScript 5 |
| Experiencia visual | Three.js, WebGL2, CSS |
| Contenido | Velite como único pipeline MDX |
| Validación | Zod, ESLint, Knip, Vitest, Testing Library |
| Navegador | Playwright, Lighthouse CI, Lychee |
| Runtime | OpenNext sobre Cloudflare Workers |

Las versiones están fijadas en `package.json`. Las actualizaciones de
dependencias se hacen como tareas dedicadas y deben pasar la suite completa.

## Desarrollo local

### Requisitos

- Node.js 24, definido en [`.nvmrc`](.nvmrc)
- npm 11

```bash
npm ci
cp .env.example .env.local
npm run dev
```

En PowerShell, la copia equivalente es:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

En Windows con VBS/HVCI, `workerd` puede fallar al iniciar. El ejemplo de
entorno usa `CF_DEV_CONTEXT=off`; Next.js sigue funcionando y el contacto lee
las variables desde `process.env`.

### Variables de entorno

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Origen de canonical, Open Graph y sitemap |
| `CF_DEV_CONTEXT` | Permite desactivar Miniflare sólo en desarrollo local |
| `CONTACT_RUNTIME_ENV` | `development`, `test` o `production` |
| `CONTACT_DELIVERY_MODE` | `test` evita entregar correo real |
| `TURNSTILE_SITE_KEY` | Clave pública de Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Secreto de Turnstile; nunca se versiona |
| `TURNSTILE_EXPECTED_HOSTNAME` | Host permitido al validar el formulario |
| `RESEND_API_KEY` | Credencial de entrega del formulario |
| `CONTACT_FROM_EMAIL` / `CONTACT_TO_EMAIL` | Remitente verificado y destino |

Consulta [`.env.example`](.env.example) para desarrollo. Los valores reales de
producción viven en GitHub/Cloudflare, nunca en el repositorio.

## Comandos

| Comando | Propósito |
| --- | --- |
| `npm run dev` | Desarrollo local; compila Velite antes de iniciar |
| `npm run content` | Compila y valida el contenido |
| `npm run lint` | ESLint sin warnings |
| `npm run typecheck` | TypeScript sin emitir archivos |
| `npm run knip` | Detecta archivos, exports y dependencias huérfanas |
| `npm run test` | Tests unitarios y de componentes |
| `npm run build` | Build de producción de Next.js |
| `npm run check` | Lint, tipos, Knip, tests y build |
| `npm run test:e2e` | Chromium desktop y móvil; requiere build previo |
| `npm run test:worker` | Rutas prerenderizadas y validación de contacto contra un preview local abierto |
| `npm run preview` | Build y preview local de OpenNext/Cloudflare |
| `npm run deploy` | Build y despliegue a Cloudflare Workers |

Nunca canalices `npm run check` por `head`, `tail` u otra tubería: se perdería
el código de salida real del comando que falle.

## Calidad y producción

El proyecto conserva tres perfiles verificables:

1. HTML semántico y navegación sin JavaScript.
2. Perfil ligero (`?no3d=1`) para auditorías y equipos limitados.
3. Experiencia WebGL completa cuando la persona mantiene los efectos activos.

CI ejecuta lint, tipos, Knip, tests, build de Next/OpenNext, rutas reales del
Worker, Playwright,
Lighthouse y comprobación de enlaces. El deploy sólo puede comenzar después de
que pasen Chromium, Firefox, WebKit, Lighthouse y enlaces.

Antes de publicar, sigue la
[lista de preparación para producción](docs/production-readiness.md) y la
matriz del [Appendix A](docs/plans/jonas-orbit-v3-mission-endurance.md).

Los resultados y límites de la última revisión están en
[`docs/reviews/repository-readiness-2026-09-27.md`](docs/reviews/repository-readiness-2026-09-27.md).

## Estructura del repositorio

```text
app/                rutas, metadata y endpoints
components/         interfaz y escenas por destino
content/            estructura neutral + contenido MDX localizado
lib/                contratos y lógica compartida
e2e/                flujos críticos en navegador
public/             recursos optimizados servidos por la aplicación
assets/             fuentes visuales y procedencia
portfolio-content/  evidencia editorial de los casos de estudio
docs/               planes, decisiones, diseño y revisiones
tools/              captura y medición reproducible de la escena
infra/              infraestructura como código
```

El mapa completo está en [`docs/README.md`](docs/README.md). La fuente de verdad
del alcance es el [plan Misión Endurance](docs/plans/jonas-orbit-v3-mission-endurance.md)
y las decisiones vigentes viven en
[`docs/registro-de-decisiones.md`](docs/registro-de-decisiones.md).

## Colaboración y seguridad

Lee [`CONTRIBUTING.md`](CONTRIBUTING.md) y [`AGENTS.md`](AGENTS.md) antes de
proponer cambios. Reporta vulnerabilidades según [`SECURITY.md`](SECURITY.md),
sin publicar secretos ni detalles explotables.

## Licencia y recursos

Este repositorio no tiene una licencia de código abierto. El código, las
fotografías, el audio y las piezas visuales conservan todos sus derechos hasta
que el propietario publique una licencia explícita. La procedencia de recursos
externos se documenta junto a cada colección.
