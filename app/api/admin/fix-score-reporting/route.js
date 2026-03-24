import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

export async function POST(request) {
  if (!supabaseUrl || !supabaseServiceKey || !anthropicKey) {
    return NextResponse.json({ error: 'Config incompleta' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabaseAuth.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const gameId = body?.gameId;
  if (!gameId) return NextResponse.json({ error: 'Falta gameId' }, { status: 400 });

  const { data: game } = await supabaseAdmin
    .from('games')
    .select('id, file_url')
    .eq('id', gameId)
    .single();
  if (!game?.file_url) return NextResponse.json({ error: 'Juego sin archivo' }, { status: 404 });

  let html;
  try {
    const res = await fetch(game.file_url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'No se pudo cargar el HTML' }, { status: 502 });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: 'Error cargando HTML' }, { status: 502 });
  }

  // Approach eficiente: pedir a la IA solo la línea a insertar y la variable de score
  const analysisPrompt = `Analizá este código de juego HTML y decime:
1. ¿Cuál es la variable que contiene el puntaje/score del jugador?
2. ¿En qué función o evento se detecta el game over / fin de partida?

Respondé SOLO en formato JSON exacto (sin markdown, sin backticks):
{
  "scoreVariable": "nombre de la variable de score",
  "gameOverFunction": "nombre de la función donde ocurre el game over"
}

Si no podés determinar la variable de score, usá "0" como scoreVariable.`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [
          { role: 'user', content: analysisPrompt + '\n\nCÓDIGO (primeros 30000 caracteres):\n' + html.substring(0, 30000) },
        ],
      }),
    });

    if (!aiRes.ok) {
      return NextResponse.json({ error: 'Error de IA' }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const text = aiData.content?.[0]?.text || '';

    let analysis;
    try {
      analysis = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      analysis = { scoreVariable: '0', gameOverFunction: null };
    }

    const scoreVar = analysis.scoreVariable || '0';

    // Script que reporta el score de múltiples formas para cubrir todos los casos
    const scoreScript = `
<script>
// Score reporting para Campus San Andrés
(function() {
  var lastReportedScore = -1;
  
  // Intentar enviar el score cada 5 segundos
  setInterval(function() {
    try {
      var currentScore = ${scoreVar};
      if (typeof currentScore === 'number' && currentScore > lastReportedScore) {
        window.parent.postMessage({ type: 'GAME_SCORE', score: currentScore }, '*');
        lastReportedScore = currentScore;
      }
    } catch(e) {}
  }, 5000);
  
  // Enviar al perder visibilidad (usuario sale del juego)
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      try {
        var currentScore = ${scoreVar};
        if (typeof currentScore === 'number' && currentScore > 0) {
          window.parent.postMessage({ type: 'GAME_SCORE', score: currentScore }, '*');
        }
      } catch(e) {}
    }
  });
  
  // Enviar antes de cerrar
  window.addEventListener('beforeunload', function() {
    try {
      var currentScore = ${scoreVar};
      if (typeof currentScore === 'number' && currentScore > 0) {
        window.parent.postMessage({ type: 'GAME_SCORE', score: currentScore }, '*');
      }
    } catch(e) {}
  });
})();
</script>`;

    // Insertar justo antes de </body>
    let fixedHtml = html;
    const bodyClose = fixedHtml.lastIndexOf('</body>');
    if (bodyClose > -1) {
      fixedHtml = fixedHtml.substring(0, bodyClose) + scoreScript + '\n' + fixedHtml.substring(bodyClose);
    } else {
      // Si no hay </body>, insertar al final
      fixedHtml = fixedHtml + scoreScript;
    }

    // Verificar que se insertó
    if (!fixedHtml.includes('GAME_SCORE')) {
      return NextResponse.json({ error: 'No se pudo insertar el score reporting' }, { status: 500 });
    }

    // Subir el HTML fijado a Supabase Storage
    const filename = `game-fix-${gameId}-${Date.now()}.html`;
    const htmlBuffer = Buffer.from(fixedHtml, 'utf-8');

    const { error: uploadError } = await supabaseAdmin.storage
      .from('games')
      .upload(filename, htmlBuffer, { contentType: 'text/html', upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: 'Error subiendo HTML fijado' }, { status: 502 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('games').getPublicUrl(filename);

    // Actualizar el file_url del juego
    await supabaseAdmin
      .from('games')
      .update({ file_url: urlData.publicUrl })
      .eq('id', gameId);

    return NextResponse.json({ ok: true, scoreVariable: scoreVar });
  } catch (err) {
    return NextResponse.json({ error: 'Error: ' + err.message }, { status: 500 });
  }
}
