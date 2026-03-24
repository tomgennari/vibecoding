import Image from 'next/image';
import { Building2, CheckCircle2, Construction, ExternalLink, Lock, School, Ship, Theater } from 'lucide-react';

const BUILDINGS = [
  { name: 'Kinder', status: 'built', image: '/images/campus/Kinder_Normal.png' },
  { name: 'Primaria', status: 'built', image: '/images/campus/Primary_School_Normal.png' },
  { name: 'Sports Pavilion', status: 'built', image: '/images/campus/Sports_Pavilion_Normal.png' },
  { name: 'Natatorio', status: 'construction', image: '/images/campus/Natatorio_Normal.png' },
  { name: 'Community Hub', status: 'planned', icon: Building2 },
  { name: 'Secundario', status: 'planned', icon: School },
  { name: 'Dining Hall', status: 'planned', icon: Building2 },
  { name: 'Performing Arts', status: 'planned', icon: Theater },
  { name: 'Barco Symmetry', status: 'planned', icon: Ship },
];

function statusBadge(status) {
  if (status === 'built')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
        Construido
      </span>
    );
  if (status === 'construction')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase text-amber-900">
        <Construction className="h-3.5 w-3.5" />
        En construcción
      </span>
    );
  return (
    <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700">
      Por construir
    </span>
  );
}

export function CampusSection() {
  return (
    <section
      id="campus"
      className="relative overflow-hidden border-t border-slate-100 bg-white py-16 md:py-24"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
        <Image
          src="/images/campus/maqueta.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-white/90" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-3xl font-bold text-[#00478E] md:text-4xl">Un campus para toda la comunidad</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#64748b]">
          Cada peso recaudado va íntegramente a la construcción del campus
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUILDINGS.map((b) => {
            const isPlanned = b.status === 'planned';
            const isConstruction = b.status === 'construction';
            const cardHover =
              isPlanned
                ? 'hover:scale-100'
                : 'hover:scale-[1.02] motion-reduce:transform-none';

            return (
              <div
                key={b.name}
                className={`group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-sm transition-transform duration-300 ease-in-out ${cardHover}`}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                  {b.image ? (
                    <>
                      <Image
                        src={b.image}
                        alt=""
                        fill
                        className={`object-cover transition-all ${
                          isPlanned
                            ? 'grayscale opacity-70'
                            : isConstruction
                              ? 'opacity-90'
                              : ''
                        }`}
                        sizes="(max-width:768px) 100vw, 33vw"
                      />
                      {isPlanned && (
                        <div
                          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/15"
                          aria-hidden
                        >
                          <Lock className="h-12 w-12 text-slate-400/70 md:h-14 md:w-14" strokeWidth={1.5} />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div
                        className={`flex h-full w-full items-center justify-center text-slate-400 ${
                          isPlanned ? 'grayscale opacity-70' : ''
                        }`}
                      >
                        {b.icon && <b.icon className="h-14 w-14" strokeWidth={1.25} />}
                      </div>
                      {isPlanned && (
                        <div
                          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/10"
                          aria-hidden
                        >
                          <Lock className="h-12 w-12 text-slate-400/70 md:h-14 md:w-14" strokeWidth={1.5} />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[#0f172a] md:text-xl">{b.name}</h3>
                    {statusBadge(b.status)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl bg-gradient-to-r from-[#00478E]/5 to-[#7c3aed]/5 p-8 text-center md:p-12">
          <h3 className="text-xl font-bold text-[#00478E] md:text-2xl">Conocé más sobre el proyecto del campus</h3>
          <p className="mt-2 text-base text-slate-600">Visitá la campaña oficial del St. Andrew&apos;s Scots School</p>
          <div className="mt-4 flex justify-center">
            <a
              href="https://sasscampus.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00478E] px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#003a73]"
            >
              Ver campaña oficial →
              <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
