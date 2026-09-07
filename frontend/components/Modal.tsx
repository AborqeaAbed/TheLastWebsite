'use client';

import { FormEvent, ReactNode, useEffect, useId, useRef, useState } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  scrollable?: boolean;
}

export function Modal({ title, children, onClose, scrollable = false }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusable = root?.querySelectorAll<HTMLElement>('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && focusable && focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-card animate-fade-in${scrollable ? ' scrollable' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">{title}</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (or press Esc)"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}

interface ClaimForm {
  onSubmit: (values: { name: string; message: string; email: string }) => void;
  error?: string;
  loading?: boolean;
}

export function PaymentModal({
  spotNumber,
  reservedUntil,
  values,
  priceCents,
  launchSpotsRemaining,
  error,
  loading,
  onPay,
  onClose,
}: {
  spotNumber: number;
  reservedUntil: string;
  values: { name: string; message: string; email: string };
  priceCents: number;
  launchSpotsRemaining: number;
  error?: string;
  loading?: boolean;
  onPay: (provider: 'STRIPE' | 'PAYPAL') => void;
  onClose: () => void;
}) {
  const [remaining, setRemaining] = useState(() => secondsUntil(reservedUntil));

  useEffect(() => {
    const tick = () => {
      const next = secondsUntil(reservedUntil);
      setRemaining(next);
      if (next <= 0) onClose();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [reservedUntil, onClose]);

  const minutes = Math.floor(Math.max(0, remaining) / 60);
  const seconds = Math.max(0, remaining) % 60;

  return (
    <Modal title={`Pay for Spot #${spotNumber.toLocaleString()}`} onClose={onClose}>
      <div className="payment-modal">
        <p className="text-[var(--color-text-secondary)]">This spot is held for you. Complete payment before the hold expires.</p>
        <p className="payment-timer" role="timer" aria-live="polite" aria-atomic="true">
          Hold expires in {minutes}:{String(seconds).padStart(2, '0')}
        </p>
        <div className="claim-preview">
          <p className="text-sm text-[var(--color-text-secondary)]">Your message</p>
          <p className="mt-2 preview-message">“{values.message}”</p>
          <p className="text-[var(--color-text-secondary)]">— {values.name}</p>
        </div>
        <p className="payment-amount">${(priceCents / 100).toFixed(2)} USD</p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {launchSpotsRemaining > 0
            ? `Launch price: first 1,000 spots are $1. ${launchSpotsRemaining.toLocaleString()} left, then $5.`
            : 'Launch price ended. This spot is $5.'}
        </p>
        {error ? <p className="error-text" role="alert">⚠ {error}</p> : null}
        <div className="payment-actions">
          <button className="btn-primary" type="button" disabled={loading || remaining <= 0} onClick={() => onPay('STRIPE')}>
            {loading ? 'OPENING STRIPE...' : 'PAY WITH STRIPE'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function secondsUntil(iso: string) {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / 1000));
}

export function ClaimForm({ onSubmit, error, loading }: ClaimForm) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSubmit({
      name: String(data.get('name') || ''),
      message: String(data.get('message') || ''),
      email: String(data.get('email') || ''),
    });
  };
  const nameLeft = 80 - name.length;
  const messageLeft = 100 - message.length;
  return (
    <form onSubmit={handle} className="flex flex-col claim-form">
      <label className="field">
        Name
        <input name="name" required maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <span className={`field-meta${nameLeft < 10 ? ' limit' : nameLeft < 20 ? ' warn' : ''}`}>{nameLeft} left</span>
      </label>
      <label className="field">
        Message
        <textarea name="message" required maxLength={100} rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
        <span className={`field-meta${messageLeft < 15 ? ' limit' : messageLeft < 30 ? ' warn' : ''}`}>{messageLeft} left</span>
      </label>
      <label className="field">
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      {(name || message) && (
        <div className="claim-preview">
          <p className="text-sm text-[var(--color-text-secondary)]">Preview</p>
          <p className="mt-2 preview-message">{message ? `“${message}”` : 'Your message'}</p>
          <p className="text-[var(--color-text-secondary)]">— {name || 'Your name'}</p>
        </div>
      )}
      <p className="text-sm text-[var(--color-text-secondary)]">
        Your email is used to verify ownership and manage your spot later.
      </p>
      {error ? <p className="error-text" role="alert">⚠ {error}</p> : null}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'HOLDING SPOT...' : 'CLAIM'}
      </button>
    </form>
  );
}
