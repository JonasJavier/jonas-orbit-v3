<!-- portfolio-content/omsta/demo/demo-data.md -->

# Entorno de demostración y datos utilizados

> **Fecha de ejecución:** 2026-07-21
> **Repositorio:** `CristecnoViajes_SRL` (producto: **OMSTA**)
> **Commit analizado (HEAD):** `da5a86b3` en rama `main`
> **Entorno:** desarrollo local (Windows 11 + PowerShell). **No es producción.**

Este documento registra, con honestidad y trazabilidad, cómo se levantó el
entorno, qué datos se usaron y qué se modificó. Es material interno del paquete,
no contenido publicable.

---

## 1. Cómo se levantó la aplicación

OMSTA es un monolito Django que en desarrollo depende de PostgreSQL y,
opcionalmente, de Redis. Los pasos reales fueron:

1. **PostgreSQL** ya estaba corriendo como servicio de Windows
   (`postgresql-x64-16` y `-18`), puerto `5432`. Base de datos: `cristecno_db`.
2. **Redis** se levantó con el contenedor documentado del proyecto
   (`docker start cristecno-redis`, puerto `6379`). Mientras Docker no estuvo
   disponible, se usó el fallback nativo del sistema con `USE_REDIS_CACHE=False`
   (cache en memoria + sesiones en BD), previsto por el propio `settings.py`.
3. **Entorno virtual:** `env/` del repo (Python **3.12.10**, Django **5.2.6**).
   Se invocó el intérprete por ruta absoluta con `PYTHONPATH` apuntando a la raíz
   del repo, sin activar el venv (para no depender del estado de la shell).
4. **Verificación:** `python manage.py check` → *System check identified no
   issues (0 silenced)*.
5. **Servidor:** `python manage.py runserver 127.0.0.1:8000 --noreload`.

La base de datos ya estaba **migrada y sembrada** por sesiones previas de QA;
no fue necesario ejecutar `migrate`, `seed_catalogs` ni `ledger_bootstrap` para
esta tarea. El sistema quedó accesible en `http://127.0.0.1:8000/`.

> No se ejecutó el worker `qcluster` (no era necesario para navegar/capturar).
> Los procesos en segundo plano (exportaciones) no se dispararon a propósito.

## 2. Estado de los datos de desarrollo (inventario observado)

Conteos reales en `cristecno_db` (script de solo lectura, 2026-07-21):

| Entidad | Cantidad |
|---|---:|
| Usuarios | 39 (5 superusuarios, resto staff/QA/tutorial) |
| Reservas | 19 |
| Pagos | 12 |
| Suplidores | 5 |
| Hoteles | 8 |
| Clientes (CRM) | 12 |
| Empresas (CRM) | 3 |
| Sucursales | 5 |
| Departamentos | 6 |
| Facturas | 1 |
| Asientos de diario (Journal) | 20 |
| Empleados (nómina) | 2 |
| Monedas | 5 · Tasas de cambio | 9 |

Los datos son **sintéticos** (cuentas y registros etiquetados como `QA`,
`Tutorial`, `Codex`, `Demo`; teléfonos `809-555-xxxx` / `809-000-xxxx`; correos
`@example.test` / `@example.com`). Autorizados para esta tarea.

## 3. Registros creados por esta tarea

| Registro | Motivo | Valor |
|---|---|---|
| Superusuario `demo_portafolio` | Autenticarse para navegar y capturar sin usar cuentas ajenas | rol `superadmin`, `is_superuser=True`, correo `demo.portafolio@example.test` |
| Seed de nómina (`python manage.py seed_nomina_demo`, 2026-07-22) | Poblar el módulo de nómina para capturas con contenido (estaba con 0 períodos) | Comando **oficial e idempotente** del repo: creó 8 empleados demo (`nomina_demo_01..08`, correos `@demo.local`) y 3 períodos (`PER-DEMO-M0/M1/MP`, jun–ago 2026) con 30 entradas |

