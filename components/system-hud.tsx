"use client";

import { useEffect, useState } from "react";
import type { WorldId } from "@/content/worlds.data";
import { useLightEffectsMode } from "@/lib/effects-mode";
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
  const lightEffects = useLightEffectsMode();

  // El gate publica el nivel real en `<html data-scene>`. El HUD lo observa en
  // vez de duplicar la heurística de capacidad.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setSceneLevel(root.dataset.scene ?? null);
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-scene"] });
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
    navigationState === "locked" ? "Destination locked" : "Target lock";

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
            <span className="hud__target-eyebrow">Navigation</span>
            <span className="hud__target-rule" />
            <span className="hud__target-name hud__target-name--idle">
              Select destination
            </span>
          </>
        )}
      </div>

      {/*
        Un solo control, y es accionable.

        La lectura «MOTION // REDUCED» se ha ido del cristal. Era telemetría
        sobre una preferencia del sistema operativo que el visitante ya conoce
        —la puso él— y que además no podía cambiar desde aquí: texto permanente
        que ocupaba sitio sin ofrecer nada. El estado real sigue publicado en
        `<html data-reduced-motion>` para diagnóstico y para los tests, y quien
        quiera actuar sobre los efectos tiene justo al lado el único control que
        sí hace algo.
      */}
      <div className="hud__controls">
        <a
          aria-label={lightEffects ? "Activar escena 3D" : "Reducir efectos 3D"}
          className="hud__readout hud__readout--action"
          href={lightEffects ? "?no3d=0" : "?no3d=1"}
        >
          3D <i aria-hidden="true">{"//"}</i>{" "}
          {lightEffects ? "OFF" : "ACTIVE"}
        </a>
      </div>
    </div>
  );
}
