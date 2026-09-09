# Audio del sistema — primera entrega

Petición del dueño: añadir música voluntaria, un control permanente integrado en
el HUD y continuidad entre las secciones. Se implementa una sola pista; las capas
adaptativas por mundo siguen diferidas. No cambia la escena ni su dirección artística.

## Material

Fuente aportada por el dueño: `music/MUSIC.mp3`. Aunque su extensión dice MP3,
contiene AAC estéreo a 44.1 kHz dentro de MP4: 2:01:37.89, 118 109 281 bytes.
Se conserva el original. La edición web usa sus primeros ocho minutos, entrada
de dos segundos y cierre de ocho, AAC a 128 kbit/s con metadata de reproducción
al principio del archivo (`faststart`). `public/audio/orbit-ambient.m4a` ocupa
7 795 532 bytes (7.44 MiB). No se atribuye una composición ni una autoría a partir
del nombre del archivo. La aportación del archivo no acredita una licencia de publicación.

## Comportamiento

- Una instancia en el layout de idioma sobrevive a la navegación cliente.
- Audio apagado en cada documento nuevo. No se guarda consentimiento de reproducción.
- No se crea `Audio`, `AudioContext` ni petición de música hasta pulsar activar.
- Una fuente en streaming, un nodo de ganancia; sin decodificar la pista completa
  en un `AudioBuffer`, sin biblioteca, sin RAF ni mediciones por fotograma.
- Volumen inicial 28 %, guardado localmente al ajustarlo. Silencio reversible sin
  perder volumen ni posición; ganancia Web Audio para que funcione también donde
  el navegador no permite modificar `HTMLMediaElement.volume`.
- Entrada de 1.2 s, pausa con salida de 220 ms; reanudar conserva posición.
  La edición vuelve a empezar al terminar mediante `loop`, con su cierre suave.
- Ocultar la pestaña pausa inmediatamente y suspende el contexto. Volver sólo
  reanuda si el visitante seguía queriendo música. Una pausa explícita se respeta.
- Carga y errores se reflejan en el control. Un fallo permite reintentar y no
  afecta a rutas, contenido, 2D ni 3D. Desmontar libera fuente y contexto.

## Interfaz

En escritorio, AUDIO acompaña a MOTION en la franja inferior derecha. En móvil
vertical, audio ocupa la banda libre bajo la marca; en apaisado corto va a la
izquierda y movimiento a la derecha, por encima del raíl. Así no tapa la Ranger
ni se solapa con ACTIVAR 3D en 320 × 568. En las
secciones mantiene una base oscura discreta y espacio de cierre en el documento
para no tapar el último enlace. El control existe también con movimiento reducido.

Icono de altavoz, estado textual y botón de ajustes; sin ecualizador animado.
El panel contiene volumen y silencio. Teclado, foco visible, blancos de 44 px,
Escape con retorno del foco y cierre al pulsar fuera. El único anuncio vivo es
el error de reproducción; el volumen conserva su output nativo accesible.

## Validación

`lib/soundtrack.test.ts` cubre consentimiento, una sola fuente, posición,
carreras play/pause, suspensión, rechazo, mute, almacenamiento bloqueado y teardown.
`e2e/soundtrack.spec.ts` comprueba reproducción nativa, cero peticiones antes del
clic, continuidad real entre rutas, teclado y fallo de red. Se ejecuta también
el atlas para vigilar solapes en sus seis formatos.

El presupuesto de transferencia inicial de audio es cero. El archivo de 7.44 MiB
es independiente de JS/texturas de la escena y sólo se solicita por voluntad del
visitante. El tamaño del audio original no entra en los assets públicos.
