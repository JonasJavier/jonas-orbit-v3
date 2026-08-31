import type { CSSProperties, ReactNode } from "react";
import type { WorldNavItem } from "@/lib/worlds";
import styles from "./flat-world-body.module.css";

type FlatWorld = Pick<
  WorldNavItem,
  "id" | "visual" | "accent" | "secondary"
>;

const ENDURANCE_MODULE_ANGLES = [
  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330,
] as const;

function Tesseract() {
  return (
    <svg viewBox="0 0 120 120" focusable="false">
      <defs>
        <radialGradient id="flat-tesseract-core">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.28" stopColor="var(--flat-accent)" stopOpacity="0.72" />
          <stop offset="1" stopColor="var(--flat-secondary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="flat-tesseract-edge" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--flat-secondary)" stopOpacity="0.35" />
          <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--flat-accent)" stopOpacity="0.42" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="34" fill="url(#flat-tesseract-core)" opacity="0.3" />
      <g
        fill="none"
        stroke="url(#flat-tesseract-edge)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path data-flat-part="outer-frame" d="M60 8 107 36 99 94 41 111 8 68 24 20Z" />
        <path d="m60 8-7 39 46 47M107 36 72 54 41 111M8 68l45-21 19 7 27 40M24 20l29 27" opacity="0.72" />
        <path d="m60 28 30 18-5 37-37 11-21-28 10-31Z" strokeWidth="1.4" />
        <path d="m60 28-5 25 30 30M90 46 67 58 48 94M27 66l28-13 12 5 18 25M37 35l18 18" opacity="0.86" />
        <path d="m60 45 16 10-3 20-20 6-12-15 6-17Z" strokeWidth="1.2" />
      </g>
      <circle data-flat-part="core" cx="59" cy="62" r="10" fill="url(#flat-tesseract-core)" />
      <circle cx="59" cy="62" r="1.6" fill="#fff" />
    </svg>
  );
}

function CooperStation() {
  return (
    <svg viewBox="0 0 180 110" focusable="false">
      <defs>
        <radialGradient id="flat-cooper-planet" cx="34%" cy="27%" r="72%">
          <stop offset="0" stopColor="#dcecff" />
          <stop offset="0.28" stopColor="var(--flat-secondary)" />
          <stop offset="0.68" stopColor="#30415d" />
          <stop offset="1" stopColor="#070b14" />
        </radialGradient>
        <linearGradient id="flat-cooper-ring" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="var(--flat-secondary)" stopOpacity="0" />
          <stop offset="0.2" stopColor="#d9e8f5" stopOpacity="0.56" />
          <stop offset="0.54" stopColor="var(--flat-accent)" stopOpacity="0.8" />
          <stop offset="0.86" stopColor="#f1f6ff" stopOpacity="0.44" />
          <stop offset="1" stopColor="var(--flat-secondary)" stopOpacity="0" />
        </linearGradient>
        <clipPath id="flat-cooper-disc">
          <circle cx="88" cy="55" r="29" />
        </clipPath>
      </defs>

      <path
        data-flat-part="rear-ring"
        d="M13 65C42 30 130 22 167 45"
        fill="none"
        stroke="url(#flat-cooper-ring)"
        strokeWidth="5"
      />
      <path d="M17 69C54 38 130 31 165 47" fill="none" stroke="#dce9f4" strokeOpacity="0.2" />
      <circle data-flat-part="planet" cx="88" cy="55" r="29" fill="url(#flat-cooper-planet)" />
      <g clipPath="url(#flat-cooper-disc)" fill="none" stroke="#b7d8ed" strokeOpacity="0.17">
        <path d="M55 43c15 7 37 8 67-2" />
        <path d="M53 51c20 8 45 8 70-2" />
        <path d="M55 63c17 5 39 5 64-2" />
      </g>
      <path
        data-flat-part="front-ring"
        d="M13 65C51 91 137 84 167 45"
        fill="none"
        stroke="url(#flat-cooper-ring)"
        strokeWidth="5"
      />
      <path d="M18 67C55 86 133 78 163 47" fill="none" stroke="#fff" strokeOpacity="0.32" />

      <g data-flat-part="habitat" transform="translate(145 49) rotate(-10)">
        <ellipse cx="0" cy="0" rx="8" ry="3.5" fill="#080c13" stroke="var(--flat-accent)" strokeWidth="1" />
        <path d="M-6 0H6M0-7V7" stroke="#dcebf7" strokeOpacity="0.8" />
        <circle cx="0" cy="0" r="1.7" fill="#fff" />
      </g>
    </svg>
  );
}

