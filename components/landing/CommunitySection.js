import { GraduationCap, Heart, Users } from 'lucide-react';

const GROUPS = [
  {
    title: 'Alumnos',
    Icon: GraduationCap,
    items: ['Creá juegos con IA', 'Competí por tu House', 'Compartí con tus compañeros'],
  },
  {
    title: 'Padres',
    Icon: Users,
    items: ['Jugá los juegos de tus hijos', 'Desbloqueá juegos del catálogo', 'Doná para los edificios del campus'],
  },
  {
    title: 'Familias',
    Icon: Heart,
    items: ['Seguro y moderado', 'Todo queda en la comunidad SASS', 'Construyendo juntos el futuro'],
  },
];

export function CommunitySection() {
  return (
    <section id="community" className="border-t border-slate-100 bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-3xl font-bold text-[#00478E] md:text-4xl">Un espacio para todos</h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {GROUPS.map(({ title, Icon, items }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] motion-reduce:transform-none"
            >
              <div className="mb-4 inline-flex rounded-xl bg-[#00478E]/10 p-3 text-[#00478E]">
                <Icon className="h-8 w-8" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] md:text-2xl">{title}</h3>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#64748b] md:text-base">
                {items.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-[#7c3aed]" aria-hidden>
                      •
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
