'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/utils/supabase/client.js';
import { useDashboardTheme } from '@/lib/use-dashboard-theme.js';
import { useUser } from '@/lib/user-context.js';
import { DashboardNavbar } from '@/components/dashboard-navbar.js';
import { MobileBottomNav } from '@/components/mobile-bottom-nav.js';

// Mensaje inicial de Andy según docs/andy-system-prompt.md
const ANDY_FIRST_MESSAGE = '¡Hola! Soy Andy, tu asistente del Game Lab 🎮 Contame, ¿qué juego querés crear hoy?';

// 30 ideas de juegos para inspirar a alumnos de primaria y secundaria (SASS). prompt = texto que se envía al chat al hacer clic.
const IDEAS_JUEGOS = [
  { emoji: '🚀', titulo: 'Naves espaciales', descripcion: 'Dispará a asteroides y enemigos en el espacio', prompt: 'Quiero un juego de naves espaciales donde tenga que esquivar asteroides y disparar a enemigos. Con power-ups y varios niveles.' },
  { emoji: '👻', titulo: 'Fantasmas en el colegio', descripcion: 'Recorré el SASS de noche esquivando fantasmas', prompt: 'Un juego de aventura donde recorro el colegio de noche y tengo que esquivar fantasmas. Que sea un poco de miedo pero divertido.' },
  { emoji: '🏉', titulo: 'Rugby SASS', descripcion: 'Llevá la pelota al try esquivando rivales', prompt: 'Quiero un juego de rugby del SASS. Tengo que llevar la pelota al try esquivando a los rivales. Con teclado o touch.' },
  { emoji: '🧮', titulo: 'Quiz de matemáticas', descripcion: 'Respondé cuentas antes de que se acabe el tiempo', prompt: 'Un juego de preguntas de matemáticas con tiempo. Sumas, restas y multiplicaciones. Que sume puntos por cada respuesta correcta.' },
  { emoji: '🦈', titulo: 'Tiburón hambriento', descripcion: 'Comé peces chicos y crecé, evitá los grandes', prompt: 'Un juego como el del tiburón que come peces y crece. En el mar, con peces chicos y grandes. Si como chicos crezco, si toco grandes pierdo.' },
  { emoji: '🎃', titulo: 'Laberinto de Halloween', descripcion: 'Salí del laberinto antes de que te atrapen', prompt: 'Un laberinto de Halloween donde tengo que encontrar la salida antes de que me atrapen los monstruos. Con coleccionables.' },
  { emoji: '⚽', titulo: 'Penales al arco', descripcion: 'Pateá penales y tratá de meter goles', prompt: 'Juego de penales. Yo pateo al arco y el arquero intenta tapar. Con barras de potencia y dirección. Para celular.' },
  { emoji: '🧩', titulo: 'Rompecabezas de casas', descripcion: 'Armá el escudo de las 4 Houses del SASS', prompt: 'Un rompecabezas con los escudos o colores de las 4 Houses del colegio (William Brown, James Dodds, James Fleming, John Monteith).' },
  { emoji: '🐉', titulo: 'Dragón que escupe fuego', descripcion: 'Volá y quemá castillos enemigos', prompt: 'Un juego donde controlo un dragón que vuela y escupe fuego. Tengo que destruir torres de castillos. Con niveles y jefe final.' },
  { emoji: '🎨', titulo: 'Pintar por números', descripcion: 'Completá dibujos del campus con colores', prompt: 'Juego para pintar por números dibujos del campus o del colegio. Que sea relajado y con colores lindos.' },
  { emoji: '🏑', titulo: 'Hockey sobre césped', descripcion: 'Meté goles con el stick en el arco rival', prompt: 'Juego de hockey sobre césped. Controlo un jugador, tengo que llevar la bocha y meter goles. Con teclado o botones en pantalla.' },
  { emoji: '🦖', titulo: 'Dinosaurio corredor', descripcion: 'Saltá cactus y obstáculos sin parar', prompt: 'Un juego tipo runner donde un dinosaurio corre y tiene que saltar obstáculos. Que sea infinito y vaya aumentando la velocidad.' },
  { emoji: '🗺️', titulo: 'Aventura por el campus', descripcion: 'Explorá edificios y encontrá objetos escondidos', prompt: 'Aventura por el campus del SASS. Recorro diferentes edificios y tengo que encontrar objetos. Con un mapa y misiones.' },
  { emoji: '🧠', titulo: 'Memotest de banderas', descripcion: 'Encontrá las parejas de banderas del mundo', prompt: 'Memotest de banderas de países. Doy vuelta cartas y tengo que encontrar las parejas. Con tiempo o movimientos limitados.' },
  { emoji: '🐧', titulo: 'Pingüino en el hielo', descripcion: 'Deslizate y juntá peces sin caerte', prompt: 'Un pingüino que se desliza por el hielo y tiene que juntar peces. Que sea ágil y con obstáculos.' },
  { emoji: '🎭', titulo: 'Gaitero escocés', descripcion: 'Ayudá al gaitero a llegar al escenario', prompt: 'Un juego con un gaitero escocés (como el del SASS) que tiene que llegar al escenario esquivando obstáculos. Con música o sonidos.' },
  { emoji: '🚗', titulo: 'Carrera de karts', descripcion: 'Corré una vuelta y ganale a los rivales', prompt: 'Carrera de karts en una pista. Tengo que dar una vuelta y llegar primero. Con acelerar, frenar y esquivar.' },
  { emoji: '👾', titulo: 'Invasión de aliens', descripcion: 'Destruí olas de marcianos que bajan', prompt: 'Juego tipo space invaders. Aliens bajan y yo los voy destruyendo con un cañón. Con vidas y niveles.' },
  { emoji: '📚', titulo: 'Quiz de historia', descripcion: 'Respondé preguntas de historia argentina', prompt: 'Quiz de historia argentina. Preguntas de múltiple opción con tiempo. Que sume puntos y tenga 3 vidas.' },
  { emoji: '🦊', titulo: 'Zorro y gallinas', descripcion: 'Atrapá las gallinas antes de que escapen', prompt: 'Un zorro tiene que atrapar gallinas que corren por el corral. Las gallinas se mueven y yo las persigo. Para dos jugadores o contra la compu.' },
  { emoji: '🏰', titulo: 'Defender el castillo', descripcion: 'Lanzá proyectiles a los enemigos que escalan', prompt: 'Tengo que defender un castillo. Enemigos escalan la pared y yo les tiro piedras o flechas. Con upgrades.' },
  { emoji: '🎯', titulo: 'Tiro al blanco', descripcion: 'Apunta y dispará para sumar puntos', prompt: 'Juego de tiro al blanco. Apunto y disparo, cada anillo suma distinto. Que sea para celular con touch.' },
  { emoji: '🐍', titulo: 'La viborita', descripcion: 'Crecé comiendo y no te chocar con tu cola', prompt: 'La viborita clásica: como cosas y crezco. No puedo chocarme con mi cola ni con las paredes. Con niveles de velocidad.' },
  { emoji: '🌍', titulo: 'Quiz de geografía', descripcion: 'Ubicá países en el mapa del mundo', prompt: 'Quiz de geografía: me muestran un país y tengo que ubicarlo en el mapa. O al revés. Con puntaje y vidas.' },
  { emoji: '🦸', titulo: 'Superhéroe del SASS', descripcion: 'Volá por el campus salvando alumnos', prompt: 'Soy un superhéroe del colegio y tengo que rescatar alumnos atrapados en distintos lugares del campus. Con poder de vuelo.' },
  { emoji: '🍕', titulo: 'Pizzería a domicilio', descripcion: 'Llevá pizzas en moto sin que se caigan', prompt: 'Juego de entregar pizzas en moto. Tengo que llegar a tiempo y que no se caigan. Con obstáculos y clientes en el mapa.' },
  { emoji: '🃏', titulo: 'Truco o Uno', descripcion: 'Jugá una mano contra la computadora', prompt: 'Un juego de cartas simple, tipo Truco o Uno, contra la computadora. Con reglas básicas y puntaje.' },
  { emoji: '🎪', titulo: 'Feria del colegio', descripcion: 'Ganá premios en juegos de la kermesse', prompt: 'Minijuegos de feria del colegio: pesca de peces, tiro al blanco, anillos. Que sume puntos y tenga varios juegos.' },
  { emoji: '🦇', titulo: 'Murciélago en la noche', descripcion: 'Volá entre cuevas y comé insectos', prompt: 'Un murciélago que vuela por cuevas y tiene que comer insectos. Que use el sonar para ver. Con obstáculos y tiempo.' },
  { emoji: '🏴', titulo: 'Bandera escocesa', descripcion: 'Armá el tartán y aprendé sobre Escocia', prompt: 'Juego sobre Escocia y el tartán. Armo patrones o elijo la bandera correcta. Que sea educativo y con colores del SASS.' },
];