function Miller() {
  return (
    <svg viewBox="0 0 120 120" focusable="false">
      <defs>
        <radialGradient id="flat-miller-ocean" cx="30%" cy="22%" r="78%">
          <stop offset="0" stopColor="#dffaff" />
          <stop offset="0.23" stopColor="var(--flat-accent)" />
          <stop offset="0.62" stopColor="#163b5d" />
          <stop offset="1" stopColor="#030812" />
        </radialGradient>
        <clipPath id="flat-miller-disc">
          <circle cx="60" cy="60" r="39" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="42" fill="none" stroke="var(--flat-secondary)" strokeOpacity="0.2" strokeWidth="3" />
      <circle data-flat-part="planet" cx="60" cy="60" r="39" fill="url(#flat-miller-ocean)" />
      <g data-flat-part="ocean" clipPath="url(#flat-miller-disc)" fill="none" strokeLinecap="round">
        <path d="M8 43c18-7 28 9 47 1s33-9 58 1" stroke="#e9fdff" strokeOpacity="0.48" strokeWidth="2.2" />
        <path d="M2 57c22-8 32 8 50 1s38-10 69 1" stroke="#87e8ff" strokeOpacity="0.42" strokeWidth="1.8" />
        <path d="M4 72c20-7 32 7 50 1s36-7 67 1" stroke="#c7f5ff" strokeOpacity="0.27" strokeWidth="1.5" />
        <path d="M14 85c14-5 27 4 43 0s33-5 52 0" stroke="#8dd9ee" strokeOpacity="0.2" />
      </g>
      <path d="M36 31c9-9 21-12 33-9" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity="0.58" strokeWidth="3" />
      <path d="M30 91c20 12 49 10 64-9" fill="none" stroke="var(--flat-accent)" strokeOpacity="0.3" strokeWidth="2" />
    </svg>
  );
}

function Endurance() {
  return (
    <svg viewBox="0 0 150 150" focusable="false">
      <defs>
        <linearGradient id="flat-endurance-hull" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="0.34" stopColor="#c9cdd0" />
          <stop offset="0.72" stopColor="#777d83" />
          <stop offset="1" stopColor="#272d33" />
        </linearGradient>
        <radialGradient id="flat-endurance-hub">
          <stop stopColor="#e9edf0" />
          <stop offset="0.58" stopColor="#70777e" />
          <stop offset="1" stopColor="#12171c" />
        </radialGradient>
      </defs>
      <g transform="rotate(-18 75 75)">
        <circle cx="75" cy="75" r="54" fill="none" stroke="#77828a" strokeOpacity="0.32" strokeWidth="2.2" />
        <path
          data-flat-part="spoke"
          d="M75 75V28"
          fill="none"
          stroke="#d7dcdf"
          strokeWidth="4.2"
        />
        <path d="M72 72V31M78 72V31" fill="none" stroke="#252c31" strokeWidth="1" />

        {ENDURANCE_MODULE_ANGLES.map((angle) => (
          <g
            data-flat-part="module"
            key={angle}
            transform={`rotate(${angle} 75 75)`}
          >
            <rect x="63" y="12" width="24" height="16" rx="2.5" fill="url(#flat-endurance-hull)" stroke="#f4f1e8" strokeOpacity="0.55" />
            <path d="M67 15v10M72 14v12M81 14v12" stroke="#333a40" strokeOpacity="0.55" strokeWidth="0.8" />
            <rect x="72.5" y="12" width="5" height="2.6" rx="0.6" fill="var(--flat-accent)" opacity="0.75" />
          </g>
        ))}

        <circle cx="75" cy="75" r="12" fill="url(#flat-endurance-hub)" stroke="#e8ecee" strokeOpacity="0.7" />
        <circle cx="75" cy="75" r="5" fill="#090d11" stroke="var(--flat-secondary)" strokeOpacity="0.45" />
        <g data-flat-part="docked-craft" fill="#d9dee0" stroke="#151a1e" strokeWidth="0.8">
          <path d="m54 72 14-5v8l-14 3-7-3Z" />
          <path d="m96 78-14 5v-8l14-3 7 3Z" />
          <rect x="71" y="84" width="8" height="15" rx="2" />
          <rect x="71" y="51" width="8" height="15" rx="2" />
        </g>
        <g data-flat-part="engine-bank" fill="#090d11" stroke="#bfc6ca" strokeWidth="0.7">
          <circle cx="43.2" cy="31.3" r="2.4" />
          <circle cx="118.7" cy="43.2" r="2.4" />
          <circle cx="106.8" cy="118.7" r="2.4" />
          <circle cx="31.3" cy="106.8" r="2.4" />
        </g>
      </g>
    </svg>
  );
}

