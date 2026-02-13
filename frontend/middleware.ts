import { NextRequest, NextResponse } from 'next/server';

/**
 * This project does NOT use Server Actions ("use server").
 *
 * After a redeploy the Next.js build produces new action IDs.
 * Clients still running the old JS bundle may send POST requests with a
 * `Next-Action` header referencing stale IDs, which causes:
 *   [Error: Failed to find Server Action "x". ...]
 *
 * The middleware intercepts these stale requests and responds with a
 * 303 redirect back to the same page, forcing the browser to reload
 * and pick up the fresh assets.
 */
export function middleware(request: NextRequest) {
  if (request.method === 'POST' && request.headers.has('next-action')) {
    return NextResponse.redirect(request.nextUrl, 303);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/).*)'],
};
