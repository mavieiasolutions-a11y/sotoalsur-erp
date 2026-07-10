'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIChatProps {
  open: boolean
  onClose: () => void
}

export function AIChat({ open, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '¡Hola! Soy el Asistente de SotoAlsur. Puedo consultarte información sobre obras activas, estados financieros, nóminas, documentos técnicos y más. ¿En qué puedo ayudarte?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const sessionId = useRef(`session-${Date.now()}`)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          session_id: sessionId.current,
        }),
      })

      const data = await res.json()

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Lo siento, no pude procesar tu consulta. Inténtalo de nuevo.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Error de conexión con el agente IA. Verifica que el servicio n8n esté activo.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestedQuestions = [
    '¿Cuál es el estado financiero del mes?',
    '¿Qué obras están en progreso?',
    '¿Qué vehículos tienen ITV próxima?',
  ]

  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-full w-80 z-50 flex flex-col',
        'border-l border-border/50 glass-strong shadow-2xl',
        'transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30 h-16">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
          }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Asistente IA</p>
          <p className="text-[10px] text-muted-foreground">Powered by GPT-4o</p>
        </div>
        <button
          id="ai-chat-close-btn"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))' }}>
                <Bot className="w-3 h-3 text-white" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary/15 border border-primary/20 text-foreground'
                  : 'glass text-foreground/90'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-1">
                {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))' }}>
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="glass rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Analizando...</span>
            </div>
          </div>
        )}

        {/* Suggested questions (only on first message) */}
        {messages.length === 1 && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground/60 text-center">Consultas rápidas</p>
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg glass
                  text-muted-foreground hover:text-foreground hover:bg-accent/30
                  border border-border/30 flex items-center gap-2 transition-colors"
              >
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/30">
        <div className="flex gap-2">
          <textarea
            id="ai-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta..."
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-xl px-3 py-2 text-xs
              bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
              disabled:opacity-50"
          />
          <button
            id="ai-chat-send-btn"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-xl px-3 disabled:opacity-40 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/40 text-center mt-2">
          Enter para enviar · Shift+Enter para salto de línea
        </p>
      </div>
    </div>
  )
}
