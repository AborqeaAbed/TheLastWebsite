'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ShareButtons } from '../../components/Overlays';
import { api } from '../../services/api';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'claimed'>('email');
  const [pendingSpotNumber, setPendingSpotNumber] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const spotParam = params.get('spot');
    if (spotParam) {
      const parsed = parseInt(spotParam, 10);
      if (!isNaN(parsed)) setPendingSpotNumber(parsed);
    }
    if (emailParam) {
      setEmail(emailParam);
      setStep('code');
    }
  }, []);
  const [spot, setSpot] = useState<{ spotNumber: number; name?: string; message?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const resendCode = async () => {
    setResending(true);
    setResendStatus('');
    setError('');
    try {
      await api.resendClaimCode(email);
      setResendStatus('A new code is on its way.');
    } catch (err) {
      setResendStatus(err instanceof Error ? err.message : 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

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
    <>
    <main className="min-h-screen grid place-items-center px-6">
      <section className="modal-card text-center max-w-md w-full relative">
        {step === 'code' && (
          <button
            type="button"
            className="absolute top-4 right-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors text-xl leading-none"
            onClick={() => setConfirmingClose(true)}
            aria-label="Close"
            title="Close (or press Esc)"
          >
            ✕
          </button>
        )}

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
            <h1 className="mt-4">{pendingSpotNumber ? `Claim Spot #${pendingSpotNumber.toLocaleString()}` : 'Verify your spot'}</h1>
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
              <p className="text-sm text-[var(--color-text-secondary)] text-center">
                Didn&apos;t get a code?{' '}
                <button type="button" className="resend-link" onClick={resendCode} disabled={resending}>
                  {resending ? 'Sending...' : 'Resend'}
                </button>
              </p>
              {resendStatus ? <p className="text-sm text-[var(--color-text-secondary)] -mt-2" role="status">{resendStatus}</p> : null}
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

      </section>
    </main>

    {confirmingClose && (
      <div className="confirm-dialog-backdrop" onClick={() => setConfirmingClose(false)}>
        <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
          <p className="confirm-dialog-title">Close without verifying?</p>
          <p className="confirm-dialog-message">Your payment is saved — you can finish claiming later using the code emailed to you. Closing now won&apos;t lose your spot, but it won&apos;t be claimed yet.</p>
          <div className="confirm-dialog-actions">
            <button className="btn-secondary btn-sm" onClick={() => setConfirmingClose(false)}>KEEP VERIFYING</button>
            <button className="btn-primary btn-sm" onClick={() => { window.location.href = '/'; }}>CLOSE ANYWAY</button>
          </div>
        </div>
      </div>
    )}

    {step === 'claimed' && spot && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={(e) => { if (e.target === e.currentTarget) window.location.href = '/'; }}
      >
        <section className="modal-card text-center max-w-md w-full relative">
          <button
            className="absolute top-4 right-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors text-xl leading-none"
            onClick={() => window.location.href = '/'}
            aria-label="Close"
          >
            ✕
          </button>
          <p className="tracking-[0.2em] text-sm text-[var(--color-text-secondary)]">SPOT CLAIMED</p>
          <h1 className="mt-4">This place is yours.</h1>
          <p className="spot-number text-2xl mt-6">#{spot.spotNumber.toLocaleString()}</p>
          {spot.message && <p className="text-xl mt-4">"{spot.message}"</p>}
          {spot.name && <p className="text-[var(--color-text-secondary)]">— {spot.name}</p>}
          <div className="mt-8 flex justify-center">
            <ShareButtons spot={{ ...spot, x: 0, y: 0, status: 'CLAIMED' }} />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <a
              className="btn-primary inline-grid place-items-center"
              href={`/?spot=${spot.spotNumber}`}
            >
              VIEW MY SPOT
            </a>
          </div>
        </section>
      </div>
    )}
    </>
  );
}
