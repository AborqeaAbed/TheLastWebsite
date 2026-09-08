'use client';

import { FormEvent, useState } from 'react';
import { ShareButtons } from '../../components/Overlays';
import { api } from '../../services/api';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'claimed'>('email');
  const [spot, setSpot] = useState<{ spotNumber: number; name?: string; message?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.verifyCode(email, code, 'CLAIM');
      setStep('claimed');
      if (result.spotNumber) {
        setSpot({ spotNumber: result.spotNumber, name: result.name, message: result.message });
      }
      api.track('email_verification');
      api.track('spot_claimed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <section className="modal-card text-center max-w-md w-full">

        {step === 'email' && (
          <>
            <p className="tracking-[0.2em] text-sm text-[var(--color-text-secondary)]">ALMOST THERE</p>
            <h1 className="mt-4">Verify your spot</h1>
            <p className="mt-3 text-[var(--color-text-secondary)]">We sent a 6-digit code to your email. Enter your email to continue.</p>
            <form className="mt-8" onSubmit={(e) => { e.preventDefault(); if (email) setStep('code'); }}>
              <div className="email-inline-row">
                <input
                  type="email"
                  className="email-inline-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
                <button className="email-inline-btn" type="submit">
                  NEXT
                </button>
              </div>
            </form>
            <a className="btn-secondary inline-grid place-items-center mt-4" href="/">BACK TO MAP</a>
          </>
        )}

        {step === 'code' && (
          <>
            <p className="tracking-[0.2em] text-sm text-[var(--color-text-secondary)]">CHECK YOUR INBOX</p>
            <h1 className="mt-4">Enter your code</h1>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Enter the 6-digit code sent to <strong>{email}</strong>.
            </p>
            <form className="flex flex-col gap-4 mt-8 text-left" onSubmit={submitCode}>
              <label className="field">
                Verification Code
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  autoFocus
                />
              </label>
              {error ? <p className="error-text" role="alert">⚠ {error}</p> : null}
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'VERIFYING...' : 'VERIFY & CLAIM SPOT'}
              </button>
            </form>
            <button
              className="btn-secondary inline-grid place-items-center mt-4 w-full"
              type="button"
              onClick={() => { setStep('email'); setError(''); setCode(''); }}
            >
              USE A DIFFERENT EMAIL
            </button>
          </>
        )}

        {step === 'claimed' && spot && (
          <>
            <p className="tracking-[0.2em] text-sm text-[var(--color-text-secondary)]">SPOT CLAIMED</p>
            <h1 className="mt-4">This place is yours.</h1>
            <p className="spot-number text-2xl mt-6">#{spot.spotNumber.toLocaleString()}</p>
            <p className="text-xl mt-4">"{spot.message}"</p>
            <p className="text-[var(--color-text-secondary)]">— {spot.name}</p>
            <div className="mt-8 flex justify-center">
              <ShareButtons spot={{ ...spot, x: 0, y: 0, status: 'CLAIMED' }} />
            </div>
          </>
        )}

      </section>
    </main>
  );
}
