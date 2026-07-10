'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/useRole'
import { FichajeButton } from '@/components/rrhh/FichajeButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { formatDateTime, formatHours, cn } from '@/lib/utils'
import type { ObraProyecto, ControlHorario } from '@/lib/supabase/types'
import {
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HardHat,
  CalendarClock,
  Loader2,
} from 'lucide-react'

interface GeoPosition {
  lat: number
  lng: number
}

const supabase = createClient()

export default function FichajePage() {
  const { perfil, loading: roleLoading } = useRole()

  // State
  const [obras, setObras] = useState<ObraProyecto[]>([])
  const [selectedObraId, setSelectedObraId] = useState<string>('')
  const [turnoActivo, setTurnoActivo] = useState<ControlHorario | null>(null)
  const [historialHoy, setHistorialHoy] = useState<ControlHorario[]>([])
  const [geoPos, setGeoPos] = useState<GeoPosition | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  // Fetch obras activas
  const fetchObras = useCallback(async () => {
    const { data, error } = await supabase
      .from('obras_proyectos')
      .select('id, nombre_obra, zona_trabajo_ubicacion, estado')
      .eq('estado', 'EN_PROGRESO')
      .order('nombre_obra')

    if (error) {
      toast.error('Error al cargar las obras activas')
      return
    }
    setObras((data as ObraProyecto[]) ?? [])
  }, [supabase])

  // Fetch turno activo hoy y historial del dia
  const fetchTurnosHoy = useCallback(async () => {
    if (!perfil) return

    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString()

    const { data, error } = await supabase
      .from('control_horarios')
      .select('*, obras_proyectos(id, nombre_obra)')
      .eq('empleado_id', perfil.id)
      .gte('marca_entrada', inicioHoy)
      .lt('marca_entrada', finHoy)
      .order('marca_entrada', { ascending: false })

    if (error) {
      toast.error('Error al cargar el historial de hoy')
      return
    }

    const registros = (data as ControlHorario[]) ?? []
    setHistorialHoy(registros)

    // Turno activo = registro sin marca_salida
    const activo = registros.find((r) => !r.marca_salida) ?? null
    setTurnoActivo(activo)
  }, [perfil, supabase])

  useEffect(() => {
    fetchObras()
  }, [fetchObras])

  useEffect(() => {
    if (perfil) {
      fetchTurnosHoy().finally(() => setDataLoading(false))
    }
  }, [perfil, fetchTurnosHoy])

  // Obtener geolocalizacion
  const obtenerGeolocalizacion = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.')
      return
    }
    setGeoLoading(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoLoading(false)
        toast.success('Ubicación obtenida correctamente')
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Permiso de ubicación denegado. Actívalo en el navegador.')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError('Ubicación no disponible. Verifica que el GPS esté activo.')
        } else {
          setGeoError('No se pudo obtener la ubicación. Inténtalo de nuevo.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }, [])

  // Registrar ENTRADA
  const handleEntrada = async () => {
    if (!perfil) return
    if (!geoPos) {
      toast.error('Debes obtener tu ubicación antes de registrar la entrada.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('control_horarios').insert({
        empleado_id: perfil.id,
        obra_id: selectedObraId || null,
        marca_entrada: new Date().toISOString(),
        marca_salida: null,
        latitud_entrada: geoPos.lat,
        longitud_entrada: geoPos.lng,
        latitud_salida: null,
        longitud_salida: null,
      })

      if (error) throw error

      toast.success('✅ Entrada registrada correctamente')
      await fetchTurnosHoy()
    } catch (err: unknown) {
      toast.error('Error al registrar la entrada: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setSubmitting(false)
    }
  }

  // Registrar SALIDA
  const handleSalida = async () => {
    if (!perfil || !turnoActivo) return
    if (!geoPos) {
      toast.error('Debes obtener tu ubicación antes de registrar la salida.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('control_horarios')
        .update({
          marca_salida: new Date().toISOString(),
          latitud_salida: geoPos.lat,
          longitud_salida: geoPos.lng,
        })
        .eq('id', turnoActivo.id)

      if (error) throw error

      toast.success('✅ Salida registrada correctamente')
      setTurnoActivo(null)
      await fetchTurnosHoy()
    } catch (err: unknown) {
      toast.error('Error al registrar la salida: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (roleLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalHorasHoy = historialHoy.reduce(
    (acc, r) => acc + (r.horas_computadas ?? 0),
    0
  )

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold gradient-text">Control de Fichaje</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Turno activo banner */}
      {turnoActivo && (
        <div
          className="rounded-2xl p-4 flex items-center gap-3 border"
          style={{
            background: 'oklch(0.55 0.22 168 / 0.12)',
            borderColor: 'oklch(0.55 0.22 168 / 0.35)',
          }}
        >
          <div
            className="w-3 h-3 rounded-full animate-pulse flex-shrink-0"
            style={{ background: 'oklch(0.55 0.22 168)' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-400">Turno activo en curso</p>
            <p className="text-xs text-muted-foreground truncate">
              Entrada: {formatDateTime(turnoActivo.marca_entrada)}
              {turnoActivo.obras_proyectos && (
                <> · {turnoActivo.obras_proyectos.nombre_obra}</>
              )}
            </p>
          </div>
          <CalendarClock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        </div>
      )}

      {/* Geolocalización */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Ubicación GPS</h2>
          <span className="text-xs text-muted-foreground ml-auto">Requerida para fichar</span>
        </div>

        {geoPos ? (
          <div
            className="rounded-xl p-3 flex items-center gap-2 text-sm border"
            style={{
              background: 'oklch(0.55 0.22 168 / 0.08)',
              borderColor: 'oklch(0.55 0.22 168 / 0.25)',
            }}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-400 font-medium">Ubicación obtenida</span>
            <span className="text-muted-foreground text-xs ml-auto">
              {geoPos.lat.toFixed(5)}, {geoPos.lng.toFixed(5)}
            </span>
          </div>
        ) : geoError ? (
          <div
            className="rounded-xl p-3 border"
            style={{
              background: 'oklch(0.55 0.22 22 / 0.08)',
              borderColor: 'oklch(0.55 0.22 22 / 0.3)',
            }}
          >
            <div className="flex items-center gap-2 text-sm mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-400 font-medium">Error de ubicación</span>
            </div>
            <p className="text-xs text-muted-foreground">{geoError}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pulsa el botón para obtener tu ubicación actual. Sin ella no podrás registrar entrada ni salida.
          </p>
        )}

        <button
          onClick={obtenerGeolocalizacion}
          disabled={geoLoading}
          className={cn(
            'w-full py-2.5 rounded-xl text-sm font-medium border transition-colors',
            'flex items-center justify-center gap-2',
            'text-primary border-primary/30 hover:bg-primary/10',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          style={{
            background: 'linear-gradient(135deg, oklch(0.62 0.22 264 / 0.1), oklch(0.58 0.24 300 / 0.1))',
          }}
        >
          {geoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
          {geoLoading
            ? 'Obteniendo ubicación...'
            : geoPos
            ? 'Actualizar ubicación'
            : 'Obtener ubicación'}
        </button>
      </div>

      {/* Selector de obra */}
      {!turnoActivo && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Obra asignada</h2>
            <span className="text-xs text-muted-foreground ml-auto">Opcional</span>
          </div>
          <Select
            value={selectedObraId}
            onValueChange={(v) => setSelectedObraId(v ?? '')}
          >
            <SelectTrigger className="w-full bg-muted/50 border-border rounded-xl h-10 text-sm">
              <SelectValue placeholder="Seleccionar obra activa…" />
            </SelectTrigger>
            <SelectContent>
              {obras.length === 0 ? (
                <SelectItem value="__none__" disabled>
                  No hay obras en progreso
                </SelectItem>
              ) : (
                obras.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.nombre_obra}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Botones de fichaje */}
      <div className="space-y-3">
        {!turnoActivo ? (
          <FichajeButton
            type="ENTRADA"
            onClick={handleEntrada}
            loading={submitting}
            disabled={!geoPos}
          />
        ) : (
          <FichajeButton
            type="SALIDA"
            onClick={handleSalida}
            loading={submitting}
            disabled={!geoPos}
          />
        )}

        {!geoPos && (
          <p className="text-center text-xs text-amber-400 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Obtén tu ubicación GPS para activar el fichaje
          </p>
        )}
      </div>

      {/* KPI horas hoy */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between border"
        style={{
          background: 'linear-gradient(135deg, oklch(0.12 0.015 264), oklch(0.14 0.01 264))',
          borderColor: 'oklch(0.62 0.22 264 / 0.2)',
        }}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Horas computadas hoy</p>
            <p className="text-xl font-bold text-primary">{formatHours(totalHorasHoy)}</p>
          </div>
        </div>
        <Badge
          className={cn(
            'border text-xs font-medium',
            turnoActivo
              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
              : 'bg-muted/50 text-muted-foreground border-border'
          )}
        >
          {turnoActivo ? '● En turno' : 'Sin turno activo'}
        </Badge>
      </div>

      {/* Historial del día */}
      {historialHoy.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <h2 className="text-sm font-semibold">Registros de hoy</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="text-xs text-muted-foreground">Entrada</TableHead>
                <TableHead className="text-xs text-muted-foreground">Salida</TableHead>
                <TableHead className="text-xs text-muted-foreground">Obra</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historialHoy.map((registro) => (
                <TableRow key={registro.id} className="border-border/20 table-row-hover">
                  <TableCell className="text-xs py-2.5">
                    {formatDateTime(registro.marca_entrada)}
                  </TableCell>
                  <TableCell className="text-xs py-2.5">
                    {registro.marca_salida ? (
                      formatDateTime(registro.marca_salida)
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        En curso
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-2.5 text-muted-foreground max-w-[120px] truncate">
                    {registro.obras_proyectos?.nombre_obra ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs py-2.5 text-right font-mono font-medium">
                    {registro.horas_computadas != null
                      ? formatHours(registro.horas_computadas)
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {historialHoy.length === 0 && !dataLoading && (
        <div className="glass rounded-2xl p-8 text-center space-y-2">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">Sin registros hoy</p>
          <p className="text-xs text-muted-foreground opacity-70">
            Pulsa &quot;Registrar Entrada&quot; para iniciar tu jornada
          </p>
        </div>
      )}
    </div>
  )
}
