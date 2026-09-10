import type { Spot, Stats, ViewportResponse } from '../types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = 'Something went wrong. Your spot is still safe. Please try again.';
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export const api = {
  stats: () => json<Stats>('/api/spots/stats'),
  viewport: (q: { minX: number; maxX: number; minY: number; maxY: number; zoom: number }) =>
    json<ViewportResponse>(`/api/spots/viewport?minX=${q.minX}&maxX=${q.maxX}&minY=${q.minY}&maxY=${q.maxY}&zoom=${q.zoom}`),
  spot: (n: number) => json<Spot>(`/api/spots/${n}`),
  random: () => json<Spot>('/api/spots/random'),
  latest: () => json<Spot[]>('/api/spots/latest'),
  search: (q: string) => json<Spot[]>(`/api/spots/search?q=${encodeURIComponent(q)}`),
  reserve: (spotNumber: number) =>
    json<{ spotNumber: number; status: string; reservedUntil: string }>(`/api/spots/${spotNumber}/reserve`, {
      method: 'POST',
    }),
  release: (spotNumber: number) =>
    json<{ spotNumber: number; status: string }>(`/api/spots/${spotNumber}/release`, {
      method: 'POST',
    }),
  checkout: (spotNumber: number, body: { name: string; message: string; email: string; provider: 'STRIPE' | 'PAYPAL' }) =>
    json<{ sessionId: string; url: string; mocked: boolean; provider: string }>(`/api/payments/create-checkout/${spotNumber}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  requestCode: (email: string) =>
    json('/api/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) }),
  resendClaimCode: (email: string) =>
    json('/api/auth/resend-claim-code', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyCode: (email: string, code: string, purpose: string) =>
    json<{ verified: boolean; spotNumber?: number; name?: string; message?: string }>('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code, purpose }),
    }),
  me: () => json<{ email: string; verified: boolean }>('/api/me'),
  mySpots: () => json<Spot[]>('/api/me/spots'),
  updateSpot: (n: number, body: { name: string; message: string }) =>
    json<Spot>(`/api/me/spots/${n}`, { method: 'PUT', body: JSON.stringify(body) }),
  track: (eventName: string, metadata?: string) =>
    fetch(`${API}/api/analytics`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, metadata }),
    }).catch(() => undefined),
};
