import type { WorldId } from "@/content/worlds.data";

export interface NarrativeSectionMetric {
  id: WorldId;
  top: number;
  height: number;
}

export interface NarrativeProgressInput {
  scrollY: number;
  viewportHeight: number;
  documentHeight: number;
  scrollPaddingTop: number;
  sections: readonly NarrativeSectionMetric[];
}

export interface NarrativeProgressSnapshot {
  worldIndex: number;
  worldProgress: number;
  globalProgress: number;
  phase: "hero" | "world";
}

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function getAnchorScrollTop(
  sectionTop: number,
  scrollPaddingTop: number,
) {
  return Math.max(0, sectionTop - scrollPaddingTop);
}

export function calculateNarrativeProgress({
  scrollY,
  viewportHeight,
  documentHeight,
  scrollPaddingTop,
  sections,
}: NarrativeProgressInput): NarrativeProgressSnapshot {
  if (sections.length === 0) {
    return {
      worldIndex: 0,
      worldProgress: 0,
      globalProgress: 0,
      phase: "hero",
    };
  }

  const safeViewportHeight = Math.max(1, viewportHeight);
  const maxScroll = Math.max(1, documentHeight - safeViewportHeight);
  const safeScrollY = Math.min(maxScroll, Math.max(0, scrollY));
  const globalProgress = clampProgress(safeScrollY / maxScroll);
  const firstSection = sections[0];
  const phase =
    safeScrollY + scrollPaddingTop >= firstSection.top - 1
      ? "world"
      : "hero";

  if (globalProgress >= 0.9999) {
    return {
      worldIndex: sections.length - 1,
      worldProgress: 1,
      globalProgress: 1,
      phase: "world",
    };
  }

  const readingLine = safeScrollY + safeViewportHeight * 0.42;
  let worldIndex = 0;
  for (let index = 1; index < sections.length; index += 1) {
    if (readingLine >= sections[index].top) worldIndex = index;
    else break;
  }

  const activeSection = sections[worldIndex];
  const worldProgress = clampProgress(
    (readingLine - activeSection.top) / Math.max(1, activeSection.height),
  );

  return { worldIndex, worldProgress, globalProgress, phase };
}
