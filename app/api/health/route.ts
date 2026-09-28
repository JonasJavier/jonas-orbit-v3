import { isProductionContactReady, readContactBindings } from "@/lib/contact-server";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export function GET() {
  const ok = isProductionContactReady(readContactBindings(), SITE_URL);
  return Response.json(
    { ok },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
