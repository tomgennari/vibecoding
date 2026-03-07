'use client';

import Link from 'next/link';

const bg = '#0a0a0f';
const cardBg = '#13131a';
const border = '#2a2a3a';
const text = '#f1f5f9';
const textMuted = '#94a3b8';
const accent = '#7c3aed';

export default function DonacionFallidaPage() {
  return (
    <div
      className="min-h-screen font-sans flex flex-col items-center justify-center p-6"
      style={{ background: bg, color: text }}
    >
      <div
        className="rounded-2xl border p-8 max-w-md w-full text-center"
        style={{ background: cardBg, borderColor: border }}
      >
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 text-4xl"
          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444' }}
        >
          ⚠️
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: text }}>
          Hubo un problema con tu donación
        </h1>
        <p className="text-base mb-8" style={{ color: textMuted }}>
          No se realizó ningún cobro. Podés intentarlo de nuevo.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center w-full rounded-xl py-3 px-6 font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)' }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
