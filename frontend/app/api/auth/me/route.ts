import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from '../_jwt';

const BACKEND_URL = process.env.BACKEND_URL || 'http://api:3001';

function unauthenticatedResponse() {
  const response = NextResponse.json({ user: null }, { status: 200 });
  response.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 200 });

  // Fetch the current role from the database via backend,
  // so role changes (e.g. promotion to ADMIN) take effect immediately
  try {
    const res = await fetch(`${BACKEND_URL}/users/me`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const profile = await res.json();
      return NextResponse.json({ user: { id: profile.id, role: profile.role, avatarUrl: profile.avatarUrl || null, name: profile.name || profile.email || null } }, { status: 200 });
    }

    // The API is authoritative for authentication. An expired, revoked or
    // otherwise invalid token must not be decoded back into a live session.
    if (res.status === 401 || res.status === 403) {
      return unauthenticatedResponse();
    }
  } catch {
    // Backend unavailable — fall through to JWT decode
  }

  // Fallback for a temporary backend failure. decodeJwt rejects expired JWTs.
  const payload = decodeJwt(token);
  if (!payload) return unauthenticatedResponse();
  return NextResponse.json({ user: { id: payload.sub, role: payload.role } }, { status: 200 });
}
