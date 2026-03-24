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

  const html = body?.html;
  if (!html) return NextResponse.json({ error: 'Falta HTML' }, { status: 400 });

  const systemPrompt = `Sos un moderador de contenido para una plataforma educativa de un colegio (St. Andrew's Scots School, alumnos de 5 a 18 años).

Tu trabajo es analizar el código HTML de un juego y verificar DOS cosas:

1. CONTENIDO APROPIADO — Verificar que el juego NO contenga:
   - Gore explícito, sangre excesiva, desmembramiento
   - Desnudez o contenido sexual de cualquier tipo
   - Insultos, malas palabras, lenguaje inapropiado
   - Bullying, ataques personales, violencia contra personas reales
   - Racismo, discriminación, contenido de odio
   - Temáticas religiosas o políticas controversiales
   - Referencias a drogas, alcohol o tabaco
   
   PERMITIDO: disparos, explosiones, espadas, peleas, zombies, monstruos, sangre leve tipo caricatura (rating 9+ / E10+)

2. SCORE REPORTING — Verificar si el juego incluye esta línea o algo equivalente:
   window.parent.postMessage({ type: 'GAME_SCORE', score: VARIABLE }, '*')
   Si NO la tiene, indicar dónde sería el mejor lugar para agregarla y qué variable usar como score.

Respondé en formato JSON exacto (sin markdown, sin backticks):
{
  "contentApproved": true/false,
  "contentIssues": ["lista de problemas encontrados"] o [],
  "rejectionMessage": "mensaje sugerido para el alumno si hay problemas" o null,
  "hasScoreReporting": true/false,
  "scoreFixSuggestion": "descripción de dónde agregar el postMessage y qué variable usar" o null
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: `Analizá este juego HTML:\n\n${html.substring(0, 50000)}` },
        ],
        system: systemPrompt,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Error al analizar' }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    let analysis;
    try {
      analysis = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      analysis = { contentApproved: true, contentIssues: [], hasScoreReporting: false, scoreFixSuggestion: null, raw: text };
    }

    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    return NextResponse.json({ error: 'Error al analizar: ' + err.message }, { status: 500 });
  }
}
