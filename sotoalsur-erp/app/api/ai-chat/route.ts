import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { message, session_id } = body

  if (!message) {
    return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
  }

  const n8nUrl = process.env.N8N_AI_CHAT_WEBHOOK_URL

  if (!n8nUrl) {
    return NextResponse.json({
      success: true,
      response: 'El servicio de IA no está configurado. Por favor configura N8N_AI_CHAT_WEBHOOK_URL en las variables de entorno.',
      session_id,
    })
  }

  try {
    const res = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: session_id ?? `user-${user.id}`,
        user_id: user.id,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      throw new Error(`n8n respondió con error: ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json({
      success: true,
      response: data.response ?? data.output ?? 'Sin respuesta del agente.',
      session_id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({
      success: false,
      response: `Error al conectar con el agente IA: ${message}. Verifica que el servicio n8n esté activo en el VPS.`,
      session_id,
    }, { status: 200 }) // Return 200 so client shows the error message gracefully
  }
}
