import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { getNarrativeWorldSummaries } from "@/lib/narrative-types";
import type { World } from "@/lib/worlds";
import { MissionNavigation } from "./mission-navigation";

export function SiteHeader({
  locale,
  worlds,
}: {
  locale: Locale;
  worlds: World[];
}) {
  const narrativeWorlds = getNarrativeWorldSummaries(worlds);

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <Link className="brand-lockup" href={`/${locale}`} aria-label="Jonás Orbit, inicio">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>
            <strong>JONÁS ORBIT</strong>
            <small>FULL-STACK · VISUAL SYSTEMS</small>
          </span>
        </Link>

        <div className="signal-status" aria-label="Ubicación y disponibilidad geográfica">
          <span className="signal-status__dot" aria-hidden="true" />
          SANTO DOMINGO · UTC−4
        </div>
      </div>

      <MissionNavigation locale={locale} worlds={narrativeWorlds} />
    </header>
  );
}
