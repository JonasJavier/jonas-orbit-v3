# Ranger — cabina de comunicaciones

Petición del dueño · 2026-09-12. Implementación de `/es/contacto`.

## Dirección

La última parada del portafolio es una cabina abierta al universo: un ventanal,
una nave de enlace sobre un horizonte planetario y tres frecuencias de contacto.
El gesto principal sigue siendo escribir. La imagen pone la escala y la
atmósfera; la instrumentación se reduce a una baliza y un receptor.

El hero ocupa la primera pantalla en escritorio. Contacto es su único h1, con
la prosa de `content/es/worlds/ranger.mdx`. Una franja de cristal reúne correo,
WhatsApp y teléfono. Debajo, el formulario aparece junto a una invitación breve;
CV ES/EN, GitHub y LinkedIn cierran la página sin repetir tarjetas de servicios.
En móvil el encuadre se acerca a la nave y los canales se apilan.

## Interacción y límites

- Probar señal ejecuta una simulación LOCAL de 1,6 segundos: tres ondas y una
  respuesta del receptor. No envía información, no reproduce audio ni promete
  una conexión real. No hay autoplay ni bucle de animación en reposo.
- Puntero fino: el ventanal responde en ±6/±4 píxeles. No controla ninguna cámara.
- Reduced-motion y el perfil ligero apagan el paralaje y la secuencia. Pulsar
  sigue ofreciendo confirmación, instantánea. Los temporizadores se cancelan
  al desmontar.
- Correo y teléfono se pueden copiar con confirmación accesible y manejo del
  fallo del portapapeles. Los enlaces mailto, tel y WhatsApp funcionan sin JS.
- El formulario conserva validación, consentimiento, Turnstile, protección
  server-side, errores, reintento y navegación a gracias. Su envío real sigue
  dependiendo de la configuración de Turnstile y Resend existente.
- Sin JavaScript se conservan prosa, navegación, canales y CV; se explica la
  alternativa al formulario y se retiran los controles decorativos inoperantes.
- No se modifican el System Map, la Ranger del mapa, materiales ni cámaras.
  No se añade WebGL, dependencia, canvas ni motor de animación.

## Datos

Fuente única: `content/site.data.ts`. Correo: jonasjavier.dev@gmail.com.
Teléfono: +18498625049, publicado también en Person/JSON-LD.
El teléfono visible se formatea desde el mismo dato; WhatsApp conserva su número
internacional sin el signo +.

## Recurso visual

Generado con la herramienta integrada ImageGen, convertido a WebP con Sharp:
`public/images/ranger/observation-deck.webp` — 1672 × 941, 116.888 bytes.
Se sirve con next/image, sizes=100vw y preload; las variantes las genera el
optimizador ya existente. No hay referencias de ejecución fuera del repositorio.

Prompt final (herramienta integrada, sin API/CLI):

> Use case: stylized-concept. Asset type: cinematic background for a premium minimal spacecraft contact webpage, landscape 2560x1440. Create a photoreal science fiction film still from just inside the forward observation window of a small deep-space shuttle. The window fills almost all of the image; only restrained dark graphite structural window framing at the extreme top corners and bottom corners, no dashboard in the center. Exterior: enormous curved blue-grey planetary horizon sweeping gently upward from the lower left towards the right, tiny cold stars, subtle deep navy interstellar dust, one far distant small sun near upper right giving a soft warm light. One beautifully detailed ivory-white angular Ranger-style scientific shuttle floating in the RIGHT third, about 25 percent of the image width, nose pointing diagonally toward the lower-left/viewer, three-quarter dorsal view, black segmented cockpit glazing, broad low swept lifting-body wings, ceramic thermal tiles and restrained panel detail, two delicate pale cyan engine exhausts. The craft must be brightly legible, tactile, plausible and elegant, NOT a fighter jet. LEFT HALF must be quiet very dark empty space for large white HTML headline text; lower third restrained dark navy for interface readability. Style: Interstellar cinematography, photographed miniature, 35mm grain very subtle, majestic physical scale, disciplined contrast, believable cold reflected planetary light and warm edge sunlight. Extremely premium cinematic composition, not a game screenshot. No text, no letters, no logos, no UI, no HUD, no people, no extra ships, no busy nebula, no purple clouds, no huge glowing rings.

## Verificación

`components/ranger-contact.test.tsx` cubre contenido, destinos, CV, datos,
portapapeles y fallo, señal finita, doble entrada, cancelación y modo reducido.
`e2e/ranger.spec.ts` comprueba cuatro tamaños, enlaces de 44 px, formulario,
teclado, reduced-motion y navegación sin JavaScript. Las pruebas existentes
A25/A26/A31 conservan la cobertura de envío, reintento y CV.

La aceptación visual queda para el dueño.

