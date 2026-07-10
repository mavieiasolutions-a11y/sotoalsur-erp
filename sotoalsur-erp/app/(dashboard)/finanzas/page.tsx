'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/useRole'
import { toast } from 'sonner'
import {
  Plus, Search, Filter, DollarSign, TrendingUp, TrendingDown, X, Loader2,
  FileText, AlertCircle, CheckCircle, XCircle, ChevronDown, Upload
} from 'lucide-react'
import {
  formatCurrency, formatDate, estadoPagoConfig, tipoTransaccionConfig, cn
} from '@/lib/utils'
import type {
  ContabilidadFinanza, ObraProyecto, DirectorioEntidad,
  TipoTransaccion, EstadoPago, InsertContabilidad
} from '@/lib/supabase/types'
import { Skeleton } from '@/components/ui/skeleton'

const TIPOS: TipoTransaccion[] = [
  'PRESUPUESTO_INICIAL', 'ADICIONAL', 'GASTO_MATERIAL', 'NOMINA',
  'SUBCONTRATO', 'PAGO_CLIENTE', 'GASTO_FLOTA'
]
const ESTADOS: EstadoPago[] = ['PENDIENTE', 'PAGADO', 'RECHAZADO']

// ── Asiento Modal ──
function AsientoModal({
  open, onClose, onSaved, obras, entidades, userId,
}: {
  open: boolean; onClose: () => void; onSaved: () => void
  obras: ObraProyecto[]; entidades: DirectorioEntidad[]; userId: string
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Partial<InsertContabilidad>>({
    tipo: 'GASTO_MATERIAL', estado: 'PENDIENTE',
    monto_neto: 0, impuestos_iva: 0,
    fecha_emision: new Date().toISOString().split('T')[0],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.concepto || !form.monto_neto || !form.tipo || !form.fecha_emision) {
      toast.error('Completa los campos obligatorios'); return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('contabilidad_finanzas').insert({
      concepto: form.concepto!, monto_neto: form.monto_neto!, impuestos_iva: form.impuestos_iva ?? 0,
      tipo: form.tipo!, estado: form.estado ?? 'PENDIENTE', fecha_emision: form.fecha_emision!,
      obra_id: form.obra_id ?? null, entidad_id: form.entidad_id ?? null,
      fecha_vencimiento: form.fecha_vencimiento ?? null, numero_factura: form.numero_factura ?? null,
      registrado_por: userId,
    })
    setLoading(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Asiento registrado correctamente')
    onSaved(); onClose()
    setForm({ tipo: 'GASTO_MATERIAL', estado: 'PENDIENTE', monto_neto: 0, impuestos_iva: 0, fecha_emision: new Date().toISOString().split('T')[0] })
  }

  if (!open) return null
  const totalPreview = (form.monto_neto ?? 0) + (form.impuestos_iva ?? 0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border/30 sticky top-0 glass-strong">
          <h2 className="text-lg font-semibold">Nuevo Asiento Contable</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent/50"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Concepto *</label>
            <input required value={form.concepto ?? ''} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
              placeholder="Descripción del asiento contable"
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Tipo *</label>
              <select required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoTransaccion }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                {TIPOS.map(t => <option key={t} value={t}>{tipoTransaccionConfig[t].label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Estado</label>
              <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoPago }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                {ESTADOS.map(e => <option key={e} value={e}>{estadoPagoConfig[e].label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Monto Neto (€) *</label>
              <input required type="number" min="0" step="0.01" value={form.monto_neto ?? ''} onChange={e => setForm(f => ({ ...f, monto_neto: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">IVA (€)</label>
              <input type="number" min="0" step="0.01" value={form.impuestos_iva ?? ''} onChange={e => setForm(f => ({ ...f, impuestos_iva: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          {totalPreview > 0 && (
            <div className="glass rounded-xl px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total con IVA:</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(totalPreview)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Obra</label>
              <select value={form.obra_id ?? ''} onChange={e => setForm(f => ({ ...f, obra_id: e.target.value || undefined }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Sin obra</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nombre_obra}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Entidad (Cliente/Proveedor)</label>
              <select value={form.entidad_id ?? ''} onChange={e => setForm(f => ({ ...f, entidad_id: e.target.value || undefined }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Sin entidad</option>
                {entidades.map(e => <option key={e.id} value={e.id}>{e.nombre_comercial} ({e.tipo})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Fecha Emisión *</label>
              <input required type="date" value={form.fecha_emision ?? ''} onChange={e => setForm(f => ({ ...f, fecha_emision: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Fecha Vencimiento</label>
              <input type="date" value={form.fecha_vencimiento ?? ''} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value || undefined }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Número de Factura / Albarán</label>
            <input value={form.numero_factura ?? ''} onChange={e => setForm(f => ({ ...f, numero_factura: e.target.value || undefined }))}
              placeholder="FAC-2024-001 o ALB-001"
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-muted/50 text-muted-foreground hover:bg-muted border border-border">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))' }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Registrar Asiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ──
export default function FinanzasPage() {
  const { canWrite, perfil } = useRole()
  const [registros, setRegistros] = useState<ContabilidadFinanza[]>([])
  const [obras, setObras] = useState<ObraProyecto[]>([])
  const [entidades, setEntidades] = useState<DirectorioEntidad[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoTransaccion | 'TODOS'>('TODOS')
  const [filtroEstado, setFiltroEstado] = useState<EstadoPago | 'TODOS'>('TODOS')
  const [modalOpen, setModalOpen] = useState(false)

  async function fetchData() {
    const supabase = createClient()
    const [regRes, obrasRes, entRes] = await Promise.all([
      supabase.from('contabilidad_finanzas').select('*, obras_proyectos(id, nombre_obra), directorio_entidades(id, nombre_comercial)').order('created_at', { ascending: false }),
      supabase.from('obras_proyectos').select('*'),
      supabase.from('directorio_entidades').select('*'),
    ])
    setRegistros(regRes.data ?? [])
    setObras(obrasRes.data ?? [])
    setEntidades(entRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = registros.filter(r => {
    const matchSearch = r.concepto.toLowerCase().includes(search.toLowerCase()) ||
      (r.numero_factura?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchTipo = filtroTipo === 'TODOS' || r.tipo === filtroTipo
    const matchEstado = filtroEstado === 'TODOS' || r.estado === filtroEstado
    return matchSearch && matchTipo && matchEstado
  })

  const totalIngresos = registros.filter(r => !tipoTransaccionConfig[r.tipo].esGasto).reduce((s, r) => s + (r.monto_total ?? 0), 0)
  const totalGastos = registros.filter(r => tipoTransaccionConfig[r.tipo].esGasto).reduce((s, r) => s + (r.monto_total ?? 0), 0)
  const saldo = totalIngresos - totalGastos
  const pendientes = registros.filter(r => r.estado === 'PENDIENTE').length

  async function handleAprobarPago(id: string) {
    if (!canWrite) { toast.error('Sin permisos'); return }
    const supabase = createClient()
    const { error } = await supabase.from('contabilidad_finanzas').update({ estado: 'PAGADO' }).eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Pago aprobado')
    fetchData()
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <AsientoModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchData} obras={obras} entidades={entidades} userId={perfil?.id ?? ''} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finanzas y Contabilidad</h1>
          <p className="text-sm text-muted-foreground">{registros.length} asientos registrados</p>
        </div>
        {canWrite && (
          <button id="btn-nuevo-asiento" onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))' }}>
            <Plus className="w-4 h-4" />Nuevo Asiento
          </button>
        )}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card-emerald glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Total Ingresos</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(totalIngresos)}</p>
        </div>
        <div className="kpi-card-amber glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Total Gastos</p>
          <p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(totalGastos)}</p>
        </div>
        <div className={`glass rounded-2xl p-4 ${saldo >= 0 ? 'kpi-card-blue' : 'kpi-card-violet'}`}>
          <p className="text-xs text-muted-foreground">Saldo Neto</p>
          <p className={`text-xl font-bold mt-1 ${saldo >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatCurrency(saldo)}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-amber-500/20">
          <p className="text-xs text-muted-foreground">Pendientes de Pago</p>
          <p className="text-xl font-bold text-amber-400 mt-1">{pendientes}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar concepto o número de factura..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as TipoTransaccion | 'TODOS')}
          className="px-3 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="TODOS">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{tipoTransaccionConfig[t].label}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as EstadoPago | 'TODOS')}
          className="px-3 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="TODOS">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{estadoPagoConfig[e].label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                {['Concepto', 'Tipo', 'Obra', 'Entidad', 'Fecha', 'Neto', 'IVA', 'Total', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Sin registros que coincidan con los filtros</td></tr>
              ) : (
                filtered.map(r => {
                  const tipoCfg = tipoTransaccionConfig[r.tipo]
                  const estadoCfg = estadoPagoConfig[r.estado]
                  const obra = (r as any).obras_proyectos
                  const entidad = (r as any).directorio_entidades
                  return (
                    <tr key={r.id} className="border-b border-border/10 table-row-hover">
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-foreground/90 truncate">{r.concepto}</p>
                        {r.numero_factura && <p className="text-[10px] text-muted-foreground">{r.numero_factura}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{tipoCfg.label}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">{obra?.nombre_obra ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">{entidad?.nombre_comercial ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(r.fecha_emision)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(r.monto_neto)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(r.impuestos_iva)}</td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${tipoCfg.esGasto ? 'text-red-400' : 'text-emerald-400'}`}>
                        {tipoCfg.esGasto ? '-' : '+'}{formatCurrency(r.monto_total ?? r.monto_neto)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${estadoCfg.bgColor} ${estadoCfg.color}`}>
                          {estadoCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canWrite && r.estado === 'PENDIENTE' && (
                          <button id={`btn-aprobar-pago-${r.id}`} onClick={() => handleAprobarPago(r.id)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
                            Aprobar Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
