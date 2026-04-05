import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from '../_jwt';

const BACKEND_URL = process.env.BACKEND_URL || 'http://api:3001';

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
  } catch {
    // Backend unavailable — fall through to JWT decode
  }

  // Fallback: decode JWT locally if backend is unreachable
  const payload = decodeJwt(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: { id: payload.sub, role: payload.role } }, { status: 200 });
}
