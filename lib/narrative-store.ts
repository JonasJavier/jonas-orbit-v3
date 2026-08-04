import { create } from "zustand";
import type { WorldId } from "@/content/worlds.data";

export interface NarrativeStoreState {
  worldIndex: number;
  worldId: WorldId;
  worldProgress: number;
  globalProgress: number;
  phase: "hero" | "world";
}

const INITIAL_NARRATIVE_STATE: NarrativeStoreState = {
  worldIndex: 0,
  worldId: "tesseract",
  worldProgress: 0,
  globalProgress: 0,
  phase: "hero",
};

export const useNarrativeStore = create<NarrativeStoreState>()(
  () => INITIAL_NARRATIVE_STATE,
);

export function publishNarrativeProgress(state: NarrativeStoreState) {
  useNarrativeStore.setState(state);
}

export function resetNarrativeProgress() {
  useNarrativeStore.setState(INITIAL_NARRATIVE_STATE, true);
}
