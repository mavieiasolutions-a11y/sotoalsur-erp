'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/useRole'
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
import {
  formatCurrency,
  formatDate,
  formatHours,
  estadoPagoConfig,
  MESES,
  cn,
} from '@/lib/utils'
import type { PerfilEmpleado, NominaPersonal, EstadoPago } from '@/lib/supabase/types'
import {
  Users,
  Calculator,
  CheckCircle2,
  Loader2,
  DollarSign,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Lock,
} from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface EmpleadoResumen {
  empleado: PerfilEmpleado
  horas_trabajadas: number
  salario_calculado: number
  tiene_nomina: boolean
  nomina?: NominaPersonal
}

interface HorasRow {
  empleado_id: string
  sum: number
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function NominasPage() {
  const { perfil, loading: roleLoading, isPropietario } = useRole()
  const supabase = createClient()

  // Period
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1) // 1-12
  const [anio, setAnio] = useState(now.getFullYear())

  // Data
  const [empleados, setEmpleados] = useState<PerfilEmpleado[]>([])
  const [resumenes, setResumenes] = useState<EmpleadoResumen[]>([])
  const [nominasExistentes, setNominasExistentes] = useState<NominaPersonal[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [cerrando, setCerrando] = useState(false)

  // ── Fetch empleados activos ─────────────────
  const fetchEmpleados = useCallback(async () => {
    const { data, error } = await supabase
      .from('perfiles_empleados')
      .select('*')
      .eq('activo', true)
      .order('nombre_completo')

    if (error) {
      toast.error('Error al cargar empleados')
      return []
    }
    return (data as PerfilEmpleado[]) ?? []
  }, [supabase])

  // ── Fetch horas del periodo ─────────────────
  const fetchHorasPeriodo = useCallback(
    async (empleadoIds: string[]) => {
      if (empleadoIds.length === 0) return []

      // Build date range for the period
      const inicio = new Date(anio, mes - 1, 1).toISOString()
      const fin = new Date(anio, mes, 1).toISOString()

      const { data, error } = await supabase
        .from('control_horarios')
        .select('empleado_id, horas_computadas')
        .in('empleado_id', empleadoIds)
        .gte('marca_entrada', inicio)
        .lt('marca_entrada', fin)
        .not('marca_salida', 'is', null) // Only completed shifts

      if (error) {
        toast.error('Error al calcular horas del periodo')
        return []
      }

      // Aggregate by empleado_id
      const horasMap = new Map<string, number>()
      for (const row of data ?? []) {
        const prev = horasMap.get(row.empleado_id) ?? 0
        horasMap.set(row.empleado_id, prev + (row.horas_computadas ?? 0))
      }

      return Array.from(horasMap.entries()).map(([empleado_id, sum]) => ({
        empleado_id,
        sum,
      })) as HorasRow[]
    },
    [supabase, mes, anio]
  )

  // ── Fetch nominas existentes del periodo ────
  const fetchNominasPeriodo = useCallback(async () => {
    const { data, error } = await supabase
      .from('nominas_personal')
      .select('*, perfiles_empleados(id, nombre_completo, costo_hora_base)')
      .eq('periodo_mes', mes)
      .eq('periodo_anio', anio)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Error al cargar nóminas del periodo')
      return []
    }
    return (data as NominaPersonal[]) ?? []
  }, [supabase, mes, anio])

  // ── Orchestrate full data load ──────────────
  const loadData = useCallback(async () => {
    setDataLoading(true)
    try {
      const [emps, nominas] = await Promise.all([
        fetchEmpleados(),
        fetchNominasPeriodo(),
      ])

      setEmpleados(emps)
      setNominasExistentes(nominas)

      if (emps.length > 0) {
        const ids = emps.map((e) => e.id)
        const horas = await fetchHorasPeriodo(ids)

        const horasMap = new Map(horas.map((h) => [h.empleado_id, h.sum]))
        const nominaMap = new Map(nominas.map((n) => [n.empleado_id, n]))

        const res: EmpleadoResumen[] = emps.map((emp) => {
          const horasTrabajadas = horasMap.get(emp.id) ?? 0
          const salario = horasTrabajadas * (emp.costo_hora_base ?? 0)
          const nominaExistente = nominaMap.get(emp.id)
          return {
            empleado: emp,
            horas_trabajadas: horasTrabajadas,
            salario_calculado: salario,
            tiene_nomina: !!nominaExistente,
            nomina: nominaExistente,
          }
        })

        setResumenes(res)
      } else {
        setResumenes([])
      }
    } finally {
      setDataLoading(false)
    }
  }, [fetchEmpleados, fetchNominasPeriodo, fetchHorasPeriodo])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Cerrar nómina del mes ───────────────────
  const handleCerrarNomina = async () => {
    if (!isPropietario) {
      toast.error('Solo el propietario puede cerrar nóminas.')
      return
    }

    const sinNomina = resumenes.filter((r) => !r.tiene_nomina && r.horas_trabajadas > 0)

    if (sinNomina.length === 0) {
      toast.info('Todos los empleados con horas ya tienen nómina cerrada para este periodo.')
      return
    }

    setCerrando(true)
    try {
      const inserts = sinNomina.map((r) => ({
        empleado_id: r.empleado.id,
        periodo_mes: mes,
        periodo_anio: anio,
        horas_trabajadas_totales: r.horas_trabajadas,
        salario_base_calculado: r.salario_calculado,
        horas_extra_monto: 0,
        deducciones: 0,
        total_neto_liquidado: r.salario_calculado,
        estado_abono: 'PENDIENTE' as EstadoPago,
        fecha_pago: null,
      }))

      const { error } = await supabase.from('nominas_personal').insert(inserts)

      if (error) throw error

      toast.success(
        `✅ Nómina cerrada para ${sinNomina.length} empleado${sinNomina.length > 1 ? 's' : ''}`
      )
      await loadData()
    } catch (err: unknown) {
      toast.error(
        'Error al cerrar la nómina: ' +
          (err instanceof Error ? err.message : 'Error desconocido')
      )
    } finally {
      setCerrando(false)
    }
  }

