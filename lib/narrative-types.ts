import type { WorldId } from "@/content/worlds.data";
import type { World } from "@/lib/worlds";

export interface NarrativeWorldSummary {
  id: WorldId;
  order: number;
  accent: string;
  cosmicName: string;
  slug: string;
  shortLabel: string;
}

export function getNarrativeWorldSummaries(
  worlds: readonly World[],
): NarrativeWorldSummary[] {
  return worlds.map((world) => ({
    id: world.id,
    order: world.order,
    accent: world.accent,
    cosmicName: world.cosmicName,
    slug: world.prose.slug,
    shortLabel: world.prose.shortLabel,
  }));
}
