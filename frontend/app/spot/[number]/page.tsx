'use client';

import { useEffect, useState } from 'react';
import { ShareButtons } from '../../../components/Overlays';
import { api } from '../../../services/api';
import type { Spot } from '../../../types';

export default function SpotPage({ params }: { params: { number: string } }) {
  const n = Number(params.number);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    setClaimed(new URLSearchParams(window.location.search).get('claimed') === '1');
    api.spot(n).then(setSpot).catch(() => undefined);
  }, [n]);

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <section className="modal-card text-center">
        <p className="tracking-[0.18em] text-sm text-[var(--color-text-secondary)]">
          {claimed ? 'SPOT CLAIMED' : 'SPOT'}
        </p>
        <h1 className="mt-4">{claimed ? 'This place is yours.' : `Spot #${n.toLocaleString()}`}</h1>
        <p className="spot-number text-2xl mt-6">#{n.toLocaleString()}</p>
        {spot?.message ? <p className="text-xl mt-4">“{spot.message}”</p> : null}
        {spot?.name ? <p className="text-[var(--color-text-secondary)]">— {spot.name}</p> : null}
        <div className="mt-8 flex flex-col items-center gap-3">
          {spot ? <ShareButtons spot={spot} /> : null}
          <a className="btn-secondary" href={`/?spot=${n}`}>VIEW ON MAP</a>
        </div>
      </section>
    </main>
  );
}