function Edmunds() {
  return (
    <svg viewBox="0 0 120 120" focusable="false">
      <defs>
        <radialGradient id="flat-edmunds-terrain" cx="31%" cy="25%" r="76%">
          <stop offset="0" stopColor="#ffd3a3" />
          <stop offset="0.28" stopColor="var(--flat-secondary)" />
          <stop offset="0.64" stopColor="var(--flat-accent)" />
          <stop offset="1" stopColor="#24100d" />
        </radialGradient>
        <clipPath id="flat-edmunds-disc">
          <circle cx="60" cy="60" r="39" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="42" fill="none" stroke="var(--flat-secondary)" strokeOpacity="0.22" strokeWidth="3" />
      <circle data-flat-part="planet" cx="60" cy="60" r="39" fill="url(#flat-edmunds-terrain)" />
      <g data-flat-part="terrain" clipPath="url(#flat-edmunds-disc)">
        <path d="M17 76c16-18 26-5 39-20s25-7 47-24l17 51-20 24-73-3Z" fill="#4c201a" fillOpacity="0.34" />
        <path d="M22 80c12-9 25-5 35-15s28-10 43-23" fill="none" stroke="#f8b078" strokeOpacity="0.4" strokeWidth="2" />
        <path d="M31 91c18-15 28-3 48-19 8-7 15-8 26-10" fill="none" stroke="#2f1312" strokeOpacity="0.46" strokeWidth="3" />
        <ellipse cx="48" cy="43" rx="9" ry="5" fill="#5a2a22" fillOpacity="0.42" />
        <ellipse cx="76" cy="55" rx="5" ry="3" fill="#2a1110" fillOpacity="0.35" />
        <ellipse cx="52" cy="84" rx="6" ry="3.5" fill="#2a1110" fillOpacity="0.28" />
      </g>
      <path d="M34 32c12-10 26-12 40-7" fill="none" stroke="#fff3d9" strokeLinecap="round" strokeOpacity="0.45" strokeWidth="2.7" />
    </svg>
  );
}

function Ranger() {
  return (
    <svg viewBox="0 0 160 90" focusable="false">
      <defs>
        <linearGradient id="flat-ranger-hull" x1="0" y1="0" x2="0.9" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="0.46" stopColor="#bec4c8" />
          <stop offset="0.78" stopColor="#5d666d" />
          <stop offset="1" stopColor="#1a2025" />
        </linearGradient>
      </defs>
      <g data-flat-part="lifting-body" transform="rotate(-5 80 45)">
        <path
          d="M11 55 50 30 70 23h20l20 7 39 25-48-7-16 15H75L59 48Z"
          fill="url(#flat-ranger-hull)"
          stroke="#eef2f3"
          strokeOpacity="0.74"
        />
        <path d="m20 53 39-17 16-6h10l16 6 39 17-39-7-17 10h-8L59 46Z" fill="#d8dde0" fillOpacity="0.44" />
        <path data-flat-part="heat-shield" d="m45 51 30-10h10l30 10-26 10H71Z" fill="#0a0f14" opacity="0.9" />
        <path d="m73 31 7-6 7 6-3 13h-8Z" fill="#283139" stroke="#c7d3da" strokeOpacity="0.6" />
        <path d="M37 47h20M103 47h20M68 38h24" stroke="#30383e" strokeOpacity="0.62" />
        <g data-flat-part="engines" fill="#05080b" stroke="#b7c1c7" strokeWidth="0.8">
          <ellipse cx="68" cy="58" rx="5" ry="2.3" />
          <ellipse cx="92" cy="58" rx="5" ry="2.3" />
        </g>
        <circle data-flat-part="beacon" cx="80" cy="24" r="1.8" fill="var(--flat-accent)" />
      </g>
    </svg>
  );
}

const DRAWINGS: Partial<Record<WorldNavItem["visual"], () => ReactNode>> = {
  tesseract: Tesseract,
  station: CooperStation,
  water: Miller,
  ship: Endurance,
  desert: Edmunds,
  beacon: Ranger,
};

/**
 * Representación estática de un destino para el perfil `flat`.
 *
 * Vive dentro del mismo slot DOM que el proxy interactivo, por lo que hereda
 * posición y target sin inventar otro mapa. Gargantúa se omite porque ya la
 * pinta SiteBackdrop. La capa completa es decorativa y no recibe puntero.
 */
export function FlatWorldBody({ world }: { world: FlatWorld }) {
  const Drawing = DRAWINGS[world.visual];
  if (!Drawing) return null;

  return (
    <span
      aria-hidden="true"
      className={`${styles.body} ${styles[world.visual]}`}
      data-flat-visual={world.visual}
      data-flat-world={world.id}
      style={
        {
          "--flat-accent": world.accent,
          "--flat-secondary": world.secondary,
        } as CSSProperties
      }
    >
      <Drawing />
    </span>
  );
}
