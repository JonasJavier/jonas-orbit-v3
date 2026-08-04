import { NextResponse } from "next/server";
import {
  getPublicContactConfig,
  handleContactRequest,
  readContactBindings,
} from "@/lib/contact-server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

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
  const result = await handleContactRequest(request);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}
