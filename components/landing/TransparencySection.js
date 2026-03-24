import { Banknote, Check, Eye, Lock, MessageSquareOff, Shield, UserCheck } from 'lucide-react';

const ITEMS = [
  {
    Icon: Shield,
    title: '100% a construcción',
    desc: 'Todo lo recaudado, neto de comisión de pago, va directo a la cuenta del colegio',
  },
  {
    Icon: Eye,
    title: 'Moderación completa',
    desc: 'Cada juego es revisado antes de publicarse. Tolerancia cero con contenido inapropiado',
  },
  {
    Icon: Lock,
    title: 'Datos protegidos',
    desc: 'Mínimos datos personales. Sin fotos de perfil. Cumplimiento Ley 25.326',
  },
  {
    Icon: MessageSquareOff,
    title: 'Sin chat ni comentarios',
    desc: 'Cero riesgo de cyberbullying. La única interacción es jugar',
  },
  {
    Icon: Banknote,
    title: 'Sin publicidad',
    desc: 'No hay ads. No se venden datos. El foco es la comunidad',
  },
  {
    Icon: UserCheck,
    title: 'Comunidad cerrada',
    desc: 'Solo para la comunidad del St. Andrew\'s Scots School',
  },
];

export function TransparencySection() {
  return (
    <section id="transparency" className="border-t border-slate-100 bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="text-3xl font-bold text-[#00478E] md:text-4xl">Transparencia total</h2>
        <p className="mt-3 text-lg text-[#64748b]">Porque la confianza se construye con hechos</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6 transition-transform duration-300 ease-in-out hover:scale-[1.02] motion-reduce:transform-none"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2 text-[#00478E] shadow-sm">
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 shrink-0 text-emerald-500" strokeWidth={2.5} aria-hidden />
                    <h3 className="text-lg font-semibold text-[#0f172a] md:text-xl">{title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
