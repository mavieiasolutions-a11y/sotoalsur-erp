import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { EstadoPago, EstadoObra, TipoTransaccion, TipoRol } from './supabase/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// FORMATTING
// ============================================================
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return format(parseISO(dateString), 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: es })
}

export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return '—'
  return `${hours.toFixed(2)}h`
}

// ============================================================
// ESTADO OBRA
// ============================================================
export const estadoObraConfig: Record<
  EstadoObra,
  { label: string; color: string; bgColor: string }
> = {
  PLANIFICACION: {
    label: 'Planificación',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/20',
  },
  EN_PROGRESO: {
    label: 'En Progreso',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/20',
  },
  PAUSADA: {
    label: 'Pausada',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10 border-amber-400/20',
  },
  FINALIZADA: {
    label: 'Finalizada',
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10 border-slate-400/20',
  },
}

// ============================================================
// ESTADO PAGO
// ============================================================
export const estadoPagoConfig: Record<
  EstadoPago,
  { label: string; color: string; bgColor: string }
> = {
  PENDIENTE: {
    label: 'Pendiente',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10 border-amber-400/20',
  },
  PAGADO: {
    label: 'Pagado',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/20',
  },
  RECHAZADO: {
    label: 'Rechazado',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/20',
  },
}

// ============================================================
// TIPO TRANSACCION
// ============================================================
export const tipoTransaccionConfig: Record<TipoTransaccion, { label: string; esGasto: boolean }> = {
  PRESUPUESTO_INICIAL: { label: 'Presupuesto Inicial', esGasto: false },
  ADICIONAL: { label: 'Adicional', esGasto: false },
  GASTO_MATERIAL: { label: 'Gasto Material', esGasto: true },
  NOMINA: { label: 'Nomina', esGasto: true },
  SUBCONTRATO: { label: 'Subcontrato', esGasto: true },
  PAGO_CLIENTE: { label: 'Pago Cliente', esGasto: false },
  GASTO_FLOTA: { label: 'Gasto Flota', esGasto: true },
}

// ============================================================
// ROL
// ============================================================
export const rolConfig: Record<TipoRol, { label: string; color: string }> = {
  PROPIETARIO: { label: 'Propietario', color: 'text-violet-400' },
  SECRETARIA: { label: 'Secretaria', color: 'text-blue-400' },
  TRABAJADOR: { label: 'Trabajador', color: 'text-slate-400' },
}

// ============================================================
// FLOTA - dias hasta vencimiento
// ============================================================
export function getDiasHastaVencimiento(fechaString: string): number {
  return differenceInDays(parseISO(fechaString), new Date())
}

export function getNivelAlertaFlota(
  diasITV: number,
  diasSeguro: number
): 'CRITICO' | 'ALERTA' | 'OK' {
  const minDias = Math.min(diasITV, diasSeguro)
  if (minDias <= 7) return 'CRITICO'
  if (minDias <= 30) return 'ALERTA'
  return 'OK'
}

export const alertaFlotaConfig = {
  CRITICO: {
    label: 'Critico',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
    dot: 'bg-red-500',
  },
  ALERTA: {
    label: 'Alerta',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  OK: {
    label: 'OK',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
}

// ============================================================
// MESES EN ESPANOL
// ============================================================
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
