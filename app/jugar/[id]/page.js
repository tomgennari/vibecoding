'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client.js';

const BASE_URL = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://sass.vibecoding.ar';

function IconShare() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export default function JugarPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLiked, setUserLiked] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [liking, setLiking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const shareRef = useRef(null);

  const [iframeSrc, setIframeSrc] = useState('');

  useEffect(() => {
    function handleClickOutside(e) {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const { data, error: e } = await supabase.from('games').select('id, title, file_url, game_width, game_height, total_likes').eq('id', id).eq('status', 'approved').single();
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
      setTotalLikes(Number(data.total_likes) || 0);
      const { data: likeRow } = await supabase.from('game_likes').select('id').eq('user_id', session.user.id).eq('game_id', id).maybeSingle();
      setUserLiked(Boolean(likeRow));
      setIframeSrc(`/api/juego/${id}?token=${encodeURIComponent(session.access_token)}`);
      setLoading(false);
    }
    load();
  }, [id]);

  const width = game?.game_width ?? DEFAULT_WIDTH;
  const height = game?.game_height ?? DEFAULT_HEIGHT;

  const shareUrl = `${BASE_URL}/jugar/${id}`;
  const shareText = `Jugá ${game?.title || 'este juego'} en Campus San Andrés: ${shareUrl}`;

  function handleShareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
    setShareOpen(false);
  }

  async function handleShareCopy(label) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMessage(label);
      setShareOpen(false);
      setTimeout(() => setCopyMessage(''), 2500);
    } catch (_) {}
  }

  async function handleToggleLike() {
    if (liking || !id) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    setLiking(true);
    const wasLiked = userLiked;
    setUserLiked(!wasLiked);
    setTotalLikes((n) => Math.max(0, n + (wasLiked ? -1 : 1)));
    try {
      const res = wasLiked
        ? await fetch(`/api/likes?gameId=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
        : await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ gameId: id }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.total_likes === 'number') {
        setTotalLikes(data.total_likes);
      }
    } catch (_) {
      setUserLiked(wasLiked);
      setTotalLikes((n) => Math.max(0, n + (wasLiked ? 1 : -1)));
    } finally {
      setLiking(false);
    }
  }

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
      {copyMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2 text-sm font-medium bg-[#13131a] border border-[#2a2a3a] shadow-lg" style={{ color: '#f1f5f9' }}>
          {copyMessage}
        </div>
      )}
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[#2a2a3a] bg-[#13131a]">
        <Link href="/dashboard" className="text-sm font-medium flex-shrink-0" style={{ color: '#94a3b8' }}>← Volver</Link>
        <h1 className="text-lg font-bold truncate max-w-[30%] min-w-0" style={{ color: '#f1f5f9' }}>{game.title || 'Juego'}</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={liking}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-transform duration-150 hover:scale-105 active:scale-[1.1] disabled:opacity-70"
            style={{ color: userLiked ? '#ef4444' : '#94a3b8' }}
            aria-label={userLiked ? 'Quitar like' : 'Dar like'}
          >
            <span>{userLiked ? '❤️' : '🤍'}</span>
            <span>Me gusta ({totalLikes})</span>
          </button>
          <div className="relative" ref={shareRef}>
            <button
              type="button"
              onClick={() => setShareOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-transform duration-150 hover:scale-105 active:scale-[1.1]"
              style={{ color: '#94a3b8' }}
              aria-label="Compartir"
            >
              <IconShare />
              <span>Compartir</span>
            </button>
            {shareOpen && (
              <div
                className="absolute top-full right-0 mt-1 z-20 rounded-xl border py-1.5 min-w-[200px] shadow-xl"
                style={{ background: '#13131a', borderColor: '#2a2a3a' }}
              >
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium hover:bg-[#1e1e28] transition-colors rounded-lg"
                  style={{ color: '#f1f5f9' }}
                >
                  <span className="text-lg" aria-hidden>💬</span>
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShareCopy('Link copiado para compartir en Instagram')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium hover:bg-[#1e1e28] transition-colors rounded-lg"
                  style={{ color: '#f1f5f9' }}
                >
                  <span className="text-lg" aria-hidden>📷</span>
                  <span>Instagram</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShareCopy('Link copiado para compartir en TikTok')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium hover:bg-[#1e1e28] transition-colors rounded-lg"
                  style={{ color: '#f1f5f9' }}
                >
                  <span className="text-lg" aria-hidden>🎵</span>
                  <span>TikTok</span>
                </button>
              </div>
            )}
          </div>
        </div>
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
