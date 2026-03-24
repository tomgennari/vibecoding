import { Cpu, Gamepad2, MessageCircle, Send, Sparkles, Wrench } from 'lucide-react';

const STEPS = [
  { Icon: Sparkles, title: 'Imaginá', desc: 'Pensá en el juego que te gustaría crear' },
  { Icon: MessageCircle, title: 'Describilo', desc: 'Contale a Andy tu idea con texto o voz' },
  { Icon: Cpu, title: 'Andy lo crea', desc: 'La IA genera tu juego en tiempo real' },
  { Icon: Wrench, title: 'Mejoralo', desc: 'Pedile cambios hasta que quede perfecto' },
  { Icon: Send, title: 'Publicalo', desc: 'Enviá a moderación y compartí con todos' },
  { Icon: Gamepad2, title: 'Jugá y recaudá', desc: 'Cada juego desbloqueado construye el campus' },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-slate-100 bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-3xl font-bold text-[#00478E] md:text-4xl">De la idea al juego en minutos</h2>

        <div className="relative mt-12 md:mt-16">
          <div className="hidden md:block absolute left-0 right-0 top-8 h-0.5 bg-gradient-to-r from-transparent via-[#7c3aed]/30 to-transparent" />

          <ol className="flex flex-col gap-10 md:flex-row md:flex-wrap md:justify-between md:gap-6">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative flex flex-1 min-w-[140px] flex-col items-center text-center md:max-w-[160px]"
              >
                <div
                  className="z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-lg ring-4 ring-white"
                  aria-hidden
                >
                  <span className="text-sm font-black">{i + 1}</span>
                </div>
                <div className="mt-4 rounded-xl bg-violet-50 p-3 text-[#7c3aed]">
                  <step.Icon className="mx-auto h-7 w-7" strokeWidth={2} />
                </div>
                <h3 className="mt-3 text-lg font-bold text-[#0f172a] md:text-xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
