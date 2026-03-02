'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase.js';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export default function JugarPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [iframeSrc, setIframeSrc] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Juego no encontrado');
      return;
    }
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Tenés que iniciar sesión para jugar.');
        setLoading(false);
        return;
      }
      const { data, error: e } = await supabase.from('games').select('id, title, file_url, game_width, game_height').eq('id', id).eq('status', 'approved').single();
      if (e || !data) {
        setError('Juego no encontrado o no disponible.');
        setLoading(false);
        return;
      }
      if (!data.file_url) {
        setError('Este juego no tiene archivo cargado.');
        setLoading(false);
        return;
      }
      setGame(data);
      setIframeSrc(`/api/juego/${id}?token=${encodeURIComponent(session.access_token)}`);
      setLoading(false);
    }
    load();
  }, [id]);

  const width = game?.game_width ?? DEFAULT_WIDTH;
  const height = game?.game_height ?? DEFAULT_HEIGHT;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-[#0a0a0f] text-[#94a3b8]">
        Cargando...
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-[#0a0a0f] text-[#f1f5f9] p-4">
        <p className="text-lg mb-4">{error || 'Juego no encontrado.'}</p>
        <Link href="/dashboard" className="px-4 py-2 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)' }}>
          Volver al dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#0a0a0f] text-[#f1f5f9]">
      <header className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-[#2a2a3a] bg-[#13131a]">
        <Link href="/dashboard" className="text-sm font-medium" style={{ color: '#94a3b8' }}>← Volver</Link>
        <h1 className="text-lg font-bold truncate max-w-[50%]" style={{ color: '#f1f5f9' }}>{game.title || 'Juego'}</h1>
        <span className="w-16" />
      </header>
      <main className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-auto">
        <div className="rounded-xl overflow-hidden border-2 border-[#2a2a3a] shadow-xl" style={{ width: width, maxWidth: '100%' }}>
          {iframeSrc && (
            <iframe
              src={iframeSrc}
              title={game.title || 'Juego'}
              sandbox="allow-scripts"
              width={width}
              height={height}
              className="block border-0 bg-black"
              style={{ maxWidth: '100%', height: height }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
