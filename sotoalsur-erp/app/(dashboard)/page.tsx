'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  HardHat, DollarSign, Truck, Clock, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Activity
} from 'lucide-react'
import {
  formatCurrency, formatDate, estadoObraConfig, estadoPagoConfig,
  tipoTransaccionConfig, getDiasHastaVencimiento, getNivelAlertaFlota, alertaFlotaConfig
} from '@/lib/utils'
import type { ObraProyecto, ContabilidadFinanza, FlotaVehiculo, ControlHorario } from '@/lib/supabase/types'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================
// KPI CARD
// ============================================================
function KPICard({
  title, value, subtitle, icon: Icon, cardClass, iconBg,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  cardClass: string
  iconBg: string
}) {
  return (
    <div className={`rounded-2xl p-5 ${cardClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function DashboardPage() {
  const [obras, setObras] = useState<ObraProyecto[]>([])
  const [finanzas, setFinanzas] = useState<ContabilidadFinanza[]>([])
  const [flota, setFlota] = useState<FlotaVehiculo[]>([])
  const [horarios, setHorarios] = useState<ControlHorario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const supabase = createClient()
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const [obrasRes, finanzasRes, flotaRes, horariosRes] = await Promise.all([
        supabase.from('obras_proyectos').select('*').neq('estado', 'FINALIZADA'),
        supabase.from('contabilidad_finanzas').select('*')
          .gte('fecha_emision', startOfMonth).lte('fecha_emision', endOfMonth),
        supabase.from('flota_vehiculos').select('*').eq('activo', true),
        supabase.from('control_horarios').select('*').is('marca_salida', null),
      ])

      setObras(obrasRes.data ?? [])
      setFinanzas(finanzasRes.data ?? [])
      setFlota(flotaRes.data ?? [])
      setHorarios(horariosRes.data ?? [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  // ── Calculations ──
  const obrasActivas = obras.filter((o) => o.estado === 'EN_PROGRESO').length
  const obrasPlanificacion = obras.filter((o) => o.estado === 'PLANIFICACION').length

  const ingresosMes = finanzas
    .filter((f) => ['PAGO_CLIENTE', 'PRESUPUESTO_INICIAL', 'ADICIONAL'].includes(f.tipo))
    .reduce((s, f) => s + (f.monto_total ?? 0), 0)

  const gastosMes = finanzas
    .filter((f) => tipoTransaccionConfig[f.tipo].esGasto)
    .reduce((s, f) => s + (f.monto_total ?? 0), 0)

  const saldoMes = ingresosMes - gastosMes

  const flotaConDias = flota.map((v) => ({
    ...v,
    diasITV: getDiasHastaVencimiento(v.vencimiento_itv),
    diasSeguro: getDiasHastaVencimiento(v.vencimiento_seguro),
  }))
  const flotaCritica = flotaConDias.filter((v) => getNivelAlertaFlota(v.diasITV, v.diasSeguro) === 'CRITICO')
  const flotaAlerta = flotaConDias.filter((v) => getNivelAlertaFlota(v.diasITV, v.diasSeguro) === 'ALERTA')

  const pendientesPago = finanzas.filter((f) => f.estado === 'PENDIENTE').length

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard General</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen operacional del mes actual — {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Obras Activas"
          value={obrasActivas}
          subtitle={`${obrasPlanificacion} en planificación`}
          icon={HardHat}
          cardClass="kpi-card-blue"
          iconBg="bg-blue-500/80"
        />
        <KPICard
          title="Ingresos del Mes"
          value={formatCurrency(ingresosMes)}
          subtitle="Pagos recibidos de clientes"
          icon={TrendingUp}
          cardClass="kpi-card-emerald"
          iconBg="bg-emerald-500/80"
        />
        <KPICard
          title="Gastos del Mes"
          value={formatCurrency(gastosMes)}
          subtitle={`${pendientesPago} asientos pendientes`}
          icon={TrendingDown}
          cardClass="kpi-card-amber"
          iconBg="bg-amber-500/80"
        />
        <KPICard
          title="Saldo Neto Mes"
          value={formatCurrency(saldoMes)}
          subtitle={saldoMes >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
          icon={DollarSign}
          cardClass="kpi-card-violet"
          iconBg={saldoMes >= 0 ? 'bg-violet-500/80' : 'bg-red-500/80'}
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Flota Alerts */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Alertas de Flota</h2>
            {flotaCritica.length > 0 && (
              <span className="ml-auto text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 alert-critico">
                {flotaCritica.length} CRÍTICO
              </span>
            )}
          </div>

          {flotaConDias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay vehículos registrados
            </div>
          ) : (
            <div className="space-y-3">
              {flotaConDias
                .filter((v) => getNivelAlertaFlota(v.diasITV, v.diasSeguro) !== 'OK')
                .slice(0, 5)
                .map((v) => {
                  const nivel = getNivelAlertaFlota(v.diasITV, v.diasSeguro)
                  const cfg = alertaFlotaConfig[nivel]
                  return (
                    <div key={v.id} className={`rounded-xl p-3 border ${cfg.bgColor}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{v.matricula}</p>
                          <p className="text-[10px] text-muted-foreground">{v.marca_modelo}</p>
                        </div>
                        <div className="text-right">
                          {v.diasITV <= 30 && (
                            <p className={`text-[10px] ${cfg.color}`}>ITV: {v.diasITV}d</p>
                          )}
                          {v.diasSeguro <= 30 && (
                            <p className={`text-[10px] ${cfg.color}`}>Seg: {v.diasSeguro}d</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              {flotaConDias.filter((v) => getNivelAlertaFlota(v.diasITV, v.diasSeguro) === 'OK').length === flotaConDias.length && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 py-4 justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                  Toda la flota al día
                </div>
              )}
            </div>
          )}
        </div>

        {/* Obras Status */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardHat className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Estado de Obras</h2>
          </div>
          {obras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No hay obras activas</div>
          ) : (
            <div className="space-y-2">
              {obras.slice(0, 6).map((obra) => {
                const cfg = estadoObraConfig[obra.estado]
                return (
                  <div key={obra.id} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.bgColor} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-foreground truncate flex-1">{obra.nombre_obra}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatCurrency(obra.presupuesto_adjudicado)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Fichajes Activos */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Fichajes Activos</h2>
            <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {horarios.length} activos
            </span>
          </div>
          {horarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Ningún trabajador fichado en este momento
            </div>
          ) : (
            <div className="space-y-2">
              {horarios.slice(0, 6).map((h) => (
                <div key={h.id} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">Trabajador activo</p>
                    <p className="text-[10px] text-muted-foreground">
                      Entrada: {new Date(h.marca_entrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Últimos Asientos del Mes</h2>
        </div>
        {finanzas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No hay asientos registrados este mes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left pb-2 text-muted-foreground font-medium">Concepto</th>
                  <th className="text-left pb-2 text-muted-foreground font-medium">Tipo</th>
                  <th className="text-left pb-2 text-muted-foreground font-medium">Fecha</th>
                  <th className="text-right pb-2 text-muted-foreground font-medium">Total</th>
                  <th className="text-right pb-2 text-muted-foreground font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {finanzas.slice(0, 8).map((f) => {
                  const tipoCfg = tipoTransaccionConfig[f.tipo]
                  const estadoCfg = estadoPagoConfig[f.estado]
                  return (
                    <tr key={f.id} className="border-b border-border/10 table-row-hover">
                      <td className="py-2 text-foreground/80 truncate max-w-[200px]">{f.concepto}</td>
                      <td className="py-2 text-muted-foreground">{tipoCfg.label}</td>
                      <td className="py-2 text-muted-foreground">{formatDate(f.fecha_emision)}</td>
                      <td className={`py-2 text-right font-medium ${tipoCfg.esGasto ? 'text-red-400' : 'text-emerald-400'}`}>
                        {tipoCfg.esGasto ? '-' : '+'}{formatCurrency(f.monto_total ?? f.monto_neto)}
                      </td>
                      <td className="py-2 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${estadoCfg.bgColor} ${estadoCfg.color}`}>
                          {estadoCfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
