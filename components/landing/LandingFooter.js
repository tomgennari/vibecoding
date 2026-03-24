export function LandingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-[#0f172a] py-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <p className="text-lg font-bold text-white">Campus San Andrés</p>
        <p className="mt-2 text-sm italic text-slate-300">
          Sic itur ad astra — St. Andrew&apos;s Scots School, 1838
        </p>
        <div className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:gap-8">
          <a
            href="https://sasscampus.com"
            className="text-slate-300 underline transition-colors hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            sasscampus.com
          </a>
          <span className="hidden text-slate-600 sm:inline" aria-hidden>
            |
          </span>
          <a
            href="https://sanandres.esc.edu.ar"
            className="text-slate-300 underline transition-colors hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            sanandres.esc.edu.ar
          </a>
        </div>
        <p className="mt-8 text-xs text-slate-500">© 2026 Campus San Andrés. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
