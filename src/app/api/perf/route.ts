// src/app/api/perf/route.ts
import { NextResponse } from 'next/server';

const ALLOWED = new Set(['LCP', 'INP', 'CLS', 'TTV', 'VOTE_LATENCY', 'BATCH_REVEAL']);

export async function POST(req: Request) {
  try {
    const text = await req.text();
    if (text.length > 1024) return new NextResponse(null, { status: 413 });

    let m: { name?: unknown; value?: unknown };
    try {
      m = JSON.parse(text);
    } catch {
      return new NextResponse(null, { status: 400 });
    }

    if (
      typeof m.name !== 'string' ||
      !ALLOWED.has(m.name) ||
      typeof m.value !== 'number' ||
      !Number.isFinite(m.value)
    ) {
      return new NextResponse(null, { status: 400 });
    }

    // Telemetry logged or persisted
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
