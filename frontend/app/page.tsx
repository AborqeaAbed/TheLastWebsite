'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClaimForm, Modal } from '../components/Modal';
import { ManageSpot, SearchOverlay, ShareButtons } from '../components/Overlays';
import { useMapEngine } from '../hooks/useMapEngine';
import { api } from '../services/api';
import type { Spot, Stats } from '../types';

function formatClaimTime(claimedAt?: string) {
  if (!claimedAt) return 'Permanent';
  return `${new Date(claimedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  })} UTC`;
}

export default function HomePage() {
  const { bind, hover, selected, setSelected, flyTo, zoomBy, pulse } = useMapEngine();
  const [stats, setStats] = useState<Stats>({ claimed: 0, available: 1000000, pendingVerification: 0, reserved: 0, total: 1000000 });
  const [latest, setLatest] = useState<Spot[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [latestOpen, setLatestOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [live, setLive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayClaimed, setDisplayClaimed] = useState(0);

  useEffect(() => {
    api.stats().then(setStats).catch(() => undefined);
    api.latest().then(setLatest).catch(() => undefined);
    api.track('homepage_view');
    api.track('map_loaded');
  }, []);

  useEffect(() => {
    const end = stats.claimed;
    const start = displayClaimed;
    if (end === start) return;
    const frames = 28;
    let frame = 0;
    const tick = () => {
      frame += 1;
      setDisplayClaimed(Math.round(start + (end - start) * (frame / frames)));
      if (frame < frames) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [stats.claimed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        api.track('search_started');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goRandom = useCallback(async () => {
    api.track('random_spot_clicked');
    const spot = await api.random();
    await flyTo(spot);
    if (latest[0]) setLive(`Someone just claimed #${latest[0].spotNumber.toLocaleString()}`);
  }, [flyTo, latest]);

  const claim = async (values: { name: string; message: string; email: string }) => {
    if (!selected) return;
    setClaiming(true);
    setClaimError('');
    api.track('claim_started');
    try {
      const result = await api.checkout(selected.spotNumber, values);
      api.track('checkout_started');
      window.location.href = result.url.startsWith('http') ? result.url : result.url;
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <main className="relative min-h-screen text-[var(--color-text-primary)]">
      <div className="map-root">
        <div className="map-grid" aria-hidden="true" />
        <canvas ref={bind} className="map-canvas" role="img" aria-label="Interactive map of one million spots" />
        <div className="map-vignette" aria-hidden="true" />
      </div>

      <a href="#map-controls" className="sr-only focus:not-sr-only">Skip to map controls</a>

      <header className="fixed top-4 left-1/2 z-30 w-[min(1100px,calc(100%-24px))] -translate-x-1/2 glass-ui rounded-[20px] px-7 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="header-brand">
          <img className="header-brand-mark" src="/icon-v3.png" alt="" width={28} height={28} />
          <p>THE LAST WEBSITE</p>
        </div>
        <nav aria-label="Primary" className="hidden md:flex gap-2 text-sm">
          <button className="nav-link" onClick={() => setHeroVisible(false)}>EXPLORE</button>
          <button className="nav-link" onClick={() => { setSearchOpen(true); api.track('search_started'); }}>SEARCH</button>
          <button className="nav-link" onClick={goRandom}>RANDOM</button>
          <button className="nav-link" onClick={async () => { setLatest(await api.latest().catch(() => [])); setLatestOpen(true); }}>LATEST CLAIMS</button>
          <button className="nav-link" onClick={() => setManageOpen(true)}>MY SPOT</button>
        </nav>
        <div className="flex items-center gap-3">
          <div className="stats-chip" aria-live="polite">
            <span className="stats-live" aria-hidden="true" />
            <span className="spot-number">{displayClaimed.toLocaleString()} / {stats.total.toLocaleString()}</span>
          </div>
          <button className="icon-btn md:hidden" aria-label="Open menu" onClick={() => setMenuOpen((v) => !v)}>☰</button>
        </div>
      </header>
      {menuOpen && (
        <nav aria-label="Mobile" className="fixed top-20 left-1/2 z-30 w-[min(1100px,calc(100%-24px))] -translate-x-1/2 glass-ui rounded-[18px] p-3 flex flex-col md:hidden">
          <button className="nav-link text-left" onClick={() => { setHeroVisible(false); setMenuOpen(false); }}>EXPLORE</button>
          <button className="nav-link text-left" onClick={() => { setSearchOpen(true); setMenuOpen(false); }}>SEARCH</button>
          <button className="nav-link text-left" onClick={() => { goRandom(); setMenuOpen(false); }}>RANDOM</button>
          <button className="nav-link text-left" onClick={async () => { setLatest(await api.latest().catch(() => [])); setLatestOpen(true); setMenuOpen(false); }}>LATEST CLAIMS</button>
          <button className="nav-link text-left" onClick={() => { setManageOpen(true); setMenuOpen(false); }}>MY SPOT</button>
        </nav>
      )}

      {heroVisible && (
        <section className="fixed inset-0 z-10 flex items-center justify-center px-6 pointer-events-none">
          <div className="modal-card pointer-events-auto text-center max-w-2xl">
            <p className="tracking-[0.2em] text-sm text-[var(--color-text-secondary)] mb-6 flex items-center justify-center gap-2">
              <img className="header-brand-mark" src="/icon-v3.png" alt="" width={28} height={28} />
              THE LAST WEBSITE
            </p>
            <h1>CLAIM YOUR PERMANENT SPOT ON THE INTERNET</h1>
            <p className="mt-6 mx-auto max-w-[500px] text-[1.1rem] leading-relaxed text-[var(--color-text-secondary)]">1,000,000 spots. One permanent place on the Internet. Leave your message for the future.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button className="btn-primary" onClick={() => setHeroVisible(false)}>EXPLORE</button>
              <button className="btn-secondary" onClick={goRandom}>CLAIM A SPOT</button>
            </div>
            <div className="hero-stats mt-10">
              <p className="hero-stats-number">{displayClaimed.toLocaleString()} / {stats.total.toLocaleString()}</p>
              <p className="hero-stats-label">SPOTS CLAIMED</p>
              <div className="progress-track" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${Math.max(2, (displayClaimed / stats.total) * 100)}%` }} />
              </div>
              <p className="hero-stats-remaining">{stats.available.toLocaleString()} spots remaining</p>
            </div>
          </div>
        </section>
      )}

      <div id="map-controls" className="fixed right-4 top-1/2 z-20 -translate-y-1/2 flex flex-col gap-2">
        <button className="icon-btn" aria-label="Zoom in" onClick={() => zoomBy(0.4)}>+</button>
        <button className="icon-btn" aria-label="Zoom out" onClick={() => zoomBy(-0.4)}>−</button>
        <button className="icon-btn" aria-label="Recenter map" onClick={() => flyTo({ spotNumber: 500000, x: 0.5, y: 0.5, status: 'AVAILABLE' })}>⌖</button>
      </div>

      {live && (
        <p className="fixed bottom-6 right-4 z-20 glass-ui rounded-full px-4 py-2 text-sm flex items-center gap-2" role="status">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)] animate-live" />
          {live}
        </p>
      )}

      {hover && (
        <div className={`hover-card animate-fade-in${hover.spot.status === 'CLAIMED' ? ' claimed' : ''}`} style={{ left: hover.sx + 12, top: hover.sy + 12 }}>
          <div className="spot-number">#{hover.spot.spotNumber.toLocaleString()}</div>
          {hover.spot.status === 'CLAIMED' ? (
            <>
              <p className="hover-message">“{hover.spot.message}”</p>
              <p className="hover-meta">— {hover.spot.name}</p>
            </>
          ) : (
            <>
              <p className="hover-status">AVAILABLE</p>
              <p className="hover-cta">Claim for $1</p>
            </>
          )}
        </div>
      )}

      {latestOpen && (
        <Modal title="Latest claims" onClose={() => setLatestOpen(false)} scrollable>
          {latest.length === 0 ? (
            <p className="text-[var(--color-text-secondary)]">No claims yet.</p>
          ) : (
              <ul className="latest-claims-list">
                {latest.map((spot) => (
                  <li key={spot.spotNumber}>
                    <button
                      className="claim-preview w-full text-left rounded-xl"
                      onClick={() => {
                        setLatestOpen(false);
                        setHeroVisible(false);
                        flyTo(spot);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="spot-number">#{spot.spotNumber.toLocaleString()}</div>
                        <span className="status-badge">CLAIMED</span>
                      </div>
                      <div className="text-lg mt-2">“{spot.message}”</div>
                      <div className="text-[var(--color-text-secondary)]">— {spot.name}</div>
                      <div className="claim-time">{formatClaimTime(spot.claimedAt)}</div>
                    </button>
                  </li>
                ))}
              </ul>
          )}
        </Modal>
      )}

      {selected && selected.status === 'CLAIMED' && (
        <Modal title={`✓ Spot #${selected.spotNumber.toLocaleString()} Claimed Successfully!`} onClose={() => setSelected(null)}>
          {pulse === selected.spotNumber && <div className="animate-ripple absolute inset-0 rounded-full border border-[var(--color-accent)] pointer-events-none" />}
          <div className="claimed-spot-container">
            <div className="spot-message-box">
              <p className="spot-message-text">“{selected.message}”</p>
              <div className="spot-attribution">
                <p className="spot-name">— {selected.name}</p>
              </div>
            </div>
            <p className="spot-live-note">Your permanent spot is now live!</p>
            <div className="spot-share-section">
              <ShareButtons
                spot={selected}
                onView={() => setSelected(null)}
                onDone={() => setSelected(null)}
              />
            </div>
          </div>
        </Modal>
      )}

      {selected && selected.status !== 'CLAIMED' && (
        <Modal title={`Claim Spot #${selected.spotNumber.toLocaleString()}`} onClose={() => setSelected(null)}>
          <p className="mb-6 text-[var(--color-text-secondary)]">This area is still waiting for someone.</p>
          <ClaimForm onSubmit={claim} error={claimError} loading={claiming} />
        </Modal>
      )}

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(spot) => {
          setSearchOpen(false);
          setHeroVisible(false);
          flyTo(spot);
        }}
      />
      <ManageSpot open={manageOpen} onClose={() => setManageOpen(false)} />
    </main>
  );
}
