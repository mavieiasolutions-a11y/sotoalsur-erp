'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Truck, AlertTriangle, CheckCircle2, RefreshCw, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/useRole'
import { getDiasHastaVencimiento, getNivelAlertaFlota } from '@/lib/utils'
import { VehiculoCard } from '@/components/flota/VehiculoCard'
import { VehiculoModal } from '@/components/flota/VehiculoModal'
import type { FlotaVehiculo } from '@/lib/supabase/types'
import { toast } from 'sonner'

type FiltroActivo = 'todos' | 'activos'

export default function FlotaPage() {
  const { canWrite } = useRole()
  const [vehiculos, setVehiculos] = useState<FlotaVehiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FiltroActivo>('activos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<FlotaVehiculo | null>(null)

  const fetchVehiculos = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const query = supabase
      .from('flota_vehiculos')
      .select('*')
      .order('marca_modelo', { ascending: true })

    const { data, error } = await query
    if (error) {
      toast.error('Error al cargar la flota')
    } else {
      setVehiculos(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVehiculos()
  }, [fetchVehiculos])

  // Filtered vehicles
  const vehiculosFiltrados = vehiculos.filter((v) => {
    if (filtro === 'activos') return v.activo
    return true
  })

  // Stats computed from all active vehicles
  const activos = vehiculos.filter((v) => v.activo)
  const criticos = activos.filter((v) => {
    const d1 = getDiasHastaVencimiento(v.vencimiento_itv)
    const d2 = getDiasHastaVencimiento(v.vencimiento_seguro)
    return getNivelAlertaFlota(d1, d2) === 'CRITICO'
  })
  const alertas = activos.filter((v) => {
    const d1 = getDiasHastaVencimiento(v.vencimiento_itv)
    const d2 = getDiasHastaVencimiento(v.vencimiento_seguro)
    return getNivelAlertaFlota(d1, d2) === 'ALERTA'
  })

  function handleNuevo() {
    setEditando(null)
    setModalOpen(true)
  }

  function handleEditar(vehiculo: FlotaVehiculo) {
    setEditando(vehiculo)
    setModalOpen(true)
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditando(null)
  }

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
              }}
            >
              <Truck className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Flota Vehicular</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-0.5">
            Gestión de vehículos, ITV y seguros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchVehiculos}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground
              hover:text-foreground hover:bg-accent/50 border border-border/50
              transition-colors disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          {canWrite && (
            <button
              onClick={handleNuevo}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                text-white transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
              }}
            >
              <Plus className="w-4 h-4" />
              Nuevo Vehículo
            </button>
          )}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total */}
        <div className="kpi-card-blue rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Total</span>
            <Truck className="w-4 h-4 text-primary opacity-60" />
          </div>
          <p className="text-2xl font-bold text-foreground">{activos.length}</p>
          <p className="text-[11px] text-muted-foreground">vehículos activos</p>
        </div>

        {/* Criticos */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{
            background: 'linear-gradient(135deg, oklch(0.12 0.015 22), oklch(0.14 0.01 22))',
            border: '1px solid oklch(0.55 0.22 22 / 0.25)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Críticos</span>
            <AlertTriangle className="w-4 h-4 text-red-400 opacity-70" />
          </div>
          <p className={`text-2xl font-bold ${criticos.length > 0 ? 'text-red-400' : 'text-foreground'}`}>
            {criticos.length}
          </p>
          <p className="text-[11px] text-muted-foreground">vencen en &lt; 7 días</p>
        </div>

        {/* Alertas */}
        <div className="kpi-card-amber rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Alertas</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400 opacity-70" />
          </div>
          <p className={`text-2xl font-bold ${alertas.length > 0 ? 'text-amber-400' : 'text-foreground'}`}>
            {alertas.length}
          </p>
          <p className="text-[11px] text-muted-foreground">vencen en &lt; 30 días</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Mostrar:</span>
        {(['activos', 'todos'] as FiltroActivo[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filtro === f
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
            }`}
          >
            {f === 'activos' ? 'Solo activos' : 'Todos'}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {vehiculosFiltrados.length} vehículo{vehiculosFiltrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Vehicle grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl glass h-52 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      ) : vehiculosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 glass rounded-2xl">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, oklch(0.62 0.22 264 / 0.15), oklch(0.58 0.24 300 / 0.15))',
            }}
          >
            <Truck className="w-8 h-8 text-primary/50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground/60">No hay vehículos registrados</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filtro === 'activos'
                ? 'No hay vehículos activos. Cambia el filtro o añade un vehículo.'
                : 'Registra el primer vehículo de la flota.'}
            </p>
          </div>
          {canWrite && (
            <button
              onClick={handleNuevo}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                text-white transition-all duration-150 hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
              }}
            >
              <Plus className="w-4 h-4" />
              Nuevo Vehículo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehiculosFiltrados.map((v) => (
            <VehiculoCard
              key={v.id}
              vehiculo={v}
              canWrite={canWrite}
              onEdit={handleEditar}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <VehiculoModal
        open={modalOpen}
        onClose={handleModalClose}
        vehiculo={editando}
        onSuccess={fetchVehiculos}
      />
    </div>
  )
}
