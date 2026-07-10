'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/useRole'
import { toast } from 'sonner'
import { ArrowLeft, HardHat, DollarSign, FileText, Clock, MapPin, Calendar, TrendingDown, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, estadoObraConfig, estadoPagoConfig, tipoTransaccionConfig } from '@/lib/utils'
import type { ObraProyecto, ContabilidadFinanza, DocumentoVectorial, ControlHorario } from '@/lib/supabase/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ObraDetailPage({ params }: { params: { id: string } }) {
  const { canWrite } = useRole()
  const [obra, setObra] = useState<ObraProyecto | null>(null)
  const [finanzas, setFinanzas] = useState<ContabilidadFinanza[]>([])
  const [documentos, setDocumentos] = useState<DocumentoVectorial[]>([])
  const [horarios, setHorarios] = useState<ControlHorario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const [obraRes, finanzasRes, docsRes, horariosRes] = await Promise.all([
        supabase.from('obras_proyectos').select('*, directorio_entidades(*)').eq('id', params.id).single(),
        supabase.from('contabilidad_finanzas').select('*').eq('obra_id', params.id).order('fecha_emision', { ascending: false }),
        supabase.from('documentos_vectoriales').select('*, perfiles_empleados(nombre_completo)').eq('obra_id', params.id),
        supabase.from('control_horarios').select('*, perfiles_empleados(nombre_completo)').eq('obra_id', params.id).order('marca_entrada', { ascending: false }).limit(50),
      ])
      setObra(obraRes.data)
      setFinanzas(finanzasRes.data ?? [])
      setDocumentos(docsRes.data ?? [])
      setHorarios(horariosRes.data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [params.id])

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )

  if (!obra) return (
    <div className="p-6 text-center text-muted-foreground">Obra no encontrada</div>
  )

  const gastos = finanzas.filter(f => tipoTransaccionConfig[f.tipo].esGasto).reduce((s, f) => s + (f.monto_total ?? 0), 0)
  const ingresos = finanzas.filter(f => !tipoTransaccionConfig[f.tipo].esGasto).reduce((s, f) => s + (f.monto_total ?? 0), 0)
  const desviacion = ((gastos / obra.presupuesto_adjudicado) * 100).toFixed(1)
  const cfg = estadoObraConfig[obra.estado]
  const cliente = (obra as any).directorio_entidades

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/obras" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a Obras
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bgColor} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{obra.nombre_obra}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{obra.zona_trabajo_ubicacion}</span>
              {obra.fecha_inicio && (
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(obra.fecha_inicio)} — {obra.fecha_fin ? formatDate(obra.fecha_fin) : 'Indefinida'}</span>
              )}
              {cliente && <span>Cliente: <strong>{cliente.nombre_comercial}</strong></span>}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 kpi-card-blue">
          <p className="text-xs text-muted-foreground mb-1">Presupuesto Adjudicado</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(obra.presupuesto_adjudicado)}</p>
        </div>
        <div className="glass rounded-2xl p-5 kpi-card-amber">
          <p className="text-xs text-muted-foreground mb-1">Gasto Real Acumulado</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(gastos)}</p>
          <p className={`text-xs mt-1 ${parseFloat(desviacion) > 100 ? 'text-red-400' : parseFloat(desviacion) > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {desviacion}% del presupuesto
          </p>
        </div>
        <div className="glass rounded-2xl p-5 kpi-card-violet">
          <p className="text-xs text-muted-foreground mb-1">Ingresos Cobrados</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(ingresos)}</p>
          <p className={`text-xs mt-1 ${ingresos >= obra.presupuesto_adjudicado ? 'text-emerald-400' : 'text-amber-400'}`}>
            Pendiente: {formatCurrency(Math.max(0, obra.presupuesto_adjudicado - ingresos))}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="finanzas">
        <TabsList className="bg-muted/30 border border-border/30">
          <TabsTrigger value="finanzas" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <DollarSign className="w-3 h-3 mr-1.5" />Finanzas ({finanzas.length})
          </TabsTrigger>
          <TabsTrigger value="documentos" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <FileText className="w-3 h-3 mr-1.5" />Documentos ({documentos.length})
          </TabsTrigger>
          <TabsTrigger value="horarios" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Clock className="w-3 h-3 mr-1.5" />Control Horario ({horarios.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="finanzas" className="glass rounded-2xl p-4 mt-4">
          {finanzas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin asientos registrados para esta obra</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  {['Concepto', 'Tipo', 'Fecha', 'Neto', 'IVA', 'Total', 'Estado'].map(h => (
                    <th key={h} className="text-left pb-2 text-muted-foreground font-medium pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {finanzas.map(f => {
                  const tipoCfg = tipoTransaccionConfig[f.tipo]
                  const estadoCfg = estadoPagoConfig[f.estado]
                  return (
                    <tr key={f.id} className="border-b border-border/10 table-row-hover">
                      <td className="py-2 text-foreground/80 max-w-[160px] truncate pr-4">{f.concepto}</td>
                      <td className="py-2 text-muted-foreground pr-4">{tipoCfg.label}</td>
                      <td className="py-2 text-muted-foreground pr-4">{formatDate(f.fecha_emision)}</td>
                      <td className="py-2 pr-4">{formatCurrency(f.monto_neto)}</td>
                      <td className="py-2 pr-4">{formatCurrency(f.impuestos_iva)}</td>
                      <td className={`py-2 font-medium pr-4 ${tipoCfg.esGasto ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(f.monto_total ?? f.monto_neto)}
                      </td>
                      <td className="py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${estadoCfg.bgColor} ${estadoCfg.color}`}>
                          {estadoCfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="glass rounded-2xl p-4 mt-4">
          {documentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin documentos adjuntos</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documentos.map(doc => (
                <div key={doc.id} className="glass rounded-xl p-3 border border-border/30">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{doc.nombre_archivo}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {doc.tipo} · {formatDate(doc.created_at)}
                        {doc.contenido_ocr ? ' · OCR: Indexado' : ''}
                      </p>
                    </div>
                    <a href={doc.url_storage} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline flex-shrink-0">Ver</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="horarios" className="glass rounded-2xl p-4 mt-4">
          {horarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin registros de horario</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  {['Empleado', 'Entrada', 'Salida', 'Horas'].map(h => (
                    <th key={h} className="text-left pb-2 text-muted-foreground font-medium pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horarios.map(h => {
                  const emp = (h as any).perfiles_empleados
                  return (
                    <tr key={h.id} className="border-b border-border/10 table-row-hover">
                      <td className="py-2 text-foreground/80 pr-4">{emp?.nombre_completo ?? 'Desconocido'}</td>
                      <td className="py-2 text-muted-foreground pr-4">{new Date(h.marca_entrada).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 text-muted-foreground pr-4">{h.marca_salida ? new Date(h.marca_salida).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : <span className="text-emerald-400">Activo</span>}</td>
                      <td className="py-2 font-medium text-foreground">{h.horas_computadas ? `${h.horas_computadas.toFixed(2)}h` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
