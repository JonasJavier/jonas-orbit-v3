import type { Metadata } from "next";
import { PrivacyPage, privacyMetadata } from "@/components/privacy-page";

/** `/en/privacy`: la hermana de `/es/privacidad` (ver esa ruta). */
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "en" }];
}

export const metadata: Metadata = privacyMetadata("en");

export default function PrivacyRoute() {
  return <PrivacyPage locale="en" />;
}
