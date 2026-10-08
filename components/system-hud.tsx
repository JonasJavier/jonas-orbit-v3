"use client";

import { useEffect, useState } from "react";
import type { WorldId } from "@/content/worlds.data";
import { defineCopy } from "@/lib/i18n";
import type { WorldNavigationState } from "@/lib/world-navigation";
import type { WorldNavItem } from "@/lib/worlds";
import { useLocale } from "./locale-provider";

// La placa del operador: quién mira por este cristal y a qué se dedica. El
// resto del HUD habla en inglés de instrumento; esto es identidad y se traduce.
// Las dos disciplinas van por separado porque en el teléfono se apilan.
const COPY = defineCopy({
  es: {
    role: ["Full-stack", "Diseño de producto"] as readonly [string, string],
    idleName: "Elige un destino",
    idleRole: "y explora mi trabajo",
  },
  en: {
    role: ["Full-stack", "Product design"],
    idleName: "Choose a destination",
    idleRole: "and explore my work",
  },
});

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
  const copy = COPY[useLocale()];
  const [sceneLevel, setSceneLevel] = useState<string | null>(null);

  // El gate publica el nivel real en `<html data-scene>`. El HUD lo observa en
  // vez de duplicar la heurística de capacidad.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      setSceneLevel(root.dataset.scene ?? null);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-scene"],
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

  return (
    <div className="hud">
      <div className="hud__glass" aria-hidden="true">
        <span className="hud__bracket hud__bracket--tl" />
        <span className="hud__bracket hud__bracket--tr" />
        <span className="hud__bracket hud__bracket--bl" />
        <span className="hud__bracket hud__bracket--br" />
      </div>

      <div className="hud__top" aria-hidden="true">
        <span className="hud__craft">
          Endurance <i>{"//"}</i> Nav
        </span>
        {/* La placa cuelga de la marca, no de la franja: así comparte su
            visibilidad en cada ancho y la franja sigue siendo de una línea.
            Es `aria-hidden` como todo el HUD porque el `<h1>` del respaldo
            semántico ya dice nombre y rol. */}
        <span className="hud__system">
          Jonas Orbit
          <span className="hud__operator">
            <span className="hud__operator-name">Jonás Javier</span>
            <i className="hud__operator-sep">{"//"}</i>
            <span className="hud__operator-role">
              <span>{copy.role[0]}</span>
              <i className="hud__operator-dot">·</i>
              <span>{copy.role[1]}</span>
            </span>
          </span>
        </span>
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
            {/* En reposo la lectura es una INSTRUCCIÓN y se traduce: «SELECT
                TARGET» era jerga de instrumento que no decía al visitante qué
                hacer ni para qué (crítica externa, 2026-10-07). */}
            <span className="hud__target-eyebrow">System map</span>
            <span className="hud__target-rule" />
            <span className="hud__target-name hud__target-name--idle">
              {copy.idleName}
            </span>
            <span className="hud__target-role">{copy.idleRole}</span>
          </>
        )}
      </div>

    </div>
  );
}
