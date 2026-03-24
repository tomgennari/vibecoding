import Image from 'next/image';
import Link from 'next/link';

const HOUSES = [
  {
    id: 'william_brown',
    name: 'William Brown',
    full: 'William Brown House',
    color: '#3b82f6',
    shieldSrc: '/images/houses/house-brown.png',
  },
  {
    id: 'james_dodds',
    name: 'James Dodds',
    full: 'James Dodds House',
    color: '#eab308',
    shieldSrc: '/images/houses/house-dodds.png',
  },
  {
    id: 'james_fleming',
    name: 'James Fleming',
    full: 'James Fleming House',
    color: '#ef4444',
    shieldSrc: '/images/houses/house-fleming.png',
  },
  {
    id: 'john_monteith',
    name: 'John Monteith',
    full: 'John Monteith House',
    color: '#22c55e',
    shieldSrc: '/images/houses/house-monteith.png',
  },
];

export function HousesSection() {
  return (
    <section id="houses" className="border-t border-slate-100 bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-3xl font-bold text-[#00478E] md:text-4xl">Cuatro Houses, una competencia</h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#64748b]">
          Competí por tu House publicando juegos, sumando likes y jugando.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {HOUSES.map((h) => (
            <div
              key={h.id}
              className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6 pl-5 transition-transform duration-300 ease-in-out hover:scale-[1.02] motion-reduce:transform-none"
              style={{ borderLeftWidth: 4, borderLeftColor: h.color }}
            >
              <div className="flex flex-row items-start gap-4">
                <div className="relative h-16 w-16 shrink-0 md:h-20 md:w-20">
                  <Image
                    src={h.shieldSrc}
                    alt={`Escudo ${h.name}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 64px, 80px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold md:text-2xl" style={{ color: h.color }}>
                    {h.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-[#64748b]">{h.full}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#0f172a]">
                Sumá puntos para tu House con cada juego y cada partida.
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-base text-[#64748b]">
          ¿A qué House pertenecés? Elegí al{' '}
          <Link href="/register" className="font-bold text-[#7c3aed] underline hover:text-[#00478E]">
            registrarte
          </Link>{' '}
          →
        </p>
      </div>
    </section>
  );
}
