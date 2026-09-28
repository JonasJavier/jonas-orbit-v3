import { NextResponse } from "next/server";
import {
  getContactRuntimeMode,
  getPublicContactConfig,
  handleContactRequest,
  readContactBindings,
} from "@/lib/contact-server";
import { clientAddress, createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

// Mismo contrato que la regla de `infra/cloudflare/`: 5 POST por minuto e IP,
// bloqueo de 10 minutos. El modo `test` (e2e, CI) no cuenta: no entrega nada.
const contactRateLimit = createRateLimiter({
  limit: 5,
  windowMs: 60_000,
  blockMs: 600_000,
});

export async function GET() {
  try {
    const config = getPublicContactConfig(readContactBindings());
    return NextResponse.json(config, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, code: "configuration" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  const bindings = readContactBindings();

  if (getContactRuntimeMode(bindings) !== "test") {
    const decision = contactRateLimit.consume(
      clientAddress(request.headers) ?? "unknown",
    );
    if (!decision.allowed) {
      return NextResponse.json(
        { ok: false, code: "rate_limited" },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            "retry-after": String(decision.retryAfterSeconds),
          },
        },
      );
    }
  }

  const result = await handleContactRequest(request, bindings);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}
