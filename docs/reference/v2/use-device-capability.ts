"use client";

import { useState } from "react";
import { DeviceCapabilities, detectCapabilities, selectQualityLevel } from "@/lib/performance";

export function useDeviceCapability(): DeviceCapabilities & {
  quality: ReturnType<typeof selectQualityLevel>;
} {
  const [caps] = useState<DeviceCapabilities>(() => detectCapabilities());

  const quality = selectQualityLevel(caps);

  return { ...caps, quality };
}
