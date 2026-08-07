<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Jonás Orbit v3 — reglas del repositorio

**Fuente de verdad:** `docs/plans/jonas-orbit-v3-mission-endurance.md` (plan
aprobado con eng review CLEAR). No abras decisiones arquitectónicas nuevas sin
pasar por ese documento. La matriz de tests vive en su Appendix A.

**Pivote vigente (2026-08-06):** `docs/plans/sistema-gargantua.md` manda sobre el
plan principal en **arquitectura de rutas, contrato de cámara, capa visual,
transiciones y presupuestos**. En todo lo demás el plan principal sigue intacto.
Ante contradicción entre ambos, manda el pivote.

## Comandos

- `npm run check` — lint + typecheck + knip + test + build (lo que corre CI).
- `npm run test:e2e` — Playwright; requiere `npm run build` previo.
- `npm run content` — compila el contenido (Velite). Los scripts `pre*` ya lo
  corren antes de dev/build/typecheck/test.

**Nunca canalices `npm run check` por una tubería** (`| tail`, `| head`): el
código de salida pasa a ser el del último comando de la tubería y un build roto
se lee como verde. Redirige a un archivo y consulta `$?`.

## Entorno de desarrollo

- Node fijado en `.nvmrc` (24); CI usa 24. Node 26 también funciona.
- `.env.local` (ignorado por git) lleva los ajustes de máquina. Si `workerd`
  no arranca en tu equipo — Windows con VBS/HVCI aborta con *access violation* —
  usa `CF_DEV_CONTEXT=off`: `next.config.ts` se salta Miniflare y
  `readContactBindings()` cae a `process.env`. El runtime real de Cloudflare se
  sigue verificando en CI y en el deploy.

## Reglas no negociables (vienen del plan)

1. **Un solo pipeline MDX: Velite.** Prohibido añadir otro procesador MDX sin
   retirar este (plan B documentado: gray-matter + Zod + next-mdx-remote — uno
   u otro, nunca ambos).
2. **Versiones fijadas.** `package.json` sin `^`/`~`. Actualizar dependencias
   solo en tarea dedicada, tras pasar la suite completa. Los `overrides` de
   postcss/sharp existen por avisos de npm audit sobre deps transitivas de
   Next — revisar si siguen haciendo falta al subir Next.
3. **Cero huérfanos.** Knip corre en CI: nada de deps sin uso, exports sin
   consumidor ni componentes experimentales sueltos. `tailwindcss` está en
   `ignoreDependencies` porque se usa vía `@import "tailwindcss"` en CSS, que
   Knip no sigue.
4. **Identidad canónica `WorldId`.** La unión estructura↔prosa usa el id, nunca
   el slug de URL. Texto visible al usuario JAMÁS en `content/worlds.data.ts`.
5. **Sin sniffing del auditor.** Prohibido código cuya única función sea
   alterar una auditoría (Lighthouse se audita vía `?no3d=1` explícito, que es
   el mismo mecanismo del botón "Reducir efectos").
6. **La cámara no tiene controlador.** *(Sustituye a la regla anterior «scroll =
   fuente de verdad de la cámara», retirada por el pivote.)* La pose es una
   función pura de la ruta activa: `cameraPose = f(routeWorldId)`. Prohibidos
   `OrbitControls`, drag, rueda y cualquier acoplamiento al scroll. Único input
   continuo permitido: paralaje aditivo ≤ 2° desde puntero/giroscopio, apagado
   con reduced-motion. Las transiciones son guionadas, interrumpibles y con
   timeout duro: **la animación nunca es dueña del router**.
7. **La escena nunca es el contenido.** El HTML servido de cada ruta contiene el
   texto real sin JavaScript — en `/es`: nombre, rol, dos CTAs, CV y siete
   enlaces `<a href>` a los mundos. El canvas es `aria-hidden`, va detrás y
   nunca es candidato a LCP. Un reclutador con red lenta, un lector de pantalla
   y Googlebot ven lo mismo.
8. **Contenido honesto.** Sin lorem ipsum, sin métricas inventadas, sin
   placeholders disfrazados. Las fichas breves son un formato completo.
9. **Middleware:** no existe en F1 (redirect estático `/` → `/es` en
   `next.config.ts`). En F2A llega como `proxy.ts` (así se llama en Next 16).

## Referencias de v2

`docs/reference/v2/` conserva código de la versión anterior SOLO como
referencia (excluido de tsconfig y Knip): `universe.ts` (copy ya migrado a
`content/es/worlds/` corrigiendo Marketing Digital a carrera terminada),
`use-reduced-motion.ts`, `use-device-capability.ts`, `performance.ts` (base
para el gate de capacidad de F2B — adaptar al puerto nuevo cuando se
implemente, no importar directo). El `app/api/contact` de v2 estaba vacío: el
Worker de contacto de F1A se construye desde cero según la spec del plan.

## Al terminar una feature

Ninguna feature se considera completa sin sus tests del Appendix A
implementados y estables. Antes de cerrar una fase: revisión de bundle y
eliminación de experimentos sueltos.
