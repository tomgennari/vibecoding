import Link from 'next/link';

const TITLE_COLOR = '#00478E';
const BG = '#ffffff';
const TEXT_COLOR = '#1e293b';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';

/**
 * Wrapper for legal pages (terms, privacy). Light mode only, PRD colors.
 * @param {string} alternatePath - Path to the same page in the other language (e.g. /terms or /terminos)
 * @param {string} langLabel - Label for the language toggle link (e.g. "English" or "Español")
 * @param {React.ReactNode} children - Rendered markdown content
 */
export function LegalPageWrapper({ alternatePath, langLabel, children }) {
  return (
    <div
      className="min-h-screen font-sans antialiased"
      style={{ background: BG, color: TEXT_COLOR }}
    >
      <header
        className="sticky top-0 z-10 border-b flex items-center justify-between px-4 py-3"
        style={{ borderColor: BORDER, background: BG }}
      >
        <Link
          href="/"
          className="text-sm font-semibold transition-colors hover:opacity-80"
          style={{ color: TITLE_COLOR }}
        >
          Campus San Andrés
        </Link>
        <Link
          href={alternatePath}
          className="text-sm font-medium transition-colors hover:underline"
          style={{ color: TITLE_COLOR }}
        >
          {langLabel}
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <article className="legal-content max-w-none">
          {children}
        </article>
      </main>
    </div>
  );
}
