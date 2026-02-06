import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from '../_jwt';

const BACKEND_URL = process.env.BACKEND_URL || 'http://api:3001';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const token = data.access_token as string | undefined;
  const payload = token ? decodeJwt(token) : null;

  const out = NextResponse.json(
    {
      ok: true,
      user: payload ? { id: payload.sub, role: payload.role } : null,
    },
    { status: 200 },
  );

  if (token) {
    out.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return out;
}
