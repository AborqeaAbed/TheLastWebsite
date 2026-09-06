'use client';

export default function AlmostTherePage() {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <section className="modal-card text-center">
        <p className="tracking-[0.18em] text-sm">ALMOST THERE</p>
        <h1 className="mt-4">We sent a verification link to your email.</h1>
        <p className="mt-4 text-[var(--color-text-secondary)]">Click the link to permanently claim your spot.</p>
        <div className="mt-8 flex justify-center gap-3">
          <a className="btn-secondary" href="/">BACK TO MAP</a>
        </div>
      </section>
    </main>
  );
}
