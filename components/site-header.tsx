import Link from "next/link";
import type { Locale } from "@/content/site.data";
import type { WorldId } from "@/content/worlds.data";
import type { WorldNavItem } from "@/lib/worlds";
import { MissionNavigation } from "./mission-navigation";

export function SiteHeader({
  locale,
  worlds,
  activeWorldId,
}: {
  locale: Locale;
  worlds: readonly WorldNavItem[];
  activeWorldId?: WorldId;
}) {
  return (
    <header className="site-header">
      <div className="site-header__bar">
        <Link
          className="brand-lockup"
          href={`/${locale}`}
          aria-label="Jonás Orbit, inicio"
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>
            <strong>JONÁS ORBIT</strong>
            <small>FULL-STACK · VISUAL SYSTEMS</small>
          </span>
        </Link>

        <div
          className="signal-status"
          aria-label="Ubicación y disponibilidad geográfica"
        >
          <span className="signal-status__dot" aria-hidden="true" />
          SANTO DOMINGO · UTC−4
        </div>
      </div>

      <MissionNavigation worlds={worlds} activeWorldId={activeWorldId} />
    </header>
  );
}
