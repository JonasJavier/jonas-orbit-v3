<!-- portfolio-content/omsta-2026/cv-notes.md · 2026-09-25 · commit 3f5cea73 -->
# Notas para el CV (ES / EN)

Todo lo de abajo está comprobado en `metrics.md`, `stack.md`, `overview.md` y
`mobile/overview.md`. Lo que **no** está comprobado va a «Preguntas para Jonás»
(`README.md`), no aquí. «En solitario» y el nombre de la agencia están
**confirmados por Jonás** (2026-09-26).

## Español

### Viñetas de logros (OMSTA · web + app móvil)

- Desarrollé en solitario OMSTA, ERP web en producción diaria para Cristecno Viajes SRL (agencia dominicana): reservas, CRM, cobros, contabilidad, nómina y sucursales.
- Automaticé el ciclo venta → cobro → factura con NCF → asientos contables → reportes fiscales DGII (606, 607, 608 y 623).
- Construí la app móvil del equipo con React Native, Expo y TypeScript, y su API REST con JWT por dispositivo: 54 pantallas y 94 endpoints.
- Mantuve un contrato OpenAPI tipado de punta a punta (drf-spectacular → openapi-typescript) con un test que avisa cuando rutas o tipos se desalinean.
- Escribí una suite de 3.164 tests con pytest sobre PostgreSQL y desplegué de forma continua en Railway, con worker Django Q2 y CI en GitHub Actions.

Evidencia: 19 apps/150 modelos y módulos (`metrics.md` §1, `web/modules.md`);
ciclo fiscal (`architecture/data-flow.md`); 54 pantallas y 94 endpoints
(`metrics.md` §1-2); contrato OpenAPI y su test (`mobile/api-contract.md`);
tests y CI (`metrics.md` §3, `stack.md` «CI»). Hoy pasan 3.161 de 3.164 tests:
por eso la viñeta dice «escribí una suite», no «todos pasan».

### Línea de habilidades

Python · Django · Django REST Framework · PostgreSQL · Redis · Django Q2 · JavaScript · HTMX · Bootstrap 5 · Chart.js · React Native · Expo (Expo Router, EAS Build) · TypeScript · TanStack Query · Android · OpenAPI · JWT · pytest · Jest · GitHub Actions · Railway · almacenamiento compatible con S3 (django-storages)

### Estado de la app móvil (una frase)

App móvil en desarrollo: builds internas de Android por EAS, probada en un teléfono real; aún no publicada en tiendas.

## English

### Achievement bullets (OMSTA · web + mobile app)

- Single-handedly built OMSTA, a web ERP in daily production use at Cristecno Viajes SRL (Dominican travel agency): bookings, CRM, payments, accounting, payroll, branches.
- Automated the sale → payment → NCF invoice → journal entries → DGII tax reports (606, 607, 608, 623) cycle.
- Built the team's mobile app with React Native, Expo and TypeScript, plus its REST API with per-device JWT: 54 screens and 94 endpoints.
- Kept an end-to-end typed OpenAPI contract (drf-spectacular → openapi-typescript) with a test that flags when routes or types drift.
- Wrote a 3,164-test pytest suite on PostgreSQL and shipped continuously to Railway, with a Django Q2 worker and GitHub Actions CI.

### Skills line

Python · Django · Django REST Framework · PostgreSQL · Redis · Django Q2 · JavaScript · HTMX · Bootstrap 5 · Chart.js · React Native · Expo (Expo Router, EAS Build) · TypeScript · TanStack Query · Android · OpenAPI · JWT · pytest · Jest · GitHub Actions · Railway · S3-compatible storage (django-storages)

### Mobile app status (one sentence)

Mobile app in development: internal Android builds via EAS, tested on a real device; not yet published to app stores.

## iPhone / iOS — qué puedes afirmar, palabra por palabra

Base: `mobile/overview.md` §5-7. No existe build de iOS, ni TestFlight, ni cuenta
de Apple Developer; no hay ninguna prueba en iPhone ni en simulador.

**Sí puedes escribir (ES):**

- «App multiplataforma con React Native y Expo; probada en Android.»
- «Proyecto configurado para iOS (identificador, permisos de Face ID, cámara y ubicación); la versión para iPhone está pendiente de la cuenta de Apple Developer.»

**Sí puedes escribir (EN):**

- "Cross-platform app built with React Native and Expo; tested on Android."
- "iOS configuration in place (bundle ID, Face ID, camera and location permissions); the iPhone release is pending an Apple Developer account."

**No escribas:** «app para iOS/iPhone», «disponible en App Store/Google Play»,
«TestFlight», «Face ID probado», «iOS y Android» como plataformas soportadas ni
«notificaciones push» (no están terminadas). En la línea de habilidades, **no**
pongas «iOS»: pon «Android» y, si quieres, «React Native (multiplataforma)».
