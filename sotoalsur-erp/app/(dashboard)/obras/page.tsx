'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/useRole'
import { toast } from 'sonner'
import { Plus, Search, Filter, HardHat, MapPin, Calendar, DollarSign, X, Loader2 } from 'lucide-react'
import {
  formatCurrency, formatDate, estadoObraConfig, cn
} from '@/lib/utils'
import type { ObraProyecto, DirectorioEntidad, EstadoObra, InsertObraProyecto } from '@/lib/supabase/types'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

const ESTADOS: EstadoObra[] = ['PLANIFICACION', 'EN_PROGRESO', 'PAUSADA', 'FINALIZADA']

// ── Modal ──
function ObraModal({
  open, onClose, onSaved, clientes,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clientes: DirectorioEntidad[]
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Partial<InsertObraProyecto>>({
    estado: 'PLANIFICACION',
    presupuesto_adjudicado: 0,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre_obra || !form.zona_trabajo_ubicacion || !form.presupuesto_adjudicado) {
      toast.error('Completa los campos obligatorios')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('obras_proyectos').insert({
      nombre_obra: form.nombre_obra!,
      zona_trabajo_ubicacion: form.zona_trabajo_ubicacion!,
      presupuesto_adjudicado: form.presupuesto_adjudicado!,
      estado: form.estado ?? 'PLANIFICACION',
      cliente_id: form.cliente_id ?? null,
      fecha_inicio: form.fecha_inicio ?? null,
      fecha_fin: form.fecha_fin ?? null,
    })
    setLoading(false)
    if (error) { toast.error('Error al crear obra: ' + error.message); return }
    toast.success('Obra creada correctamente')
    onSaved()
    onClose()
    setForm({ estado: 'PLANIFICACION', presupuesto_adjudicado: 0 })
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border/30">
          <h2 className="text-lg font-semibold">Nueva Obra</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent/50">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Nombre de la Obra *</label>
              <input required value={form.nombre_obra ?? ''} onChange={e => setForm(f => ({ ...f, nombre_obra: e.target.value }))}
                placeholder="Ej: Rehabilitación Fachada C/ Mayor 12"
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Ubicación / Zona de Trabajo *</label>
              <input required value={form.zona_trabajo_ubicacion ?? ''} onChange={e => setForm(f => ({ ...f, zona_trabajo_ubicacion: e.target.value }))}
                placeholder="Dirección o coordenadas GPS"
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">Cliente</label>
                <select value={form.cliente_id ?? ''} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value || undefined }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_comercial}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">Estado</label>
                <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoObra }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {ESTADOS.map(e => <option key={e} value={e}>{estadoObraConfig[e].label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">Presupuesto Adjudicado (€) *</label>
              <input required type="number" min="0" step="0.01" value={form.presupuesto_adjudicado ?? ''} onChange={e => setForm(f => ({ ...f, presupuesto_adjudicado: parseFloat(e.target.value) }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">Fecha Inicio</label>
                <input type="date" value={form.fecha_inicio ?? ''} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value || undefined }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">Fecha Fin Estimada</label>
                <input type="date" value={form.fecha_fin ?? ''} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value || undefined }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-muted/50 text-muted-foreground hover:bg-muted border border-border">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))' }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : 'Crear Obra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ──
export default function ObrasPage() {
  const { canWrite } = useRole()
  const [obras, setObras] = useState<(ObraProyecto & { gasto_total?: number })[]>([])
  const [clientes, setClientes] = useState<DirectorioEntidad[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoObra | 'TODAS'>('TODAS')
  const [modalOpen, setModalOpen] = useState(false)

  async function fetchObras() {
    const supabase = createClient()
    const [obrasRes, clientesRes] = await Promise.all([
      supabase.from('obras_proyectos').select('*, directorio_entidades(id, nombre_comercial)').order('created_at', { ascending: false }),
      supabase.from('directorio_entidades').select('*').eq('tipo', 'CLIENTE'),
    ])
    setObras(obrasRes.data ?? [])
    setClientes(clientesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchObras() }, [])

  const filtered = obras.filter((o) => {
    const matchSearch = o.nombre_obra.toLowerCase().includes(search.toLowerCase()) ||
      o.zona_trabajo_ubicacion.toLowerCase().includes(search.toLowerCase())
    const matchEstado = filtroEstado === 'TODAS' || o.estado === filtroEstado
    return matchSearch && matchEstado
  })

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <ObraModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchObras} clientes={clientes} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Obras y Proyectos</h1>
          <p className="text-sm text-muted-foreground">{obras.length} obras en total</p>
        </div>
        {canWrite && (
          <button id="btn-nueva-obra" onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))' }}>
            <Plus className="w-4 h-4" />
            Nueva Obra
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o ubicación..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['TODAS', ...ESTADOS] as const).map((e) => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium transition-colors border',
                filtroEstado === e
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60'
              )}>
              {e === 'TODAS' ? 'Todas' : estadoObraConfig[e].label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <HardHat className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">No se encontraron obras con los filtros actuales</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((obra) => {
            const cfg = estadoObraConfig[obra.estado]
            const cliente = (obra as any).directorio_entidades
            return (
              <Link key={obra.id} href={`/obras/${obra.id}`}
                className="glass rounded-2xl p-5 hover:border-primary/30 border border-border/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 group">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.bgColor} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <HardHat className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{obra.nombre_obra}</h3>
                {cliente && (
                  <p className="text-[10px] text-muted-foreground mb-3">Cliente: {cliente.nombre_comercial}</p>
                )}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{obra.zona_trabajo_ubicacion}</span>
                  </div>
                  {obra.fecha_inicio && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{formatDate(obra.fecha_inicio)} — {obra.fecha_fin ? formatDate(obra.fecha_fin) : 'Sin fecha fin'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-400">
                    <DollarSign className="w-3 h-3 flex-shrink-0" />
                    <span>Presupuesto: {formatCurrency(obra.presupuesto_adjudicado)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
