# Foro de Three.js — borrador (miller-time-dilation)

Categoría propuesta: Showcase

Título: Miller's ocean planet: a glint path measured against the specular direction

---

I built Miller's planet, the ocean world from *Interstellar*, as one of six specimens in a small Observatory on my portfolio. You can open it and switch between its three views here: https://jonasjavier.dev/en/experiments/observatory/miller

It's a sphere with its own shader. Swell, light path and glints are computed every frame, so the sea keeps moving even with the camera still. Three details that took the most work:

- **The glint isn't tied to the camera axis.** The light path and its sparkle are gaussians over the offset from the *specular direction*, `exp(-(alongOff²·9 + acrossOff²·110))`, then weighted by `mix(0.86, 1.34, fresnel)`, so the sea returns more light the more grazing the view, like a real mirror.
- **The key angle was picked by measuring, not by eye.** With the key light 25° off the view axis, not a single pixel of the glint path reaches pure white (≥ 250): it spreads into a washed-out sheet over half the disk. At 55° there's real white on the crest (120 px) and a terminator that gives the body volume back. 55° is the default; 25° survives as the "Mirror" view, where the wash is the point.
- **Clouds sell "water, not gas".** They're an fbm layer compressed along the sea's axis, with near-white convective cores, drifting at a different speed from the water. Without that offset, the sphere read as a gas giant.

What's not solved: the ocean animates in the planet's own time. In the film, one hour there is seven years on Earth, so seen from orbit the waves should look almost frozen. I chose motion over correctness, and the Gargantua next to it is Schwarzschild, not Kerr, so Miller's orbit couldn't exist around it anyway.

Question for you: if you've rendered water on a sphere at planetary scale, how did you keep the glint from turning into a uniform sheet at low light angles without dropping the light to the terminator?

Write-up: https://jonasjavier.dev/en/blog/miller-planet-time-dilation-interstellar

---

Adjuntar:

- **Falta (captura nueva):** Miller en la vista Canónica a pantalla completa, con GPU real (`tools/README.md`, `awards-shots.mjs`, no `shot.mjs`), desde `/en/experiments/observatory/miller`, modo Estudio. No existe ninguna imagen de Miller en `public/images/`.
- **Falta (opcional):** la misma vista en Espejo (25°) al lado, para enseñar la lámina lavada frente al trazo de 55°.
- **Opcional:** clip de 5–10 s de la vista Corrientes con la cámara quieta, para que se vea que el mar se mueve solo.

Etiquetas sugeridas (comprobar en `/tags/filter/search.json` antes de publicar): `shaders`, `webgl`, `showcase`.
