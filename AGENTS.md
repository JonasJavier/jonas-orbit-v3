<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Jonás Orbit v3 — reglas del repositorio

**Fuente de verdad:** `docs/plans/jonas-orbit-v3-mission-endurance.md` (plan
aprobado con eng review CLEAR). No abras decisiones arquitectónicas nuevas sin
pasar por ese documento. La matriz de tests vive en su Appendix A.

## Comandos

- `npm run check` — lint + typecheck + knip + test + build (lo que corre CI).
- `npm run test:e2e` — Playwright; requiere `npm run build` previo.
- `npm run content` — compila el contenido (Velite). Los scripts `pre*` ya lo
  corren antes de dev/build/typecheck/test.

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
6. **Scroll = única fuente de verdad de la cámara.** Clic en planeta desplaza
   el documento; la cámara reacciona al progreso. Nunca dos controladores.
7. **Contenido honesto.** Sin lorem ipsum, sin métricas inventadas, sin
   placeholders disfrazados. Las fichas breves son un formato completo.
8. **Middleware:** no existe en F1 (redirect estático `/` → `/es` en
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
