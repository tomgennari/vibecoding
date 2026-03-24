'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client.js';
import { UnlockGameModal } from '@/components/unlock-game-modal.js';

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
  const sessionIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const accessTokenRef = useRef(null);
  const gameContainerRef = useRef(null);

  const [gameHtml, setGameHtml] = useState(null);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highScores, setHighScores] = useState([]);
  const [showHighScores, setShowHighScores] = useState(false);
  const [unlockCredits, setUnlockCredits] = useState(0);
  const [userHasAllAccess, setUserHasAllAccess] = useState(false);

  useEffect(() => {
    function handleClickOutside(e) {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === 'GAME_SCORE' && event.data?.score != null) {
        const scoreValue = Number(event.data.score);
        if (isNaN(scoreValue) || scoreValue < 0) return;

        // Guardar score en la base de datos
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.user?.id || !id) return;

          supabase
            .from('game_scores')
            .insert({
              user_id: session.user.id,
              game_id: id,
              score: scoreValue,
            })
            .then(({ error }) => {
              if (error) {
                console.error('Error guardando score:', error);
              }
              // Recargar highscores después de insertar
              supabase
                .from('game_scores')
                .select('score, played_at, user_id, profiles(first_name, house)')
                .eq('game_id', id)
                .order('score', { ascending: false })
                .limit(10)
                .then(({ data }) => { if (data) setHighScores(data); });
            });
        });
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Juego no encontrado');
      return;
    }
    async function load() {
      setNeedsUnlock(false);
      setGameHtml(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Tenés que iniciar sesión para jugar.');
        setLoading(false);
        return;
      }
      const { data, error: e } = await supabase.from('games').select('id, title, file_url, game_width, game_height, total_likes, submitted_by').eq('id', id).eq('status', 'approved').single();
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

      // Cargar top 10 highscores
      const { data: scores } = await supabase
        .from('game_scores')
        .select('score, played_at, user_id, profiles(first_name, house)')
        .eq('game_id', id)
        .order('score', { ascending: false })
        .limit(10);
      if (scores) setHighScores(scores);

      const { data: likeRow } = await supabase.from('game_likes').select('id').eq('user_id', session.user.id).eq('game_id', id).maybeSingle();
      setUserLiked(Boolean(likeRow));

      // Verificar si el usuario tiene acceso
      const isCreator = data.submitted_by === session.user.id;
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_admin, has_all_access, unlock_credits')
        .eq('id', session.user.id)
        .single();
      const isAdmin = !!profileData?.is_admin;
      const hasAllAccess = !!profileData?.has_all_access;
      setUserHasAllAccess(hasAllAccess);
      setUnlockCredits(Number(profileData?.unlock_credits) || 0);

      if (!isCreator && !isAdmin && !hasAllAccess) {
        // Verificar unlocked_for_all
        const { data: gameAccess } = await supabase
          .from('games')
          .select('unlocked_for_all')
          .eq('id', id)
          .single();

        if (!gameAccess?.unlocked_for_all) {
          // Verificar unlock individual
          const { data: unlock } = await supabase
            .from('game_unlocks')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('game_id', id)
            .maybeSingle();

          // Verificar juego gratis del día
          const today = new Date().toISOString().split('T')[0];
          const { data: dailyFree } = await supabase
            .from('daily_free_games')
            .select('id')
            .eq('game_id', id)
            .eq('active_date', today)
            .maybeSingle();

          if (!unlock && !dailyFree) {
            setNeedsUnlock(true);
            setLoading(false);
            return;
          }
        }
      }

      try {
        const gameRes = await fetch(`/api/juego/${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (gameRes.ok) {
          const html = await gameRes.text();
          setGameHtml(html);
        } else {
          const errData = await gameRes.json().catch(() => ({}));
          if (errData.code === 'LOCKED') {
            setNeedsUnlock(true);
            setLoading(false);
            return;
          }
          setError('No se pudo cargar el juego');
          setLoading(false);
          return;
        }
      } catch {
        setError('Error al cargar el juego');
        setLoading(false);
        return;
      }

      accessTokenRef.current = session.access_token;
      startTimeRef.current = Date.now();
      try {
        const res = await fetch('/api/sesion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ gameId: id }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.sessionId) sessionIdRef.current = data.sessionId;
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    const token = () => accessTokenRef.current;
    const endSession = (durationSeconds) => {
      const sid = sessionIdRef.current;
      if (!sid || !token()) return;
      const body = JSON.stringify({ sessionId: sid, duration_seconds: durationSeconds });
      fetch('/api/sesion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body,
        keepalive: true,
      }).catch(() => {});
    };
    const handleBeforeUnload = () => {
      const duration = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
      endSession(duration);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      const duration = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
      endSession(duration);
    };
  }, []);

  const width = game?.game_width ?? DEFAULT_WIDTH;
  const height = game?.game_height ?? DEFAULT_HEIGHT;

  const shareUrl = `${BASE_URL}/jugar/${id}`;
  const shareText = `Jugá ${game?.title || 'este juego'} en Campus San Andrés: ${shareUrl}`;
  const border = '#2a2a3a';
  const textMuted = '#94a3b8';

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

  function handleShare(mode) {
    if (mode === 'whatsapp') {
      handleShareWhatsApp();
    } else if (mode === 'copy') {
      void handleShareCopy('Link copiado');
    }
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

  function toggleFullscreen() {
    const el = gameContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch(() => {});
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

  const actionBar = (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-2 py-3">
      <button
        type="button"
        onClick={toggleFullscreen}
        className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition-colors"
        style={{ borderColor: border, color: textMuted }}
      >
        ⛶ Expandir
      </button>
      <button
        type="button"
        onClick={handleToggleLike}
        disabled={liking}
        className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold border border-[#2a2a3a] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 cursor-pointer"
        style={{ color: userLiked ? '#ef4444' : '#94a3b8', background: '#0a0a0f' }}
        aria-label={userLiked ? 'Quitar like' : 'Dar like'}
      >
        <span>{userLiked ? '❤️' : '🤍'}</span>
        <span>Me gusta ({totalLikes})</span>
      </button>
      <button
        type="button"
        onClick={() => setShowHighScores(true)}
        className="text-sm font-bold px-4 py-2.5 rounded-xl border border-[#2a2a3a] cursor-pointer hover:opacity-90 transition-colors"
        style={{ color: '#eab308', background: '#0a0a0f' }}
      >
        🏆 Top 10
      </button>
      <div className="relative" ref={shareRef}>
        <button
          type="button"
          onClick={() => setShareOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold border border-[#2a2a3a] transition-transform duration-150 hover:scale-[1.02] cursor-pointer"
          style={{ color: '#94a3b8', background: '#0a0a0f' }}
          aria-label="Compartir"
        >
          <IconShare />
          <span>Compartir</span>
        </button>
        {shareOpen && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[60] rounded-xl border py-1 min-w-[200px] shadow-xl"
            style={{ background: '#13131a', borderColor: '#2a2a3a' }}
          >
            <button type="button" onClick={() => handleShare('whatsapp')}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[#1a1a2a] cursor-pointer" style={{ color: '#f1f5f9' }}>
              📱 WhatsApp
            </button>
            <button type="button" onClick={() => handleShare('copy')}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[#1a1a2a] cursor-pointer" style={{ color: '#f1f5f9' }}>
              🔗 Copiar link
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#0a0a0f] text-[#f1f5f9]">
      {/* Toast de copiado */}
      {copyMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2 text-sm font-medium bg-[#13131a] border border-[#2a2a3a] shadow-lg" style={{ color: '#f1f5f9' }}>
          {copyMessage}
        </div>
      )}

      {/* Modal highscores */}
      {showHighScores && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowHighScores(false)}
        >
          <div
            className="rounded-2xl border p-6 max-w-sm w-full"
            style={{ background: '#13131a', borderColor: '#2a2a3a' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>🏆 Top 10 — {game?.title}</h2>
              <button type="button" onClick={() => setShowHighScores(false)} className="text-lg cursor-pointer" style={{ color: '#94a3b8' }}>✕</button>
            </div>
            {highScores.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: '#94a3b8' }}>Todavía no hay puntajes. ¡Sé el primero!</p>
            ) : (
              <div className="space-y-2">
                {highScores.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      background: i === 0 ? 'rgba(234,179,8,0.15)' : i === 1 ? 'rgba(148,163,184,0.1)' : i === 2 ? 'rgba(180,83,9,0.1)' : 'transparent',
                      borderLeft: i < 3 ? `3px solid ${i === 0 ? '#eab308' : i === 1 ? '#94a3b8' : '#b45309'}` : '3px solid transparent',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold w-6 text-center" style={{ color: i === 0 ? '#eab308' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#64748b' }}>{i + 1}</span>
                      <span className="text-sm truncate" style={{ color: '#f1f5f9' }}>{s.profiles?.first_name || 'Anónimo'}</span>
                    </div>
                    <span className="text-sm font-black tabular-nums" style={{ color: '#7c3aed' }}>{Number(s.score).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header mínimo */}
      <header className="flex-shrink-0 flex items-center px-4 py-2.5 border-b border-[#2a2a3a] bg-[#13131a]">
        <Link href="/dashboard" className="text-sm font-medium cursor-pointer hover:opacity-80 shrink-0 w-16" style={{ color: '#94a3b8' }}>
          ← Volver
        </Link>
        <h1 className="text-sm font-bold truncate mx-2 min-w-0 text-center flex-1" style={{ color: '#f1f5f9' }}>
          {game?.title || 'Juego'}
        </h1>
        <div className="w-16 shrink-0" aria-hidden="true" />
      </header>

      {/* Contenido principal */}
      <main className={`flex-1 flex flex-col min-h-0 overflow-hidden relative ${!needsUnlock ? 'pb-[5.5rem] lg:pb-0' : ''}`}>
        {needsUnlock && game && (
          <UnlockGameModal
            isOpen={needsUnlock}
            onClose={() => router.push('/juegos')}
            game={{ id: game.id, title: game.title }}
            userCredits={unlockCredits}
            hasAllAccess={userHasAllAccess}
            onUnlockSuccess={() => window.location.reload()}
          />
        )}

        {/* Juego */}
        {!needsUnlock && (
          <>
            <div className="flex-1 flex items-center justify-center w-full p-2 lg:p-4 min-h-0">
              <div
                ref={gameContainerRef}
                className="rounded-xl overflow-hidden border-2 border-[#2a2a3a] shadow-xl fullscreen:border-0 fullscreen:rounded-none flex items-center justify-center max-w-full max-h-full"
                style={{ background: '#000', width: 'min(100%, 100vw - 1rem)', height: 'auto' }}
              >
                {!needsUnlock && gameHtml && (
                  <iframe
                    srcDoc={gameHtml}
                    title={game?.title || 'Juego'}
                    sandbox="allow-scripts allow-same-origin"
                    width={width}
                    height={height}
                    className="block border-0 bg-black max-w-full"
                    style={{
                      maxWidth: '100%',
                      width: isFullscreen ? '100vw' : width,
                      height: isFullscreen ? '100vh' : height,
                      objectFit: 'contain',
                    }}
                  />
                )}
              </div>
            </div>
            {/* Barra de acciones: fija abajo en mobile, debajo del juego en desktop (una sola instancia → shareRef OK) */}
            <div className="flex-shrink-0 border-t border-[#2a2a3a] bg-[#13131a] fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)] lg:static lg:z-auto lg:pb-0">
              {actionBar}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
