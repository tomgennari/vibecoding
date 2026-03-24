'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const NAV = [
  { label: 'El Campus', href: '#campus' },
  { label: 'Vibe Coding', href: '#vibe-coding' },
  { label: 'Houses', href: '#houses' },
];

export function LandingNavbar({ isLoggedIn }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const barClass = scrolled
    ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200/80'
    : 'bg-transparent';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${barClass}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" className="text-lg font-bold text-[#00478E] md:text-xl">
            Campus San Andrés
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Secciones">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-[#0f172a] transition-colors hover:text-[#7c3aed]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {isLoggedIn ? (
              <Link
                href="/juegos"
                className="rounded-xl bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white transition-[filter,transform] duration-300 ease-in-out hover:scale-[1.02] hover:brightness-110"
              >
                Ir al Campus
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border-2 border-[#7c3aed] px-4 py-2 text-sm font-semibold text-[#7c3aed] transition-all duration-300 ease-in-out hover:bg-violet-50"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white transition-[filter,transform] duration-300 ease-in-out hover:scale-[1.02] hover:brightness-110"
                >
                  Registrate
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-[#00478E] md:hidden"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <span className="font-bold text-[#00478E]">Menú</span>
              <button type="button" className="p-2" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4" aria-label="Móvil">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-3 font-semibold text-[#0f172a] hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <hr className="my-2 border-slate-200" />
              {isLoggedIn ? (
                <Link
                  href="/juegos"
                  className="mt-2 rounded-xl bg-[#7c3aed] px-4 py-3 text-center font-semibold text-white"
                  onClick={() => setOpen(false)}
                >
                  Ir al Campus
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl border-2 border-[#7c3aed] px-4 py-3 text-center font-semibold text-[#7c3aed]"
                    onClick={() => setOpen(false)}
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    className="mt-2 rounded-xl bg-[#7c3aed] px-4 py-3 text-center font-semibold text-white"
                    onClick={() => setOpen(false)}
                  >
                    Registrate
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
