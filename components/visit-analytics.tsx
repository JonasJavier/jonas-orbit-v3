"use client";

import { useEffect } from "react";
import { useAfterLoadIdle } from "@/lib/after-load-idle";
import { SITE_URL } from "@/lib/site-url";

/*
  Cuántas personas visitan el sitio, de dónde llegan y cómo carga para ellas.

  Cloudflare Web Analytics: sin cookies ni identificadores, así que no hay
  banner de consentimiento; mide también Core Web Vitals de visitas reales,
  que Search Console no tiene con este tráfico. El token es público (va en el
  HTML de cualquier sitio que lo usa).

  Se inyecta cuando la página ya cargó y el navegador está ocioso
  (`useAfterLoadIdle`): no compite con la hidratación ni con la imagen
  principal. `spa: true` cuenta las navegaciones del router sin recargar.
  Sólo en el dominio canónico: ni `localhost`, ni el preview de Cloudflare,
  ni la suite e2e mandan datos.
*/

const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";
const CLOUDFLARE_ANALYTICS_TOKEN = "d7a475d9d03444adb764fd6a1287be79";

export function shouldMeasureVisits(hostname: string, siteUrl: string, token: string): boolean {
  if (!token) return false;
  return hostname === new URL(siteUrl).hostname;
}

export function VisitAnalytics() {
  const idle = useAfterLoadIdle();

  useEffect(() => {
    if (!idle) return;
    if (!shouldMeasureVisits(window.location.hostname, SITE_URL, CLOUDFLARE_ANALYTICS_TOKEN)) return;
    if (document.querySelector(`script[src="${BEACON_SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = BEACON_SRC;
    script.defer = true;
    script.dataset.cfBeacon = JSON.stringify({ token: CLOUDFLARE_ANALYTICS_TOKEN, spa: true });
    document.body.append(script);
  }, [idle]);

  return null;
}
