'use client'

import { useEffect, useState } from 'react'
import { X, Truck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { FlotaVehiculo, InsertFlotaVehiculo } from '@/lib/supabase/types'
import { toast } from 'sonner'

interface VehiculoModalProps {
  open: boolean
  onClose: () => void
  vehiculo?: FlotaVehiculo | null
  onSuccess: () => void
}

const emptyForm: InsertFlotaVehiculo = {
  marca_modelo: '',
  matricula: '',
  vencimiento_seguro: '',
  vencimiento_itv: '',
  compania_seguradora: '',
  numero_poliza: '',
  activo: true,
}

export function VehiculoModal({ open, onClose, vehiculo, onSuccess }: VehiculoModalProps) {
  const [form, setForm] = useState<InsertFlotaVehiculo>(emptyForm)
  const [saving, setSaving] = useState(false)
  const isEditing = !!vehiculo

  useEffect(() => {
    if (vehiculo) {
      setForm({
        marca_modelo: vehiculo.marca_modelo,
        matricula: vehiculo.matricula,
        vencimiento_seguro: vehiculo.vencimiento_seguro,
        vencimiento_itv: vehiculo.vencimiento_itv,
        compania_seguradora: vehiculo.compania_seguradora ?? '',
        numero_poliza: vehiculo.numero_poliza ?? '',
        activo: vehiculo.activo,
      })
    } else {
      setForm(emptyForm)
    }
  }, [vehiculo, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.marca_modelo.trim()) {
      toast.error('El campo Marca/Modelo es obligatorio')
      return
    }
    if (!form.matricula.trim()) {
      toast.error('La matrícula es obligatoria')
      return
    }
    if (!form.vencimiento_itv) {
      toast.error('La fecha de vencimiento de ITV es obligatoria')
      return
    }
    if (!form.vencimiento_seguro) {
      toast.error('La fecha de vencimiento del seguro es obligatoria')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const payload = {
      ...form,
      matricula: form.matricula.toUpperCase().trim(),
      compania_seguradora: form.compania_seguradora?.trim() || null,
      numero_poliza: form.numero_poliza?.trim() || null,
    }

    let error: { message?: string } | null = null

    if (isEditing && vehiculo) {
      const { error: updateError } = await supabase
        .from('flota_vehiculos')
        .update(payload)
        .eq('id', vehiculo.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('flota_vehiculos')
        .insert(payload)
      error = insertError
    }

    setSaving(false)

    if (error) {
      toast.error(`Error al guardar: ${error.message}`)
      return
    }

    toast.success(isEditing ? 'Vehículo actualizado correctamente' : 'Vehículo registrado correctamente')
    onSuccess()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl glass-strong shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-border/30"
          style={{
            background: 'linear-gradient(135deg, oklch(0.12 0.015 264 / 0.8), oklch(0.14 0.01 264 / 0.8))',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
              }}
            >
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {isEditing ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {isEditing ? `Editando: ${vehiculo?.matricula}` : 'Registrar vehículo en la flota'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">

            {/* Marca/Modelo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Marca / Modelo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.marca_modelo}
                onChange={(e) => setForm({ ...form, marca_modelo: e.target.value })}
                placeholder="Ej: Ford Transit 2.0 TDCI"
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm
                  text-foreground placeholder:text-muted-foreground/50
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                  transition-colors"
              />
            </div>

            {/* Matricula */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Matrícula <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.matricula}
                onChange={(e) => setForm({ ...form, matricula: e.target.value.toUpperCase() })}
                placeholder="Ej: 1234 ABC"
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm
                  text-foreground placeholder:text-muted-foreground/50 uppercase font-mono tracking-wider
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                  transition-colors"
              />
            </div>

            {/* Fechas vencimiento - grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Vto. ITV <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.vencimiento_itv}
                  onChange={(e) => setForm({ ...form, vencimiento_itv: e.target.value })}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm
                    text-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                    transition-colors [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Vto. Seguro <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.vencimiento_seguro}
                  onChange={(e) => setForm({ ...form, vencimiento_seguro: e.target.value })}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm
                    text-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                    transition-colors [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Compañia Aseguradora */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Compañía Aseguradora
              </label>
              <input
                type="text"
                value={form.compania_seguradora ?? ''}
                onChange={(e) => setForm({ ...form, compania_seguradora: e.target.value })}
                placeholder="Ej: Mapfre, Allianz, AXA..."
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm
                  text-foreground placeholder:text-muted-foreground/50
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                  transition-colors"
              />
            </div>

            {/* Numero Poliza */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Número de Póliza
              </label>
              <input
                type="text"
                value={form.numero_poliza ?? ''}
                onChange={(e) => setForm({ ...form, numero_poliza: e.target.value })}
                placeholder="Ej: POL-2024-00123"
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm
                  text-foreground placeholder:text-muted-foreground/50
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                  transition-colors"
              />
            </div>

            {/* Activo toggle */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/40">
              <div>
                <p className="text-sm font-medium text-foreground">Vehículo activo</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Los vehículos inactivos no aparecen en la vista principal
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.activo}
                onClick={() => setForm({ ...form, activo: !form.activo })}
                className={cn(
                  'relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0',
                  form.activo
                    ? 'bg-primary'
                    : 'bg-muted border border-border',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
                    form.activo ? 'left-5.5' : 'left-0.5',
                  )}
                />
              </button>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/30 bg-muted/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground
                hover:text-foreground hover:bg-accent/50 border border-border/50 hover:border-border
                transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium
                text-white transition-all duration-150 disabled:opacity-60
                hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                isEditing ? 'Guardar cambios' : 'Registrar vehículo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
