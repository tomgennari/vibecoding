import Image from 'next/image';
import { Brain, Lightbulb, MessageSquare, RefreshCw } from 'lucide-react';

const SKILLS = [
  { title: 'Comunicación con IA', Icon: MessageSquare },
  { title: 'Pensamiento lógico', Icon: Brain },
  { title: 'Iteración y mejora', Icon: RefreshCw },
  { title: 'Resolución de problemas', Icon: Lightbulb },
];

export function VibeCodingSection() {
  return (
    <section id="vibe-coding" className="border-t border-slate-100 bg-[#f8fafc] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#7c3aed] md:text-base">
          ¿Qué es Vibe Coding?
        </p>
        <h2 className="text-3xl font-bold text-[#00478E] md:text-4xl">El futuro se aprende creando</h2>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-[#0f172a]">
          Vibe coding es una nueva forma de crear tecnología. Los alumnos describen el juego que imaginan en sus propias
          palabras, y una inteligencia artificial los ayuda a convertirlo en realidad. No necesitan saber programar —
          solo necesitan creatividad, curiosidad y ganas de crear.
        </p>

        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          <div className="mx-auto flex max-w-md flex-1 flex-col overflow-visible rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:mx-0">
            <div className="flex flex-row items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[#7c3aed]/30 bg-violet-50/50 md:h-24 md:w-24">
                <Image
                  src="/images/andy-avatar.png"
                  alt="Andy"
                  fill
                  className="object-contain object-bottom p-1"
                  sizes="(max-width: 768px) 80px, 96px"
                />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xl font-bold text-[#00478E]">Andy</p>
                <p className="text-sm font-medium text-[#64748b]">Tu compañero del Game Lab</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl rounded-tl-sm bg-violet-50 px-4 py-3 text-sm leading-relaxed text-[#0f172a] md:text-base">
              <span className="font-medium text-[#7c3aed]">Andy:</span> ¡Hola! Contame qué juego se te ocurre y lo
              armamos juntos 🎮
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            {SKILLS.map(({ title, Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] motion-reduce:transform-none"
              >
                <div className="mb-3 rounded-xl bg-violet-100 p-2.5 text-[#7c3aed] w-fit">
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold text-[#0f172a] md:text-xl">{title}</h3>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-sm font-medium text-[#64748b] md:text-base">
          Para alumnos de Kinder a Secundaria — adaptado a cada edad
        </p>
      </div>
    </section>
  );
}