// Frases que Andy muestra mientras está generando el juego
const LOADING_PHRASES = [
  'Pensando en los niveles...',
  'Eligiendo assets de Kenney...',
  'Escribiendo el código Phaser...',
  'Ajustando la dificultad...',
  'Agregando power-ups copados...',
  'Balanceando enemigos y obstáculos...',
  'Chequeando que funcione en celular...',
  'Preparando la pantalla de inicio...',
  'Agregando sonidos imaginarios...',
  'Pensando un jefe final épico...',
  'Acomodando las físicas del juego...',
  'Probando que los controles se sientan bien...',
  'Armando la barra de puntaje...',
  'Buscando un fondo bien fachero...',
  'Afinando la velocidad del personaje...',
  'Revisando que todo sea apto para el SASS...',
  'Imaginando cómo lo vas a mejorar después...',
  'Ordenando el código para que lo entiendas...',
  'Agregando un poquito más de diversión...',
  'Cocinando tu juego en la olla gamer...',
];

/** Elige n elementos al azar de un array sin repetir */
function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function GameLabPage() {
  const router = useRouter();
  const [theme, toggleTheme] = useDashboardTheme();
  const { profile, loading: userLoading } = useUser();

  // Mensajes del chat: { role: 'user' | 'andy', content: string }
  const [messages, setMessages] = useState([]);
  // HTML generado por Andy para mostrar en el iframe (srcdoc)
  const [currentHtml, setCurrentHtml] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const loadingRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(false);
  // Para animar la entrada del iframe cuando aparece el juego generado
  const [iframeRevealed, setIframeRevealed] = useState(false);
  // Índice de la frase de carga actual de Andy
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  // 6 ideas al azar para la columna desktop; en mobile se usa el mismo set para el carrusel
  const inspirationCards = useMemo(() => pickRandom(IDEAS_JUEGOS, 6), []);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const accent = '#7c3aed';
  // PRD §6.2: color institucional SASS — títulos, elementos primarios
  const institutionalBlue = '#00478E';
  const isLoading = sending;

  // Protección de ruta: solo usuarios autenticados
  useEffect(() => {
    if (userLoading) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
  }, [userLoading, profile, router]);

  // Mensaje inicial de Andy al montar (una sola vez cuando ya hay perfil)
  useEffect(() => {
    if (!profile || messages.length > 0) return;
    setMessages([{ role: 'andy', content: ANDY_FIRST_MESSAGE }]);
  }, [profile, messages.length]);

  // Scroll al último mensaje cuando se agregan mensajes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mientras Andy está respondiendo, rotar frases de estado cada 2 segundos
  useEffect(() => {
    if (!isLoading) return;
    // Elegir una frase inicial al azar
    setLoadingPhraseIndex((prev) => {
      const next = Math.floor(Math.random() * LOADING_PHRASES.length);
      return next;
    });
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => {
        let next = prev;
        while (next === prev && LOADING_PHRASES.length > 1) {
          next = Math.floor(Math.random() * LOADING_PHRASES.length);
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Hacer scroll automático hasta el indicador de carga mientras Andy responde
  useEffect(() => {
    if (isLoading && loadingRef.current) {
      loadingRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading, loadingPhraseIndex]);

  // Detección de viewport desktop (lg) para mostrar u ocultar tarjetas de inspiración
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    function update() {
      setIsDesktop(mq.matches);
    }
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Cuando hay HTML generado, revelar el iframe tras un frame para que se pinte primero con opacity-0 y luego anime
  useEffect(() => {
    if (!currentHtml) {
      setIframeRevealed(false);
      return;
    }
    const id = requestAnimationFrame(() => setIframeRevealed(true));
    return () => cancelAnimationFrame(id);
  }, [currentHtml]);

  // Ajusta la altura del textarea del input según el contenido, con máximo de 4 líneas aprox.
  function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 4 * 24; // ~4 líneas de 24px
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  /** Envía un mensaje al chat (desde input o desde una tarjeta de inspiración) */
  async function sendMessage(textToSend) {
    if (!(textToSend && typeof textToSend === 'string') || sending) return;
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    setInputValue('');
    setError('');
    const newUserMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, newUserMessage]);
    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSending(false);
        router.replace('/login');
        return;
      }

      const apiMessages = [...messages, newUserMessage].map((m) => ({
        role: m.role === 'andy' ? 'assistant' : 'user',
        content: m.content,
      }));

      const res = await fetch('/api/game-lab/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          newMessage: trimmed,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data = await res.json();
      const andyReply = data.reply || 'No pude generar una respuesta. ¿Probamos de nuevo?';
      setMessages((prev) => [...prev, { role: 'andy', content: andyReply }]);

      if (data.html && typeof data.html === 'string' && data.html.trim()) {
        setCurrentHtml(data.html.trim());
      }
    } catch (err) {
      setError(err?.message || 'Error al enviar. Intentá de nuevo.');
    } finally {
      setSending(false);
      if (inputRef.current) {
        inputRef.current.focus();
        // Resetear altura al enviar para que vuelva al tamaño base
        inputRef.current.style.height = 'auto';
        inputRef.current.style.overflowY = 'hidden';
      }
    }
  }

  function handleSend() {
    sendMessage(inputValue);
  }

  function handleInputChange(e) {
    setInputValue(e.target.value);
    autoResizeTextarea(e.target);
  }

  /** Al hacer clic en una tarjeta de inspiración se envía su prompt y las tarjetas desaparecen */
  function handleInspirationClick(prompt) {
    sendMessage(prompt);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (userLoading || !profile) {
    return (
      <div className="min-h-screen font-sans flex flex-col" style={{ background: bg }}>
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: textMuted }}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: bg }}>
      <DashboardNavbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={async () => {
          const { supabase } = await import('@/utils/supabase/client.js');
          await supabase.auth.signOut();
          router.replace('/login');
        }}
      />

      {/* Contenedor principal: desktop sin juego = max-w 900px centrado, chat 600px + tarjetas 260px gap 32px; desktop con juego = 100% (40% + 60%); mobile = iframe arriba + chat abajo o chat + carrusel */}
      <div className="flex-1 flex flex-col-reverse lg:flex-row pt-14 lg:pt-16 pb-20 lg:pb-6 overflow-hidden">
        <div
          className={`flex-1 flex flex-col-reverse lg:flex-row min-h-0 w-full transition-all duration-300 ease-out ${!currentHtml ? 'lg:max-w-[900px] lg:mx-auto lg:px-8 lg:gap-8' : ''}`}
        >
          {/* ——— Chat: desktop sin juego = flex-1 centrado max 600px; con juego = 40%; mobile = full ——— */}
          <section
            className={`flex flex-col w-full lg:min-h-0 shrink-0 transition-all duration-300 ease-out ${currentHtml ? 'lg:w-[40%] lg:max-w-[480px] lg:border-r' : 'lg:flex-1 lg:min-w-0'}`}
            style={currentHtml ? { borderColor: border } : undefined}
            aria-label="Chat con Andy"
          >
            <div className={`w-full ${!currentHtml ? 'lg:max-w-[600px] lg:mx-auto' : ''}`}>
              {/* Header minimalista: una sola línea, sin avatar */}
              <div className="px-4 py-2.5 border-b shrink-0" style={{ borderColor: border, background: bg }}>
                <h1 className="text-sm font-bold" style={{ color: institutionalBlue }}>Game Lab</h1>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]" style={{ background: bg }}>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'andy' && (
                      <div
                        className="mt-0.5 flex-shrink-0"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          backgroundColor: cardBg,
                        }}
                      >
                        <Image
                          src="/images/andy-avatar.png"
                          alt=""
                          width={48}
                          height={48}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                        />
                      </div>
                    )}
                    <div
                      className="rounded-xl px-4 py-2.5 max-w-[85%] break-words border"
                      style={{
                        background: msg.role === 'user' ? (isDark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.12)') : cardBg,
                        borderColor: msg.role === 'user' ? 'transparent' : border,
                        color: msg.role === 'andy' ? institutionalBlue : text,
                      }}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3" ref={loadingRef}>
                    <div
                      className="flex-shrink-0"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        backgroundColor: cardBg,
                      }}
                    >
                      <Image
                        src="/images/andy-avatar.png"
                        alt=""
                        width={48}
                        height={48}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                      />
                    </div>
                    <div className="rounded-xl px-4 py-2.5 border" style={{ background: cardBg, borderColor: border }}>
                      <p className="text-sm animate-pulse" style={{ color: institutionalBlue }}>
                        {LOADING_PHRASES[loadingPhraseIndex]}
                      </p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input: borde accent en focus; botón vibe-btn-gradient */}
              <div className="p-4 border-t shrink-0" style={{ borderColor: border, background: cardBg }}>
                {error && (
                  <p className="text-sm mb-2" style={{ color: '#ef4444' }}>{error}</p>
                )}
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribí tu idea de juego..."
                    rows={1}
                    className="flex-1 rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-[#7c3aed] focus:ring-[#7c3aed] transition-colors resize-none"
                    style={{
                      background: isDark ? '#0a0a0f' : '#fff',
                      borderColor: border,
                      color: text,
                    }}
                    disabled={sending}
                    aria-label="Mensaje para Andy"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !inputValue.trim()}
                    className="vibe-btn-gradient rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar
                  </button>
                </div>
              </div>

              {/* Mobile: carrusel de ideas debajo del input */}
              {!isDesktop && messages.length === 1 && !currentHtml && !sending && (
                <div className="px-4 pb-4 shrink-0">
                  <p className="text-xs font-semibold mb-2" style={{ color: textMuted }}>
                    ✨ ¿Sin ideas? Probá estas:
                  </p>
                  <div
                    className="flex gap-3 overflow-x-auto overflow-y-hidden pb-1 scroll-smooth snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {inspirationCards.map((idea, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInspirationClick(idea.prompt)}
                        className="flex-shrink-0 w-[38%] min-w-[140px] snap-start rounded-xl border p-3 text-center transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed]"
                        style={{
                          background: cardBg,
                          borderColor: border,
                          color: text,
                        }}
                      >
                        <span className="text-2xl block mb-1">{idea.emoji}</span>
                        <span className="text-xs font-bold block leading-tight line-clamp-2" style={{ color: accent }}>{idea.titulo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ——— Desktop sin juego: columna derecha flotante 260px, tarjetas compactas ——— */}
          {isDesktop && messages.length === 1 && !currentHtml && !sending && (
            <aside
              className="hidden lg:flex flex-col w-[260px] shrink-0 min-h-0 pt-2"
              aria-label="Ideas para arrancar"
            >
              <p className="text-[13px] font-semibold pb-3 mb-3 border-b shrink-0" style={{ color: accent, borderColor: border }}>
                ✨ ¿Sin ideas? Probá estas:
              </p>
              <div className="flex-1 overflow-y-auto space-y-2">
                {inspirationCards.map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleInspirationClick(idea.prompt)}
                    className="w-full rounded-xl border p-2.5 flex items-center gap-3 text-left min-h-[72px] h-[72px] transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-0"
                    style={{
                      background: cardBg,
                      borderColor: border,
                      ['--tw-ring-color']: accent,
                    }}
                  >
                    <span className="text-2xl flex-shrink-0 leading-none">{idea.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-semibold block leading-tight truncate" style={{ color: accent }}>{idea.titulo}</span>
                      <span className="text-xs block leading-snug line-clamp-2 mt-0.5" style={{ color: textMuted }}>{idea.descripcion}</span>
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* ——— Iframe: desktop solo cuando hay juego (60%); mobile siempre en el flujo (arriba por flex-col-reverse) ——— */}
          <section
            className={`flex-1 flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden transition-all duration-300 ease-out ${currentHtml ? 'lg:flex-[6] lg:opacity-100 lg:visible' : 'lg:flex-[0] lg:min-w-0 lg:opacity-0 lg:invisible'}`}
            aria-label="Vista previa del juego"
          >
            <div className="flex-1 p-4 lg:p-6 flex flex-col min-h-0" style={{ background: isDark ? '#0f0f14' : '#f1f5f9' }}>
              <h2 className="text-sm font-bold mb-2" style={{ color: textMuted }}>
                Vista previa
              </h2>
              <div className="flex-1 rounded-xl border overflow-hidden min-h-0 flex flex-col" style={{ borderColor: border, background: '#fff' }}>
                {currentHtml ? (
                  <iframe
                    title="Vista previa del juego generado"
                    sandbox="allow-scripts"
                    srcDoc={currentHtml}
                    className={`w-full h-full min-h-[320px] flex-1 border-0 transition-all duration-300 ease-out ${iframeRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
                  />
                ) : (
                  <div
                    className="w-full flex-1 flex items-center justify-center min-h-[320px]"
                    style={{ color: textMuted }}
                  >
                    <p className="text-sm">El juego aparecerá acá cuando Andy lo genere.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <MobileBottomNav theme={theme} activeTabId="" onTabChange={() => {}} />
    </div>
  );
}
