'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FichajeButtonProps {
  type: 'ENTRADA' | 'SALIDA'
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
}

export function FichajeButton({
  type,
  onClick,
  loading = false,
  disabled = false,
  className,
}: FichajeButtonProps) {
  const isEntrada = type === 'ENTRADA'

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'relative w-full py-8 rounded-2xl font-bold text-2xl tracking-wide',
        'flex items-center justify-center gap-3',
        'transition-all duration-200 active:scale-[0.97]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        'shadow-xl hover:shadow-2xl',
        isEntrada
          ? 'text-white hover:brightness-110'
          : 'text-white hover:brightness-110',
        className
      )}
      style={{
        background: isEntrada
          ? 'linear-gradient(135deg, oklch(0.55 0.22 168), oklch(0.48 0.20 168))'
          : 'linear-gradient(135deg, oklch(0.55 0.22 22), oklch(0.48 0.20 22))',
        boxShadow: isEntrada
          ? '0 8px 32px oklch(0.55 0.22 168 / 0.35), inset 0 1px 0 oklch(0.70 0.20 168 / 0.3)'
          : '0 8px 32px oklch(0.55 0.22 22 / 0.35), inset 0 1px 0 oklch(0.70 0.20 22 / 0.3)',
      }}
    >
      {/* Gloss overlay */}
      <span
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
        }}
      />

      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : (
        <>
          <span className="text-3xl">{isEntrada ? '🟢' : '🔴'}</span>
          <span>{isEntrada ? 'REGISTRAR ENTRADA' : 'REGISTRAR SALIDA'}</span>
        </>
      )}
    </button>
  )
}
