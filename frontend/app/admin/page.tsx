'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/stats`, {
        headers: { 'X-Admin-Token': token },
      });
      if (!res.ok) throw new Error('Admin only');
      setStats(await res.json());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('admin-token');
    if (saved) setToken(saved);
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1>Admin</h1>
      <label className="field max-w-md mt-8">
        Admin token
        <input value={token} onChange={(e) => { setToken(e.target.value); sessionStorage.setItem('admin-token', e.target.value); }} />
      </label>
      <button className="btn-primary mt-4" onClick={load}>Load dashboard</button>
      {error ? <p className="error-text mt-4">{error}</p> : null}
      {stats && (
        <dl className="grid md:grid-cols-3 gap-6 mt-10">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="glass-ui rounded-2xl p-6">
              <dt className="text-sm text-[var(--color-text-secondary)]">{k}</dt>
              <dd className="spot-number text-3xl mt-2">{v.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      )}
    </main>
  );
}
