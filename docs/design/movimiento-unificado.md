# Un solo interruptor de movimiento

Petición del dueño · 2026-09-13: «quiero que todo el movimiento de todo el
sistema se conecte a un solo icono que estará abajo a la derecha, siempre
presente, que activará y desactivará el movimiento de todo; por defecto el
movimiento activado; eliminamos el botón del océano de Miller, el del modo
vuelo de la Ranger, el de la navbar, etc.; será el mismo para activar y
desactivar la escena 2D y 3D».

## Qué manda

Un icono en la **bandeja inferior derecha** (`components/motion-toggle.tsx`,
junto a la banda sonora, en todas las rutas) gobierna todo lo que se mueve:

| Pieza | Antes | Ahora |
| --- | --- | --- |
| Escena 3D del System Map y su polvo/cursor | «Activar animación 3D» en el HUD y `scene-toggle` en cada mundo | el icono |
| Cielo de la cabecera | «Pausar / Activar estrellas» | el icono |
| Océano y corrientes de Miller | «Pausar / Activar océano» | el icono |
| Vuelo, radar y paralaje de la Ranger | «Pausar / Activar vuelo» | el icono |
| Cubierta 3D de Edmunds (giro, paralaje, cine) | reduced-motion / perfil ligero | el icono |
| Animaciones CSS de las páginas | `@media (prefers-reduced-motion)` | `html[data-motion="off"]` |

**Por defecto está encendido.** La preferencia del sistema
`prefers-reduced-motion` ya no apaga por sí sola nada de lo anterior: el
dueño tiene movimiento reducido en su equipo y no veía moverse nada, y el
icono —visible, con nombre accesible y reversible en cualquier ruta— es el
consentimiento. La elección se recuerda entre rutas y visitas.

## Cómo funciona

`lib/effects-mode.ts` queda con **un solo valor**, «movimiento», y tres
entradas por orden de mando:

1. La URL: `?no3d=1` sigue siendo la puerta documentada al perfil ligero
   (regla 5 del repositorio, Lighthouse y la mayor parte de los e2e) y se
   persiste, como antes. `?no3d=0` cuenta como encendido explícito.
2. Lo que el visitante eligió con el icono, guardado con la clave de siempre
   (`jonas-orbit:reducir-efectos`: `"true"` apagado, `"false"` encendido a
   propósito).
3. Si no hay nada: encendido.

Dos lecturas del mismo valor:

- `useMotionEnabled()` — encendido por defecto o a propósito. Lo leen las
  páginas (cabecera, Miller, Ranger, Edmunds) y el icono, que publica
  `data-motion="on|off"` en `<html>` para que el CSS obedezca al mismo valor
  que los canvas.
- `useForcedEffects()` — encendido **a propósito** (icono pulsado o
  `?no3d=0`). Lo leen la escena, el fondo 2D y el gate de capacidad: sólo la
  petición explícita salta por encima de reduced-motion y de las heurísticas
  de GPU por software, red lenta y memoria corta, igual que hacía la
  activación anterior. Sin esa petición, un equipo flojo sigue recibiendo el
  mapa plano aunque las páginas animen. `useLightEffectsMode()` es la
  negación de la primera lectura y se conserva para la escena y el fondo.

Desaparecen la clave `jonas-orbit:efectos-forzados`, `setForcedEffects`, el
control de efectos del HUD, el `scene-toggle` de las páginas de mundo y los
tres botones locales. Ninguna página guarda ya estado de pausa o activación.

## El icono

Un sistema en miniatura: un cuerpo central y un satélite en una órbita
inclinada. Encendido, el satélite recorre la órbita (animación CSS) y el
núcleo brilla; apagado, la órbita queda punteada y el satélite se detiene.
Lleva la lectura `MOVIMIENTO · ON/OFF` en el mismo mono que la banda sonora
—en móvil sólo el icono— y nombre accesible «Desactivar movimiento» /
«Activar movimiento» con `aria-pressed`. 44 px, foco visible, sin JavaScript
no aparece (no habría nada que apagar).

## Verificación

`e2e/motion.spec.ts`: encendido por defecto incluso con reduced-motion del
sistema, un clic apaga cielo, océano y CSS a la vez, la elección viaja a la
siguiente ruta (la cabina de la Ranger monta apagada), y vuelve a encender
por teclado; `?no3d=1` apaga el icono y la portada queda en plano; el icono
mide 44 px en móvil y no tapa la banda sonora. Las suites de navbar, Miller,
Ranger, Edmunds y smoke se reescriben para usar el icono en lugar de los
controles retirados. Unitarios: `effects-mode.test.ts` (defecto encendido),
`system-hud.test.tsx` (sin control), `ranger-contact.test.tsx` y
`site-header.test.tsx` (obedecen al valor).
