'use client'

import { Truck, Edit2, Calendar, Shield, Hash } from 'lucide-react'
import { cn, getDiasHastaVencimiento, getNivelAlertaFlota, alertaFlotaConfig, formatDate } from '@/lib/utils'
import type { FlotaVehiculo } from '@/lib/supabase/types'

interface VehiculoCardProps {
  vehiculo: FlotaVehiculo
  canWrite: boolean
  onEdit: (vehiculo: FlotaVehiculo) => void
}

function DiasIndicador({ label, fecha, icon: Icon }: { label: string; fecha: string; icon: React.ElementType }) {
  const dias = getDiasHastaVencimiento(fecha)
  const isCritico = dias <= 7
  const isAlerta = dias <= 30 && dias > 7
  const isOk = dias > 30

  return (
    <div className="flex items-start gap-2.5">
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5',
          isCritico && 'bg-red-500/15',
          isAlerta && 'bg-amber-500/15',
          isOk && 'bg-emerald-500/15',
        )}
      >
        <Icon
          className={cn(
            'w-3.5 h-3.5',
            isCritico && 'text-red-400',
            isAlerta && 'text-amber-400',
            isOk && 'text-emerald-400',
          )}
        />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-xs font-medium text-foreground">{formatDate(fecha)}</p>
        <p
          className={cn(
            'text-[11px] font-semibold mt-0.5',
            isCritico && 'text-red-400',
            isAlerta && 'text-amber-400',
            isOk && 'text-emerald-400',
          )}
        >
          {dias < 0
            ? `Vencido hace ${Math.abs(dias)}d`
            : dias === 0
            ? 'Vence hoy'
            : `${dias}d restantes`}
        </p>
      </div>
    </div>
  )
}

export function VehiculoCard({ vehiculo, canWrite, onEdit }: VehiculoCardProps) {
  const diasITV = getDiasHastaVencimiento(vehiculo.vencimiento_itv)
  const diasSeguro = getDiasHastaVencimiento(vehiculo.vencimiento_seguro)
  const nivel = getNivelAlertaFlota(diasITV, diasSeguro)
  const alertaCfg = alertaFlotaConfig[nivel]

  return (
    <div
      className={cn(
        'relative rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200',
        'hover:scale-[1.01] hover:shadow-lg',
        'glass',
        nivel === 'CRITICO' && 'border border-red-500/40',
        nivel === 'ALERTA' && 'border border-amber-500/30',
        nivel === 'OK' && 'border border-border/40',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        {/* Icon + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              nivel === 'CRITICO' && 'bg-red-500/15 alert-critico',
              nivel === 'ALERTA' && 'bg-amber-500/15',
              nivel === 'OK' && 'bg-primary/15',
            )}
          >
            <Truck
              className={cn(
                'w-5 h-5',
                nivel === 'CRITICO' && 'text-red-400',
                nivel === 'ALERTA' && 'text-amber-400',
                nivel === 'OK' && 'text-primary',
              )}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
              {vehiculo.marca_modelo}
            </h3>
            {/* Matricula badge */}
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-muted/70 border border-border/50">
              <Hash className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-bold tracking-widest text-foreground/90 uppercase">
                {vehiculo.matricula}
              </span>
            </div>
          </div>
        </div>

        {/* Nivel badge + Edit */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
              alertaCfg.bgColor,
              alertaCfg.color,
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                alertaCfg.dot,
                nivel === 'CRITICO' && 'animate-pulse',
              )}
            />
            {alertaCfg.label}
          </span>

          {canWrite && (
            <button
              onClick={() => onEdit(vehiculo)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground
                hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20
                transition-colors duration-150"
              title="Editar vehículo"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/30" />

      {/* Expiry dates */}
      <div className="grid grid-cols-2 gap-3">
        <DiasIndicador label="ITV" fecha={vehiculo.vencimiento_itv} icon={Calendar} />
        <DiasIndicador label="Seguro" fecha={vehiculo.vencimiento_seguro} icon={Shield} />
      </div>

      {/* Compania + Poliza */}
      {(vehiculo.compania_seguradora || vehiculo.numero_poliza) && (
        <div className="flex flex-col gap-0.5 pt-1 border-t border-border/20">
          {vehiculo.compania_seguradora && (
            <p className="text-[11px] text-muted-foreground truncate">
              <span className="text-muted-foreground/60">Aseguradora: </span>
              <span className="text-foreground/80 font-medium">{vehiculo.compania_seguradora}</span>
            </p>
          )}
          {vehiculo.numero_poliza && (
            <p className="text-[11px] text-muted-foreground truncate">
              <span className="text-muted-foreground/60">Póliza: </span>
              <span className="text-foreground/80 font-medium">{vehiculo.numero_poliza}</span>
            </p>
          )}
        </div>
      )}

      {/* Inactivo overlay indicator */}
      {!vehiculo.activo && (
        <div className="absolute inset-0 rounded-2xl bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
          <span className="px-3 py-1 rounded-full bg-muted/80 border border-border text-xs text-muted-foreground font-medium">
            Inactivo
          </span>
        </div>
      )}
    </div>
  )
}
