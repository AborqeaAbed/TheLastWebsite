'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { numberToXY } from '../map/camera';
import type { Spot } from '../types';

export function SearchOverlay({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (spot: Spot) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Spot[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const goToQuery = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const numeric = Number(trimmed.replace(/[#, ]/g, ''));
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 1_000_000) {
      const coords = numberToXY(numeric);
      try {
        onSelect(await api.spot(numeric));
      } catch {
        onSelect({
          spotNumber: numeric,
          x: coords.x,
          y: coords.y,
          status: 'AVAILABLE',
        });
      }
      return;
    }
    try {
      const found = await api.search(trimmed);
      setResults(found);
      setError(found.length ? '' : 'No matching spots.');
      if (found[0]) onSelect(found[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !q.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        setResults(await api.search(q));
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [q, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Search spots" className="modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <label className="field">
          Search spots, names or messages...
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              goToQuery(q);
            }}
          >
            <div className="search-shell">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search #18472, a name, or a message" />
            </div>
          </form>
        </label>
        {error ? <p className="error-text" role="alert">⚠ {error}</p> : null}
        {loading ? (
          <div className="mt-6 space-y-3" aria-hidden="true">
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : null}
        {!loading && q && results.length === 0 && !error ? (
          <p className="mt-6 text-[var(--color-text-secondary)]">No matching spots. Try a number, name, or word from a message.</p>
        ) : null}
        <ul className="mt-6 space-y-3">
          {results.map((spot) => (
            <li key={spot.spotNumber}>
              <button className="result-item" onClick={() => onSelect(spot)}>
                <div className="spot-number">#{spot.spotNumber.toLocaleString()}</div>
                <div>{spot.name || 'AVAILABLE'}</div>
                <div className="text-[var(--color-text-secondary)]">{spot.message}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ManageSpot({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'checking' | 'email' | 'code' | 'verified'>('email');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('email');
      setEmail('');
      setCode('');
      setSpots([]);
      setError('');
      setConfirmingClose(false);
      return;
    }
    // Reuse the session from a recent verification instead of asking again every time.
    let cancelled = false;
    setStep('checking');
    api.mySpots()
      .then((mySpots) => {
        if (cancelled) return;
        setSpots(mySpots);
        setStep('verified');
      })
      .catch(() => {
        if (cancelled) return;
        setStep('email');
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (step === 'verified') {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  };

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.requestCode(email);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.verifyCode(email, code, 'MANAGE');
      const mySpots = await api.mySpots();
      setSpots(mySpots);
      setStep('verified');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal title="Manage your spot" onClose={handleClose} scrollable wide>
        {step === 'checking' && (
          <div className="space-y-3" aria-hidden="true">
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}
        {step === 'email' && (
          <>
            <p className="text-[var(--color-text-secondary)] mb-6">Enter the email associated with your spot.</p>
            <form onSubmit={requestCode}>
              <div className="email-inline-row">
                <input
                  type="email"
                  className="email-inline-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                <button className="email-inline-btn" type="submit" disabled={loading}>
                  {loading ? '...' : 'SEND CODE'}
                </button>
              </div>
              {error ? <p className="error-text mt-3" role="alert">⚠ {error}</p> : null}
            </form>
          </>
        )}

        {step === 'code' && (
          <>
            <p className="text-[var(--color-text-secondary)] mb-6">
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
            </p>
            <form className="flex flex-col gap-4" onSubmit={verifyCode}>
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
                {loading ? 'VERIFYING...' : 'VERIFY CODE'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setStep('email'); setError(''); setCode(''); }}
              >
                USE A DIFFERENT EMAIL
              </button>
            </form>
          </>
        )}

        {step === 'verified' && (
          spots.length === 0 ? (
            <p className="text-[var(--color-text-secondary)]">No claimed spots found for this email.</p>
          ) : (
            <ul className="space-y-4">
              {spots.map((spot) => (
                <li key={spot.spotNumber} className="claim-preview">
                  <div className="flex items-center justify-between gap-3">
                    <div className="spot-number">#{spot.spotNumber.toLocaleString()}</div>
                    <span className="status-badge">CLAIMED</span>
                  </div>
                  <EditSpot spot={spot} />
                </li>
              ))}
            </ul>
          )
        )}
      </Modal>

      {confirmingClose && (
        <div className="confirm-dialog-backdrop" onClick={() => setConfirmingClose(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-title">Close without saving?</p>
            <p className="confirm-dialog-message">Any unsaved changes will be lost.</p>
            <div className="confirm-dialog-actions">
              <button className="btn-secondary btn-sm" onClick={() => setConfirmingClose(false)}>KEEP EDITING</button>
              <button className="btn-primary btn-sm" onClick={() => { setConfirmingClose(false); onClose(); }}>CLOSE ANYWAY</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditSpot({ spot }: { spot: Spot }) {
  const [name, setName] = useState(spot.name || '');
  const [message, setMessage] = useState(spot.message || '');
  const [status, setStatus] = useState('');
  const nameLeft = 80 - name.length;
  const messageLeft = 200 - message.length;
  return (
    <form
      className="flex flex-col gap-3 mt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.updateSpot(spot.spotNumber, { name, message });
          setStatus('Saved.');
        } catch (err) {
          setStatus(err instanceof Error ? err.message : 'Could not save');
        }
      }}
    >
      <label className="field">
        Name
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <span className={`field-meta${nameLeft < 10 ? ' limit' : nameLeft < 20 ? ' warn' : ''}`}>{nameLeft} left</span>
      </label>
      <label className="field">
        Message
        <textarea value={message} maxLength={200} rows={2} onChange={(e) => setMessage(e.target.value)} />
        <span className={`field-meta${messageLeft < 15 ? ' limit' : messageLeft < 30 ? ' warn' : ''}`}>{messageLeft} left</span>
      </label>
      <button className="btn-secondary" type="submit">SAVE CHANGES</button>
      {status ? <p role="status">{status}</p> : null}
    </form>
  );
}

export function shareSpot(spot: Spot) {
  const url = `${window.location.origin}/spot/${spot.spotNumber}`;
  const text = `I just claimed my permanent spot on the Internet. Spot #${spot.spotNumber}. Find yours.`;
  if (navigator.share) {
    navigator.share({ title: 'The Last Website', text, url }).catch(() => undefined);
    return;
  }
  navigator.clipboard.writeText(url);
}

export function ShareButtons({
  spot,
  onView,
  onDone,
}: {
  spot: Spot;
  onView?: () => void;
  onDone?: () => void;
}) {
  const url = useMemo(() => (typeof window === 'undefined' ? '' : `${window.location.origin}/spot/${spot.spotNumber}`), [spot.spotNumber]);
  const text = encodeURIComponent(`I just claimed my permanent spot on the Internet. Spot #${spot.spotNumber}. Find yours.`);
  return (
    <div className="share-panel" role="group" aria-label="Share your permanent spot">
      <p className="share-quick-label">Share to</p>
      <div className="share-icons">
        <a className="share-icon-btn share-x" href={`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`} aria-label="Share on X">𝕏</a>
        <a className="share-icon-btn share-fb" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} aria-label="Share on Facebook">f</a>
        <a className="share-icon-btn share-wa" href={`https://wa.me/?text=${text}%20${encodeURIComponent(url)}`} aria-label="Share on WhatsApp">💬</a>
        <button type="button" className="share-icon-btn share-more" onClick={() => shareSpot(spot)} aria-label="More ways to share">↗</button>
      </div>
      {(onView || onDone) && (
        <div className="share-secondary">
          {onView ? <button type="button" className="share-view" onClick={onView}>View my spot</button> : null}
          {onDone ? <button type="button" className="share-done" onClick={onDone}>Done</button> : null}
        </div>
      )}
    </div>
  );
}
