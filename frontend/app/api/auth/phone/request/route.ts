import { NextRequest, NextResponse } from 'next/server';
import { clientHeaders } from '../../../_client-headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://api:3001';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${BACKEND_URL}/auth/phone/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...clientHeaders(req) },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