- El usuario es un **superusuario**: `is_superuser=True` otorga todos los roles
  (verificado en `security/access_policy.py`), por lo que ve todos los módulos y
  el `ModuleRoleAccessMiddleware` no lo bloquea.
- Es la única cuenta creada. Puede eliminarse tras las capturas sin afectar nada.
- La contraseña es un valor local de desarrollo, **no es un secreto del sistema**
  ni credencial de producción; no se publica en ningún material del caso.

## 4. Registros modificados por esta tarea (anonimización — Gate 0)

El escaneo de PII detectó tres valores potencialmente reales. Se neutralizaron a
valores claramente ficticios **en la base de desarrollo**, conforme a las reglas
de privacidad del plan ("datos ficticios / anonimización"). Esto protege tanto
las capturas como la demo en vivo.

| Registro | Campo | Antes (real/sensible) | Después (ficticio) |
|---|---|---|---|
| `CompanySettings` (id 1) | RNC | *(RNC real de 9 dígitos)* | `131999999` |
| `CompanySettings` (id 1) | teléfono | *(teléfono real)* | `+1 (809) 555-0100` |
| `CompanySettings` (id 1) | email | *(correo corporativo real)* | `reservas@cristecnoviajes.demo` |
| `CompanySettings` (id 1) | nombre | `Cristegno Viajes` | `Cristecno Viajes` |
| `Cliente` (id 2) | nombre/cédula | `Brayan Jose Nunez Javier` | `Luis Demo Portafolio`, cédula `000-0000000-0` |
| Usuario `jara` | email | `jara@hotmail.com` | `jara@example.test` |

Las empresas CRM restantes ya tenían RNC/nombres ficticios (`131999991`,
`TUTORIALRNC001`, `131000001`). Ningún cambio afectó lógica ni esquema.

## 5. Recorrido funcional realizado

Se recorrieron sistemáticamente (login → módulo → listado → detalle → formulario)
los módulos: Dashboard, Reservas (listado, detalle #63, alta de reserva de hotel,
productos), CRM (entidades y detalle), Contabilidad (Caja & Pagos, Cuentas por
Cobrar, Cuentas por Pagar, Notas AR/AP, pago por reserva, entrada de diario),
Ledger (libro diario), COA (plan de cuentas), Banco, Nómina, Divisas, Sucursales,
Documentos, Reportes, Usuarios/Roles, Auditoría de actividad, Tutoriales y
Configuración. Vista móvil (390×844) en Dashboard, Reservas y Cuentas por Cobrar.

## 6. Problemas encontrados y soluciones

| Problema | Solución |
|---|---|
| `USE_REDIS_CACHE=True` con Docker/Redis abajo al inicio | Fallback `USE_REDIS_CACHE=False` (LocMemCache + sesiones DB) hasta levantar `cristecno-redis`. Sin cambios de código. |
| Ruta `/operaciones/` devuelve 404 | El índice real es `/operaciones/feed/` (fragmento HTMX del *tray* de operaciones, no una página completa). Se excluyó de la selección principal. |
| Captura de pantalla del navegador embebido no compone frames sin panel visible | Se automatizó la captura con **Playwright** (permitido por el enunciado), garantizando 1440×900 consistentes. |

## 7. Limpieza

- El usuario `demo_portafolio` puede eliminarse cuando ya no se necesite.
- Las anonimizaciones de la sección 4 son mejoras de privacidad; se recomienda
  **conservarlas** (no revertir a los valores reales) en la base de desarrollo.
- El servidor `runserver` y el contenedor `cristecno-redis` pueden detenerse.

## 8. Reglas de seguridad respetadas

- No se leyeron ni expusieron secretos de `.env` (solo banderas no sensibles:
  `USE_POSTGRES`, `USE_REDIS_CACHE`, `DEBUG`, etc.).
- No se tocó producción ni se ejecutaron operaciones destructivas.
- No se cambió esquema ni se corrieron migraciones para embellecer capturas.
