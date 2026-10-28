# Notas — `written-proposal` (borrador 2026-10-16)

Tema #3 de la cola (`docs/presencia-web.md` §5): «Qué tiene que decir una
propuesta por escrito antes de empezar un proyecto». Tema `freelance`.

## Fuentes leídas

- `docs/presencia-web.md` (entero).
- `components/services-page.tsx` (entero): los cuatro pasos de «Cómo trabajo»
  (conversación, propuesta, construcción, lanzamiento), la pregunta frecuente
  «¿Cuánto cuesta un proyecto?» («Depende del alcance… propuesta por escrito
  con alcance, plazos y presupuesto, antes de empezar nada») y «¿Qué pasa
  después del lanzamiento?».
- `content/{es,en}/articles/hire-freelance-developer-dr.mdx` (enteras): la
  sección «Pide una propuesta por escrito» ya da la lista corta; esta entrada
  la desarrolla sin repetirla y enlaza a ella. La parte de propiedad (dominio,
  código, accesos) se resume en un párrafo y remite a la guía.
- `docs/registro-de-decisiones.md`: «Servicios y notas de taller (2026-09-30)»
  y «Servicios — segundo pase y cabecera centrada del blog (2026-10-01)».
- `content/es/projects/omsta.mdx`: §2 Problema, §4 Usuarios y permisos, §5
  Restricciones (DGII), §6 Cómo lo construí (orden por capas), §8 La app móvil
  (iOS espera la cuenta de Apple Developer del negocio). Comprobado el mismo
  contenido en `content/en/projects/omsta.mdx`.
- `content/es/projects/delicate.mdx`: §1–§5, §8, §13 «Lo que no tiene», §16
  Estado actual (validaciones que dependen del negocio). En inglés, §13 se
  titula «What it doesn't have» (citado así en en.mdx).
- Estilo: `content/{es,en}/articles/gargantua-webgl.mdx` (enteras).
- Rutas: `lib/page-paths.ts`, `lib/path-segments.ts`, `slug` de
  `content/{es,en}/{worlds,projects,articles}`.

## Cifras usadas y de dónde salen

- **Cuatro pasos** de «Cómo trabajo» — `components/services-page.tsx`,
  `steps`.
- **Cinco roles base** en OMSTA — `content/es/projects/omsta.mdx` §4.
- **Cero cuentas para comprar** en Delicaté («Comprar no pide ninguna cuenta» /
  «Buying requires zero accounts») — `content/es/projects/delicate.mdx`,
  `scope`: `value: "0"`, «cuentas necesarias para comprar».
- «40 %» en «no “avance del 40 %”» es un ejemplo de lo que NO hay que escribir,
  no una medida. Si a Jonás le parece que se lee como cifra, se quita.
- «Tres meses» en «Un plazo de “tres meses”…» es el mismo tipo de ejemplo, no
  un plazo real de ningún proyecto.

No hay precios, plazos reales ni clientes fuera de los ya nombrados en
`content/` (OMSTA/CristegnoViajes no se nombra por la agencia; Delicaté sí,
como en su caso).

## Enlaces internos (todos comprobados)

- ES: `/es/blog/como-elegir-un-desarrollador-web-freelance-en-republica-dominicana`,
  `/es/proyectos/omsta`, `/es/proyectos/delicate-4-0`, `/es/proyectos`,
  `/es/contacto/servicios`, `/es/contacto`.
- EN: `/en/blog/how-to-hire-a-freelance-web-developer-dominican-republic`,
  `/en/projects/omsta`, `/en/projects/delicate-4-0`, `/en/projects`,
  `/en/contact/services`, `/en/contact`.

## Figuras

- Usada: `servicios-proceso` (existe
  `public/images/articulos/freelance/servicios-proceso-1600.webp`). Funciona sólo
  si la entrada usa `images: "/images/articulos/freelance"`.
- **Falta (portada propia, opcional):** la página de servicios
  (`/es/contacto/servicios` y `/en/contact/services`), sección «Preguntas
  frecuentes», con «¿Cuánto cuesta un proyecto?» / «How much does a project
  cost?» desplegada, a 1600 px de ancho; una por idioma
  (`propuesta-portada`, `propuesta-portada-en`) en `-800.webp` y `-1600.webp`.
  Mientras no exista, la portada puede ser `servicios-proceso`; en ese caso la
  figura del cuerpo repite la portada y conviene quitarla del cuerpo.
- Opcional: la sección «Lo que no tiene» del caso de Delicaté
  (`/es/proyectos/delicate-4-0`) como figura de «Qué no entra».

## Dudas para Jonás

1. **«Cuando algo cambia»**: la regla («un cambio se escribe igual que la
   propuesta: qué se añade, qué se quita o aplaza, cómo afecta a entregas y
   presupuesto») NO sale de ninguna fuente del repo. La escribí como consejo
   en tu voz; confirma que es como lo haces o cámbiala.
2. **Entregas atadas a pagos** y **dividir en entregas con fecha**: las fuentes
   dicen «avances que puedes abrir y probar en un enlace real» y «alcance,
   plazos y presupuesto por escrito», pero no cómo divides los pagos. Lo dejé
   como lo que la propuesta *debe decir*, no como tu forma de cobrar. Revisa.
3. **Errores en las primeras semanas y cambios pequeños después**: la página
   de servicios sólo dice «acompañamiento después de la entrega». No inventé
   tu política; sólo digo que debe quedar escrita. ¿Quieres concretarla?
4. **Nota honesta** («no tengo un modelo de propuesta publicado y no enseño
   las de mis clientes»): no está en las fuentes. Confirma que es cierto o
   quítala.
5. Los ejemplos de OMSTA y Delicaté ilustran *qué tipo de línea* va en una
   propuesta; el texto no afirma que esas líneas estuvieran en una propuesta
   firmada con esos clientes. Si lo estaban y puedes decirlo, el texto gana.
6. «DGII, the Dominican tax authority»: en inglés añadí la aclaración; en el
   caso inglés de OMSTA se escribe sólo «DGII».

## Entrada propuesta para `content/articles.data.ts`

```ts
  // Lo que va en una propuesta antes de empezar: desarrolla la sección de la
  // guía para contratar. Comparte carpeta de figuras con ella.
  "written-proposal": {
    published: "AAAA-MM-DD",
    topic: "freelance",
    images: "/images/articulos/freelance",
    cover: { es: "propuesta-portada", en: "propuesta-portada-en" }, // o "servicios-proceso" mientras no exista
  },
```

Sin `specimen`. Recuerda añadir `"written-proposal"` a `ARTICLE_IDS` y subir
la cuenta de `e2e/blog.spec.ts`.

## Titulares alternativos

1. ES «Antes de escribir código: qué pongo por escrito en una propuesta» · EN
   «Before any code: what I put in a written proposal»
2. ES «Lo que no entra: la parte de la propuesta que evita discusiones» · EN
   «Out of scope: the proposal section that prevents arguments»
3. ES «Cómo leer una propuesta de desarrollo web antes de firmarla» · EN
   «How to read a web development proposal before you sign it»

## Foro de Three.js

Foro de Three.js: no aplica esta semana (tema `freelance`).
