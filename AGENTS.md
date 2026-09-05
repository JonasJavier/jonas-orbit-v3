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

**Dirección artística del hero (2026-08-29):**
`docs/design/hero-gargantua-direction.md` manda sobre los dos anteriores en
**composición del hero, identidad visible, diseño de los mundos, HUD, interacción,
escala de Gargantúa, posiciones de los cuerpos, motion en reposo, trayectorias,
etiquetas y estados**. Sus cambios centrales: **el sistema está quieto** — los
cuerpos no recorren su órbita — y el Hero **no muestra un bloque personal**. La
identidad profesional, rol, CTAs y CV siguen en el HTML semántico y metadata; la
marca visible del HUD es `JONAS ORBIT`. Cualquier texto anterior que describa
cuerpos orbitando continuamente, Endurance como toro o el
copy personal como bloque visible está obsoleto. El viaje continuo y
`SYSTEM MAP ↑` siguen diferidos en `docs/design/continuous-journey-phase.md`.

**Lenguaje visual de los mundos (2026-09-03):**
`docs/design/world-visual-language.md` manda sobre los tres anteriores en
**material, iluminación y criterio de aceptación de los cinco cuerpos secundarios**. No toca
composición, cámara, HUD ni interacción, que siguen perteneciendo a la dirección
artística del hero. Congela el modelo de luz común —la misma luz toca materiales
diferentes— y define el bloom-off test: un cuerpo que pierde su identidad al
apagar el glow no está terminado. Gargantúa queda **congelada** durante la fase.
El `Rediseño imposible` del Tesseracto conserva su geometría y material.

**Revisión de Edmunds (2026-09-05):** la sección `Mundo habitable` de
`docs/design/world-visual-language.md` sustituye su material y su paleta por
petición del dueño: mundo terrestre cálido con jerarquía de tres escalas, nubes
y atmósfera fina, distinto de Miller. Posición, tamaño, órbita y el resto de los
cuerpos siguen intactos. Cuatro sitios de FBM, uno menos que antes.

**Revisión de Miller (2026-09-05):** la sección `Océano global` de
`docs/design/world-visual-language.md` sustituye su material, su paleta, su
modelo de reflejo y su atmósfera por petición del dueño: océano continuo azul
grisáceo, lámina de luz anisótropa en vez de foco isótropo, y filo de aire
direccional hacia Gargantúa. Posición, tamaño, órbita, inclinación, cámara y el
resto de los cuerpos siguen intactos. Tres sitios de FBM, los mismos que antes.

**Revisión del Tesseracto (2026-09-05):** la sección `Umbral vivo` de
`docs/design/world-visual-language.md` sustituye sus límites anteriores de
deriva mínima y acabado por petición del dueño. Tres grupos interiores se
reconfiguran de forma perceptible; cáscara, posición, tamaño y cámara siguen
fijos. El Tesseracto usa cuatro draws con un material compartido.

**Pase de autoridad de Gargantúa (2026-09-05):** la sección `14 quáter` de
`docs/design/hero-gargantua-direction.md` sustituye la escala de los cinco
destinos secundarios por petición del dueño — Endurance −10 %, Miller y Edmunds
−8 %, Tesseracto −5.6 %, Ranger −3.5 %. Gargantúa no se toca. Posición, fase,
inclinación, cámara, material y HUD siguen intactos.

**Pase de respiración (2026-09-05):** la sección `14 quinquies` de
`docs/design/hero-gargantua-direction.md` mueve Miller (26/242/31 → 28/240/37) y
el Tesseracto (30/298/26 → 32/300/30) para despegarlos del arco brillante de
Gargantúa. No cambia tamaño, cámara ni los otros tres cuerpos. Sustituye radio,
fase e inclinación de esos dos en `docs/design/sistema-seis-destinos.md`.

**Pase de puntero (2026-09-05):** las secciones `11 bis` y `11 ter` de
`docs/design/hero-gargantua-direction.md` sustituyen la figura del retículo y la
presencia del stardust en WebGL por petición del dueño. El retículo pasa de cruz
de cuatro trazos a anillo + núcleo + marcas laterales, con `target` abriendo el
anillo en arcos que barren. El stardust de WebGL sube alfa, capacidad, ráfaga,
tamaño y vida, y alarga la curva de apagado. No cambian el ámbito de la capa
—desktop fine-pointer dentro del System Map—, los cuatro estados, ni el perfil
`flat`, que sigue congelado. Un segundo pase (mismo día) alarga la permanencia
—exponente de apagado a 1,2— y añade un **segundo calibre**: motas finas con
sprite propio sembradas encima de las de cuerpo, no en su lugar.

**Decisión del dueño (2026-09-04):** `docs/design/sistema-seis-destinos.md`
manda sobre los documentos anteriores en catálogo y recomposición: seis destinos
(Tesseracto, Miller, Endurance, Edmunds, Gargantúa, Ranger), sin Cooper Station
ni su ruta de Formación. No se reasigna contenido. La composición nueva necesita
revisión visual del dueño; se conserva el contrato de cámara y Gargantúa.

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
   texto real sin JavaScript — en `/es`: nombre, rol, dos CTAs, CV y seis
   enlaces `<a href>` a los mundos. Nombre, rol, CTAs y CV forman el fallback
   semántico, pero **no** un bloque personal visible dentro del Hero; el raíl sí
   presenta los destinos. El canvas es `aria-hidden`, va detrás y nunca es
   candidato a LCP. Un reclutador con red lenta, un lector de pantalla y
   Googlebot conservan el mismo significado y las mismas rutas.
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
