"use client";

import { useEffect, useState } from "react";
import type { WorldId } from "@/content/worlds.data";
import {
  setForcedEffects,
  useForcedEffects,
} from "@/lib/effects-mode";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { WorldNavigationState } from "@/lib/world-navigation";
import type { WorldNavItem } from "@/lib/worlds";

/** Instrumentación mínima y honesta del puesto de navegación. */
export function SystemHud({
  worlds,
  activeWorldId,
  navigationState,
}: {
  worlds: readonly WorldNavItem[];
  activeWorldId: WorldId | null;
  navigationState: WorldNavigationState;
}) {
  const [sceneLevel, setSceneLevel] = useState<string | null>(null);
  const [sceneReason, setSceneReason] = useState<string | null>(null);
  const forcedEffects = useForcedEffects();
  const reducedMotion = usePrefersReducedMotion();

  // El gate publica el nivel real en `<html data-scene>`. El HUD lo observa en
  // vez de duplicar la heurística de capacidad.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      setSceneLevel(root.dataset.scene ?? null);
      setSceneReason(root.dataset.sceneReason ?? null);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-scene", "data-scene-reason"],
    });
    return () => observer.disconnect();
  }, []);

  const world =
    worlds.find((candidate) => candidate.id === activeWorldId) ?? null;
  const systemState =
    sceneLevel === "deep" || sceneLevel === "orbit"
      ? "NOMINAL"
      : sceneLevel === "flat"
        ? "FLAT"
        : "STANDBY";
  const targetLabel =
    navigationState === "locked" ? "Target locked" : "Target lock";
  const sceneUnavailable =
    sceneReason === "sin-webgl2" || sceneReason === "escena-fallida";
  const sceneIsLive = sceneLevel === "deep" || sceneLevel === "orbit";
  /*
    El HUD es la única autoridad visual del control en el System Map. El nivel
    real —no la causa estimada— decide qué acción tiene sentido:

    - `flat`: activar voluntariamente;
    - escena forzada: volver al mapa quieto;
    - escena normal: ofrecer el perfil ligero mediante su URL documentada.

    Así una GPU modesta no recibe el absurdo «Reducir efectos» cuando ya está
    viendo el fallback, y tampoco aparecen dos botones con la misma función.
  */
  const usesDirectToggle =
    sceneLevel === "flat" || forcedEffects || reducedMotion;

  return (
    <div className="hud">
      <div className="hud__glass" aria-hidden="true">
        <span className="hud__bracket hud__bracket--tl" />
        <span className="hud__bracket hud__bracket--tr" />
        <span className="hud__bracket hud__bracket--bl" />
        <span className="hud__bracket hud__bracket--br" />
        <span className="hud__reticle" />
      </div>

      <div className="hud__top" aria-hidden="true">
        <span className="hud__craft">
          Endurance <i>{"//"}</i> Nav
        </span>
        <span className="hud__system">Jonas Orbit</span>
        <span className="hud__state">
          <b className="hud__status-dot" /> System {systemState}
        </span>
      </div>

      {/* Hover es información visual ambiental: no se anuncia en cada paso del
          puntero. El enlace del raíl enfocado ya aporta nombre y función. */}
      <div
        className="hud__target"
        data-target-state={navigationState}
        aria-hidden="true"
      >
        {world ? (
          <>
            <span className="hud__target-eyebrow">{targetLabel}</span>
            <span className="hud__target-rule" />
            <span className="hud__target-name">{world.cosmicName}</span>
            <span className="hud__target-role">{world.shortLabel}</span>
            {navigationState === "target" ? (
              <span className="hud__target-action">[ Enter ]</span>
            ) : null}
          </>
        ) : (
          <>
            <span className="hud__target-eyebrow">System map</span>
            <span className="hud__target-rule" />
            <span className="hud__target-name hud__target-name--idle">
              Select target
            </span>
          </>
        )}
      </div>

      {/* Un control real, siempre reversible. Reduced-motion conserva el frame
          plano por defecto, pero no es una cárcel: una acción inequívoca puede
          activar la experiencia completa y el mismo lugar vuelve a reducirla. */}
      <div
        className="hud__controls"
        data-effects-control={usesDirectToggle ? "primary-toggle" : "standard"}
      >
        {usesDirectToggle ? (
          <button
            aria-label={
              sceneUnavailable
                ? "Animación 3D no disponible"
                : sceneIsLive
                  ? "Volver al mapa sin animación"
                  : "Activar animación 3D"
            }
            aria-pressed={sceneIsLive && forcedEffects}
            className="hud__readout hud__readout--action hud__effects-toggle"
            disabled={sceneUnavailable}
            onClick={() => setForcedEffects(!sceneIsLive)}
            type="button"
          >
            {sceneUnavailable
              ? "3D offline"
              : sceneIsLive
                ? "Mapa 2D"
                : "Activar 3D"}
          </button>
        ) : (
          <a
            aria-label="Reducir efectos 3D"
            className="hud__readout hud__readout--action"
            href="?no3d=1"
          >
            Reducir efectos
          </a>
        )}
      </div>
    </div>
  );
}
