"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, type ComponentProps } from "react";
import { usePrefetchOnIntent } from "@/lib/world-prefetch";

/**
 * EL `<Link>` del sitio: no precarga por estar a la vista, sino al apuntarlo,
 * enfocarlo o tocarlo. Todo `import Link from "next/link"` del repo pasa por
 * aquí (`import { IntentLink as Link }`); el porqué está en
 * `lib/world-prefetch.ts`. Es la misma mejora progresiva: el `<a href>` navega
 * igual sin JavaScript.
 *
 * La precarga espera a que el puntero o el foco SE QUEDEN (160 ms, en
 * `world-prefetch.ts`): pasar por encima de camino a otro sitio no gasta red.
 * Un toque navega antes de ese plazo, y no hace falta: la travesía precarga
 * al despegar y un `<Link>` pide su ruta al pulsarlo.
 */
export function IntentLink({ href, onPointerEnter, onFocus, children, ...rest }: ComponentProps<typeof Link>) {
  const prefetch = usePrefetchOnIntent();
  const target = typeof href === "string" ? href : null;
  return (
    <Link
      href={href}
      prefetch={false}
      onPointerEnter={(event) => {
        if (target) prefetch(target);
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        if (target) prefetch(target);
        onFocus?.(event);
      }}
      {...rest}
    >
      {children}
      <RoutePending />
    </Link>
  );
}

/**
 * Mientras la página pulsada no llega, `<html data-route-pending>`: el CSS
 * enciende la línea de progreso de `VoyageLayer` (la misma de la espera de la
 * travesía). Sin esto, con la red lenta un clic en la cabecera no cambiaba
 * NADA en pantalla durante 1–3 s y se leía como un sitio congelado. No pinta
 * nada propio: ni texto ni caja dentro del enlace.
 */
function RoutePending() {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (!pending) return;
    const root = document.documentElement;
    root.dataset.routePending = "true";
    return () => {
      delete root.dataset.routePending;
    };
  }, [pending]);
  return null;
}
