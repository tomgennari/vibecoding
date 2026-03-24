'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'disclaimer_seen';

const LIST_ITEMS = [
  'Este sitio NO está indexado en Google ni en ningún buscador',
  'NO existen perfiles de redes sociales asociados a este proyecto',
  'NO se ha utilizado el logo oficial del SASS sin autorización',
  'NO se realizan transacciones económicas reales',
  'El acceso es exclusivamente para fines de evaluación',
];

export function DisclaimerModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) !== 'true') {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-modal-title"
    >
      <div className="max-h-[min(90vh,calc(100vh-2rem))] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-[#00478E] to-[#7c3aed]" />
        <div className="p-8 md:p-10">
          <ShieldCheck className="mx-auto h-12 w-12 text-[#00478E]" aria-hidden />
          <h2
            id="disclaimer-modal-title"
            className="mt-4 text-center text-xl font-bold text-[#0f172a] md:text-2xl"
          >
            Aviso importante
          </h2>
          <div className="my-4 h-px bg-slate-200" />
          <p className="text-sm leading-relaxed text-slate-600 md:text-base">
            Este sitio web se encuentra en fase de desarrollo y evaluación. Su contenido, funcionalidades y
            referencias al St. Andrew&apos;s Scots School están sujetos a la aprobación formal de las autoridades del
            colegio.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base">Hasta tanto se obtenga dicha aprobación:</p>
          <ul className="mt-3 space-y-3">
            {LIST_ITEMS.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-slate-700 md:text-base">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base">
            El uso del nombre y referencias al St. Andrew&apos;s Scots School en esta plataforma es con fines de
            presentación del proyecto, y será removido inmediatamente si las autoridades del colegio así lo requieren.
          </p>
          <div className="my-4 h-px bg-slate-200" />
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full rounded-xl bg-[#00478E] py-3 text-base font-semibold text-white transition-colors hover:bg-[#003a73]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
