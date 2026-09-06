'use client';

import { useEffect, useState } from 'react';
import { ShareButtons } from '../../components/Overlays';
import { api } from '../../services/api';

export default function VerifyPage() {
  const [state, setState] = useState<'VERIFYING...' | 'SPOT CLAIMED' | 'ALMOST THERE' | string>('VERIFYING...');
  const [spot, setSpot] = useState<{ spotNumber: number; name?: string; message?: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setState('ALMOST THERE');
      return;
    }
    api.verify(token)
      .then((result) => {
        setState('SPOT CLAIMED');
        if (result.spotNumber) {
          setSpot({ spotNumber: result.spotNumber, name: result.name, message: result.message });
        }
        api.track('email_verification');
        api.track('spot_claimed');
      })
      .catch((err) => setState(err instanceof Error ? err.message : 'This link has expired or has already been used.'));
  }, []);

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <section className="modal-card text-center">
        <p className="tracking-[0.2em] text-sm text-[var(--color-text-secondary)]">{state === 'SPOT CLAIMED' ? 'SPOT CLAIMED' : state}</p>
        {state === 'SPOT CLAIMED' && spot && (
          <>
            <h1 className="mt-4">This place is yours.</h1>
            <p className="spot-number text-2xl mt-6">#{spot.spotNumber.toLocaleString()}</p>
            <p className="text-xl mt-4">“{spot.message}”</p>
            <p className="text-[var(--color-text-secondary)]">— {spot.name}</p>
            <div className="mt-8 flex justify-center"><ShareButtons spot={{ ...spot, x: 0, y: 0, status: 'CLAIMED' }} /></div>
          </>
        )}
        {state === 'ALMOST THERE' && (
          <>
            <h1 className="mt-4">Almost there</h1>
            <p className="mt-4 text-[var(--color-text-secondary)]">We sent a verification link to your email.</p>
            <a className="btn-secondary inline-grid place-items-center mt-8" href="/">BACK TO MAP</a>
          </>
        )}
      </section>
    </main>
  );
}
