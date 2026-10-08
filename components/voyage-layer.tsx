"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import { cancelVoyage, markVoyageArrived } from "@/lib/voyage-controller";

/**
 * La luz del cruce, y el aviso de llegada.
 *
 * Vive en el layout, como el canvas: sobrevive a la navegación. Es un
 * `<div>` fijo, sin puntero y sin texto, que el CSS enciende en el pico de la
 * travesía (`html[data-voyage="flash"]`) y retira al llegar
 * (`html[data-voyage="arrive"]`). Cubre el instante exacto del cambio de
 * página en los dos modos, y también en los mundos que tapan la escena con su
 * propio lienzo —Miller, Edmunds, la Ranger, Sobre mí—, donde el shader ya no
 * puede dibujar la segunda mitad del viaje.
 *
 * La llegada se avisa desde aquí porque este es el único componente que ve
 * cambiar el pathname y no se desmonta al hacerlo. Va en un layout effect: la
 * página nueva ya está en el DOM y todavía no se ha pintado, así que su
 * animación de entrada arranca desde opacidad cero sin un fotograma en falso.
 */
export function VoyageLayer() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    // En reposo no hace nada; con una travesía en marcha, empieza la llegada.
    markVoyageArrived();
  }, [pathname]);

  useEffect(() => () => cancelVoyage(), []);

  // La línea de progreso: la enciende la espera de la travesía
  // (`data-voyage="wait"`) y cualquier enlace cuya página aún no ha llegado
  // (`data-route-pending`, desde `IntentLink`).
  return (
    <>
      <div className="voyage-flash" aria-hidden="true" />
      <div className="route-progress" aria-hidden="true" />
    </>
  );
}
