"use client";

import { useEffect, useState } from "react";
import type { WorldId } from "@/content/worlds.data";
import { useLightEffectsMode } from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { WorldNavItem } from "@/lib/worlds";

/**
 * La instrumentación del puesto de navegación.
 *
 * ── Qué problema resuelve ───────────────────────────────────────────────────
 *
 * El sistema orbital ya se veía bien, pero seguía leyéndose como una
 * ilustración: un montón de cuerpos flotando en negro. Lo que faltaba no era
 * más universo, era un SITIO DESDE EL QUE MIRARLO. Un marco convierte una
 * ilustración en una vista — y esa es toda la diferencia entre «menú con tema
 * espacial» y «puesto de navegación de una nave».
 *
 * ── La regla que lo mantiene honesto ────────────────────────────────────────
 *
 * **Cada lectura corresponde a estado real de la aplicación.** Ni un dato
 * inventado: nada de combustible, oxígeno, coordenadas ni telemetría de adorno.
 * Un instrumento que miente es peor que no tenerlo, porque delata que todo lo
 * demás también podría ser decoración.
 *
 * - `SISTEMA` sale del gate de capacidad, que publica su veredicto en el DOM.
 * - `NAV TARGET` sale del destino que el visitante está apuntando de verdad.
 * - `MOVIMIENTO` sale de `prefers-reduced-motion` del sistema operativo.
 * - `3D` sale del perfil ligero, y su enlace lo cambia de verdad.
 *
 * Todo el bloque es `aria-hidden`: es un reflejo de estado que ya se anuncia
 * por otras vías —el enlace enfocado, el propio documento— y repetirlo
 * convertiría cada movimiento del ratón en ruido para un lector de pantalla.
 * El único control real que contiene, el del perfil ligero, sí es un enlace
 * accesible de verdad.
 */
export function SystemHud({ worlds }: { worlds: readonly WorldNavItem[] }) {
  const [target, setTarget] = useState<WorldId | null>(null);
  const [sceneLevel, setSceneLevel] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const lightEffects = useLightEffectsMode();

  /*
    El destino apuntado se lee de los MISMOS nodos que la escena reposiciona, no
    de un estado de React que hubiera que sincronizar. Un único origen: si un
    día se añade un octavo destino, el HUD se entera solo.
  */
  useEffect(() => {
    /*
      Se escuchan LOS DOS orígenes: el cuerpo en la escena y su entrada en el
      raíl. Apuntar cualquiera de ellos fija el mismo destino, que es lo que
      hace que el raíl y el universo se sientan el mismo instrumento en vez de
      dos listas de lo mismo.
    */
    const nodes = document.querySelectorAll<HTMLElement>(
      "[data-system-body], [data-rail-world]",
    );
    const off: Array<() => void> = [];

    for (const node of nodes) {
      const id = (node.getAttribute("data-system-body") ??
        node.getAttribute("data-rail-world")) as WorldId | null;
      if (!id) continue;
      const enter = () => setTarget(id);
      const leave = () => setTarget((current) => (current === id ? null : current));
      node.addEventListener("pointerenter", enter);
      node.addEventListener("pointerleave", leave);
      node.addEventListener("focus", enter);
      node.addEventListener("blur", leave);
      off.push(() => {
        node.removeEventListener("pointerenter", enter);
        node.removeEventListener("pointerleave", leave);
        node.removeEventListener("focus", enter);
        node.removeEventListener("blur", leave);
      });
    }

    return () => {
      for (const remove of off) remove();
    };
  }, [worlds]);

  // El nivel de la escena lo publica el gate en `<html data-scene>`. Se observa
  // en vez de recalcularlo: así el HUD no duplica la lógica de capacidad.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setSceneLevel(root.dataset.scene ?? null);
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-scene"] });
    return () => observer.disconnect();
  }, []);

  const world = worlds.find((candidate) => candidate.id === target) ?? null;
  const index = world ? String(world.order).padStart(2, "0") : null;

  const estado =
    sceneLevel === "deep" || sceneLevel === "orbit" ? "NOMINAL" : "PLANO";

  return (
    <div className="hud" aria-hidden="true">
      {/* Corchetes de calibración: todo el «cristal» que hay. */}
      <span className="hud__bracket hud__bracket--tl" />
      <span className="hud__bracket hud__bracket--tr" />
      <span className="hud__bracket hud__bracket--bl" />
      <span className="hud__bracket hud__bracket--br" />

      <div className="hud__top">
        <span className="hud__craft">
          Endurance <i>{"//"}</i> Navegación
        </span>
        <span className="hud__system">Jonas Orbit</span>
        <span className="hud__state">
          Sistema <i>{"//"}</i> {estado}
        </span>
      </div>

      {/*
        NAV TARGET. Sin caja, sin panel: una regla fina, un número y dos líneas
        de texto pegadas al borde del cristal.
      */}
      <div className="hud__target" data-active={world ? "true" : "false"}>
        <span className="hud__target-rule" />
        {world ? (
          <>
            <span className="hud__target-eyebrow">Destino fijado</span>
            <span
              className="hud__target-name"
              style={{ "--world-accent": world.accent } as React.CSSProperties}
            >
              <i>{index}</i> <em>{"//"}</em> {world.cosmicName}
            </span>
            <span className="hud__target-role">{world.shortLabel}</span>
          </>
        ) : (
          <>
            <span className="hud__target-eyebrow">Navegación</span>
            <span className="hud__target-name hud__target-name--idle">
              Elige un destino
            </span>
          </>
        )}
      </div>

      <div className="hud__controls">
        <span className="hud__readout">
          Movimiento <i>{"//"}</i> {reducedMotion ? "REDUCIDO" : "COMPLETO"}
        </span>
        {/*
          El único control de verdad del bloque, y por eso es el único que sale
          del `aria-hidden`: cambia el perfil ligero de la sesión.
        */}
        <a
          aria-hidden={false}
          className="hud__readout hud__readout--action"
          href={lightEffects ? "?no3d=0" : "?no3d=1"}
        >
          3D <i>{"//"}</i> {lightEffects ? "APAGADO" : "ACTIVO"}
        </a>
      </div>
    </div>
  );
}
