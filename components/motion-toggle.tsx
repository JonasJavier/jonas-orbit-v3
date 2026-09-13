"use client";

import { useEffect } from "react";
import { setMotionEnabled, useMotionEnabled } from "@/lib/effects-mode";
import "./motion-toggle.css";

/**
 * El único interruptor de movimiento del sitio.
 *
 * Vive en la bandeja inferior derecha junto a la banda sonora, en todas las
 * rutas, y gobierna TODO lo que se mueve: la escena 3D y su polvo, el cielo de
 * la cabecera, el océano de Miller, el vuelo de la Ranger, la cubierta de
 * Edmunds y las animaciones CSS de las páginas. Por defecto está encendido;
 * apagarlo deja cada cosa en un fotograma quieto y se recuerda entre rutas y
 * visitas. Publica `data-motion` en `<html>` para que el CSS obedezca al mismo
 * valor que los canvas.
 *
 * El icono es un sistema en miniatura: un cuerpo central y un satélite en una
 * órbita inclinada. Con el movimiento encendido el satélite recorre la órbita;
 * apagado, se detiene donde estaba.
 */
export function MotionToggle() {
  const enabled = useMotionEnabled();

  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);

  return (
    <button
      className="motion-toggle"
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Desactivar movimiento" : "Activar movimiento"}
      title={enabled ? "Desactivar movimiento" : "Activar movimiento"}
      data-state={enabled ? "on" : "off"}
      onClick={() => setMotionEnabled(!enabled)}
    >
      <svg className="motion-toggle__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <g className="motion-toggle__orbit">
          <ellipse cx="12" cy="12" rx="9.5" ry="9.5" />
          <g className="motion-toggle__satellite">
            <circle cx="21.5" cy="12" r="1.7" />
          </g>
        </g>
        <circle className="motion-toggle__core" cx="12" cy="12" r="2.6" />
        <path className="motion-toggle__pause" d="M9.6 9v6M14.4 9v6" />
      </svg>
      <span className="motion-toggle__readout"><span>Movimiento</span><strong>{enabled ? "On" : "Off"}</strong></span>
    </button>
  );
}
