'use client';

import Image from 'next/image';
import Link from 'next/link';

const style = {
  bg: '#13131a',
  border: '#2a2a3a',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  danger: '#ef4444',
};

function IconLogout() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export default function AdminNavbar({ adminName, onLogout }) {
  return (
    <header
      className="flex-shrink-0 flex items-center justify-between gap-4 px-4 h-14 border-b"
      style={{ background: style.bg, borderColor: style.border }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Image src="/images/logo-sass.png" alt="SASS" width={28} height={28} className="object-contain flex-shrink-0" style={{ filter: 'brightness(0) invert(1)' }} />
        <span className="text-base font-bold truncate" style={{ color: style.text }}>
          Campus San Andrés — Admin
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm truncate max-w-[180px]" style={{ color: style.textMuted }}>{adminName}</span>
        <button
          type="button"
          onClick={onLogout}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: style.danger }}
          aria-label="Cerrar sesión"
        >
          <IconLogout />
        </button>
      </div>
    </header>
  );
}
