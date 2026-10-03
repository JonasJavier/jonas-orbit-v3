import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/*
  `useRouter()` de next/navigation lanza «invariant expected app router to be
  mounted» fuera de una app de Next, y lo usan componentes que viven en todas
  las páginas (`IntentLink` en la cabecera, el mapa). Aquí hay un router de
  mentira por defecto; un test que necesite observar sus llamadas declara el
  suyo con `vi.mock("next/navigation", …)` y ése manda.
*/
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  };
  return { ...actual, useRouter: () => router };
});
