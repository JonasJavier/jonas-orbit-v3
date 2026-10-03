"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePrefetchOnIntent } from "@/lib/world-prefetch";

/**
 * Un `<Link>` que no precarga por estar a la vista, sino al apuntarlo o
 * enfocarlo. Es la misma mejora progresiva —el `<a href>` navega igual sin
 * JavaScript— con la precarga puesta donde hay intención. La precarga de
 * fondo de los seis destinos la hace el layout (`lib/world-prefetch.ts`).
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
