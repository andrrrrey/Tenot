export function decodeJwt(token: string): any | null {
  try {
    const part = token.split('.')[1];
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(json);

    // Decoding is only used as a temporary fallback when the API is
    // unavailable. Never restore a session from an expired token.
    if (typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
