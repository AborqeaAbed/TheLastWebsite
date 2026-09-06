'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  const [status, setStatus] = useState('');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    api.mySpots().then(setSpots).catch(() => setSpots([]));
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="manage-title" className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="manage-title">Manage your spot</h2>
        <p className="text-[var(--color-text-secondary)] mt-2 mb-6">Enter the email associated with your spot.</p>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.requestLink(email);
              setStatus('Management link sent. Check your inbox.');
              setError('');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not send link');
            }
          }}
        >
          <label className="field">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          {error ? <p className="error-text" role="alert">⚠ {error}</p> : null}
          {status ? <p className="success-text" role="status">✓ {status}</p> : null}
          <button className="btn-primary" type="submit">SEND ME A MANAGEMENT LINK</button>
        </form>
        {spots.length > 0 && (
          <ul className="mt-8 space-y-4">
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
        )}
      </div>
    </div>
  );
}

function EditSpot({ spot }: { spot: Spot }) {
  const [name, setName] = useState(spot.name || '');
  const [message, setMessage] = useState(spot.message || '');
  const [status, setStatus] = useState('');
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
      <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field">Message<textarea value={message} onChange={(e) => setMessage(e.target.value)} /></label>
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
  const [copied, setCopied] = useState(false);
  const copyAndShare = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
    shareSpot(spot);
  };
  return (
    <div className="share-panel" role="group" aria-label="Share your permanent spot">
      <button
        type="button"
        className={`share-btn share-copy${copied ? ' is-copied' : ''}`}
        onClick={copyAndShare}
        aria-live="polite"
      >
        <span>{copied ? 'COPIED!' : 'COPY LINK & SHARE'}</span>
        <span aria-hidden="true">→</span>
      </button>
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
