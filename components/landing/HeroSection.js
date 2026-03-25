import Link from 'next/link';

export function HeroSection({ isLoggedIn }) {
  return (
    <section
      id="hero"
      className="relative min-h-[90vh] overflow-hidden pt-16 pb-16 md:pt-20 md:pb-24"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center md:px-8">
        <div className="mb-6 flex justify-center gap-2">
          {['#3b82f6', '#eab308', '#ef4444', '#22c55e'].map((c) => (
            <span
              key={c}
              className="h-3 w-3 rounded-full ring-2 ring-white shadow-sm"
              style={{ backgroundColor: c }}
              aria-hidden
            />
          ))}
        </div>

        <h1 className="text-5xl font-black uppercase tracking-tight text-[#00478E] md:text-7xl">
          Campus San Andrés
        </h1>
        <p className="mt-3 text-xl text-[#64748b]">Vibe Coding San Andrés</p>
        <p className="mt-6 text-lg font-medium leading-relaxed text-[#0f172a] md:text-xl">
          Construimos el campus del futuro, un juego a la vez
        </p>

        <div className="mx-auto mt-8 max-w-2xl">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#7c3aed] to-transparent mx-auto" />
          <p className="mt-4 text-lg italic text-[#00478E] md:text-xl">&ldquo;Sic itur ad astra&rdquo;</p>
          <div className="mt-2 h-px w-24 bg-gradient-to-r from-transparent via-[#7c3aed] to-transparent mx-auto" />
        </div>

        <p className="mt-8 text-base leading-relaxed text-[#64748b]">
          188 años de historia. Un nuevo capítulo.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {isLoggedIn ? (
            <Link
              href="/juegos"
              className="inline-flex min-w-[200px] items-center justify-center rounded-xl bg-[#7c3aed] px-8 py-4 text-lg font-semibold text-white transition-[filter,transform] duration-300 ease-in-out hover:scale-[1.02] hover:brightness-110"
            >
              Ir al Campus
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-flex min-w-[200px] items-center justify-center rounded-xl bg-[#7c3aed] px-8 py-4 text-lg font-semibold text-white transition-[filter,transform] duration-300 ease-in-out hover:scale-[1.02] hover:brightness-110"
            >
              Registrate
            </Link>
          )}
          <a
            href="#campus"
            className="inline-flex min-w-[200px] items-center justify-center rounded-xl border-2 border-[#7c3aed] px-8 py-4 text-lg font-semibold text-[#7c3aed] transition-all duration-300 ease-in-out hover:bg-violet-50"
          >
            Conocé más
          </a>
        </div>
      </div>
    </section>
  );
}
