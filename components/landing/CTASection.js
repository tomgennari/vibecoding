import Link from 'next/link';

export function CTASection({ isLoggedIn }) {
  return (
    <section
      id="cta"
      className="border-t border-slate-100 bg-gradient-to-br from-[#7c3aed] via-[#7c3aed] to-[#06b6d4] py-16 md:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
        <h2 className="text-3xl font-bold text-white md:text-4xl">Sé parte del nuevo capítulo</h2>
        <p className="mt-4 text-lg leading-relaxed text-white/95">
          Registrate y empezá a crear, jugar y construir el campus
        </p>

        {isLoggedIn ? (
          <div className="mt-10">
            <Link
              href="/juegos"
              className="inline-flex min-w-[220px] items-center justify-center rounded-xl bg-white px-8 py-4 text-lg font-semibold text-[#7c3aed] transition-[filter,transform] duration-300 ease-in-out hover:scale-[1.02] hover:brightness-105"
            >
              Ir al Campus
            </Link>
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register?tipo=alumno"
              className="inline-flex min-w-[200px] items-center justify-center rounded-xl bg-white px-8 py-4 text-lg font-semibold text-[#7c3aed] transition-[filter,transform] duration-300 ease-in-out hover:scale-[1.02]"
            >
              Soy alumno
            </Link>
            <Link
              href="/register?tipo=padre"
              className="inline-flex min-w-[200px] items-center justify-center rounded-xl border-2 border-white bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-[filter,transform] duration-300 ease-in-out hover:scale-[1.02] hover:bg-white/20"
            >
              Soy padre/madre
            </Link>
          </div>
        )}

        {!isLoggedIn && (
          <p className="mt-8 text-sm text-white/90">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="font-semibold underline hover:text-white">
              Iniciá sesión
            </Link>{' '}
            →
          </p>
        )}
      </div>
    </section>
  );
}
