import Link from "next/link";
import type { Locale } from "@/content/site.data";
import type { World } from "@/lib/worlds";

export function SiteHeader({
  locale,
  worlds,
}: {
  locale: Locale;
  worlds: World[];
}) {
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

      <nav className="mission-nav" aria-label="Navegación de mundos">
        <ol>
          {worlds.map((world) => (
            <li key={world.id}>
              <Link href={`/${locale}#${world.prose.slug}`}>
                <span aria-hidden="true">{String(world.order).padStart(2, "0")}</span>
                {world.prose.shortLabel}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}