  // ── KPIs ────────────────────────────────────
  const totalHoras = resumenes.reduce((acc, r) => acc + r.horas_trabajadas, 0)
  const totalMasa = resumenes.reduce((acc, r) => acc + r.salario_calculado, 0)
  const totalCerradas = nominasExistentes.length
  const nominasCerradasPagadas = nominasExistentes.filter(
    (n) => n.estado_abono === 'PAGADO'
  ).length

  const periodoLabel = `${MESES[mes - 1]} ${anio}`

  // ── Years range ─────────────────────────────
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Gestión de Nóminas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen de horas y liquidación salarial por periodo
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-36 bg-muted/50 border-border rounded-xl h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-24 bg-muted/50 border-border rounded-xl h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card-blue rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 text-primary" />
            Empleados activos
          </div>
          <p className="text-2xl font-bold text-primary">{empleados.length}</p>
        </div>

        <div className="kpi-card-emerald rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Horas totales
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatHours(totalHoras)}</p>
        </div>

        <div className="kpi-card-amber rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            Masa salarial
          </div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(totalMasa)}</p>
        </div>

        <div className="kpi-card-violet rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
            Nóminas cerradas
          </div>
          <p className="text-2xl font-bold text-violet-400">
            {nominasCerradasPagadas} / {totalCerradas}
          </p>
        </div>
      </div>

      {/* Tabla resumen empleados */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Resumen de {periodoLabel}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Horas computadas × coste/hora base por empleado
            </p>
          </div>

          {isPropietario && (
            <button
              onClick={handleCerrarNomina}
              disabled={cerrando || dataLoading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                'transition-all duration-200 active:scale-[0.97]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'text-white shadow-lg hover:brightness-110'
              )}
              style={{
                background:
                  'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
                boxShadow: '0 4px 16px oklch(0.62 0.22 264 / 0.3)',
              }}
            >
              {cerrando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Cerrar Nómina {periodoLabel}
            </button>
          )}
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : resumenes.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
            <p className="text-sm text-muted-foreground">No hay empleados activos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-xs text-muted-foreground">Empleado</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Horas trabajadas
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    €/hora base
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Salario calculado
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-center">
                    Estado nómina
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumenes.map((r) => {
                  const estadoConf = r.nomina
                    ? estadoPagoConfig[r.nomina.estado_abono]
                    : null

                  return (
                    <TableRow
                      key={r.empleado.id}
                      className="border-border/20 table-row-hover"
                    >
                      <TableCell className="py-3">
                        <div>
                          <p className="text-sm font-medium">{r.empleado.nombre_completo}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {r.empleado.rol === 'PROPIETARIO'
                              ? '👑 Propietario'
                              : r.empleado.rol === 'SECRETARIA'
                              ? '📋 Secretaria'
                              : '👷 Trabajador'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm">
                        {r.horas_trabajadas > 0 ? (
                          <span className="text-emerald-400">
                            {formatHours(r.horas_trabajadas)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.00h</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm text-muted-foreground">
                        {formatCurrency(r.empleado.costo_hora_base ?? 0)}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm font-semibold">
                        {r.salario_calculado > 0 ? (
                          <span className="text-amber-400">
                            {formatCurrency(r.salario_calculado)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {formatCurrency(0)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {r.tiene_nomina && estadoConf ? (
                          <Badge
                            className={cn(
                              'border text-xs',
                              estadoConf.bgColor,
                              estadoConf.color
                            )}
                          >
                            {estadoConf.label}
                          </Badge>
                        ) : r.horas_trabajadas > 0 ? (
                          <Badge className="border text-xs bg-amber-400/10 text-amber-400 border-amber-400/30">
                            Pendiente cerrar
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin horas</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Tabla nóminas cerradas del periodo */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30">
          <h2 className="font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Nóminas cerradas · {periodoLabel}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registros liquidados en nominas_personal
          </p>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : nominasExistentes.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <AlertTriangle className="w-7 h-7 text-muted-foreground mx-auto opacity-40" />
            <p className="text-sm text-muted-foreground">
              No hay nóminas cerradas para {periodoLabel}
            </p>
            {isPropietario && (
              <p className="text-xs text-muted-foreground opacity-70">
                Usa el botón &quot;Cerrar Nómina&quot; para generar los registros
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-xs text-muted-foreground">Empleado</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Horas
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Salario base
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Deducciones
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">
                    Neto liquidado
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-center">
                    Estado
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground">
                    Fecha pago
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nominasExistentes.map((nomina) => {
                  const estadoConf = estadoPagoConfig[nomina.estado_abono]
                  return (
                    <TableRow
                      key={nomina.id}
                      className="border-border/20 table-row-hover"
                    >
                      <TableCell className="py-3">
                        <p className="text-sm font-medium">
                          {nomina.perfiles_empleados?.nombre_completo ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm text-emerald-400">
                        {formatHours(nomina.horas_trabajadas_totales)}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm">
                        {formatCurrency(nomina.salario_base_calculado)}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm text-red-400">
                        -{formatCurrency(nomina.deducciones)}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-sm font-bold text-amber-400">
                        {formatCurrency(nomina.total_neto_liquidado)}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge
                          className={cn(
                            'border text-xs',
                            estadoConf.bgColor,
                            estadoConf.color
                          )}
                        >
                          {estadoConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {formatDate(nomina.fecha_pago)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
