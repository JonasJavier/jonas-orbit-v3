"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePrefetchOnIntent } from "@/lib/world-prefetch";

/**
 * EL `<Link>` del sitio: no precarga por estar a la vista, sino al apuntarlo,
 * enfocarlo o tocarlo. Todo `import Link from "next/link"` del repo pasa por
 * aquí (`import { IntentLink as Link }`); el porqué está en
 * `lib/world-prefetch.ts`. Es la misma mejora progresiva: el `<a href>` navega
 * igual sin JavaScript.
 *
 * `pointerenter` dispara también en táctil (al apoyar el dedo), así que un
 * toque precarga antes del `click` que arranca la travesía.
 */
export function IntentLink({ href, onPointerEnter, onFocus, ...rest }: ComponentProps<typeof Link>) {
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
    />
  );
}
