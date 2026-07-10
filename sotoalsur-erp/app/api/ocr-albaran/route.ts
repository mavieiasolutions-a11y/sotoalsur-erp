import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const webhookUrl = process.env.N8N_OCR_ALBARAN_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook de OCR no configurado' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { file_url, obra_id, registrado_por } = body

    if (!file_url) {
      return NextResponse.json(
        { error: 'file_url es requerido' },
        { status: 400 }
      )
    }

    // Forward to n8n OCR webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url,
        obra_id: obra_id ?? null,
        registrado_por: registrado_por ?? user.id,
        user_id: user.id,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('[OCR Webhook] Error from n8n:', errorText)
      return NextResponse.json(
        { error: 'Error al procesar el webhook OCR', details: errorText },
        { status: n8nResponse.status }
      )
    }

    const result = await n8nResponse.json().catch(() => ({ success: true }))

    return NextResponse.json({
      success: true,
      message: 'Documento enviado a OCR correctamente',
      data: result,
    })
  } catch (error) {
    console.error('[OCR Webhook] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
