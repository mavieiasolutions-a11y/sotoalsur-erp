'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/useRole'
import type { DocumentoVectorial, ObraProyecto, TipoDocumento } from '@/lib/supabase/types'
import { DocumentUploader } from '@/components/documentos/DocumentUploader'
import { DocumentTable } from '@/components/documentos/DocumentTable'
import {
  FolderOpen,
  Filter,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Cpu,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ============================================================
// TIPO DOCUMENTO CONFIG (for filter labels)
// ============================================================
const TIPOS_DOCUMENTO: { value: TipoDocumento | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'PLANO', label: 'Plano' },
  { value: 'PRESUPUESTO_PDF', label: 'Presupuesto PDF' },
  { value: 'CONTRATO', label: 'Contrato' },
  { value: 'ALBARAN', label: 'Albarán' },
  { value: 'FACTURA', label: 'Factura' },
]

// ============================================================
// KPI CARD
// ============================================================
function KpiCard({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string
  value: number
  icon: React.ReactNode
  colorClass: string
}) {
  return (
    <div className="glass-strong rounded-2xl p-4 flex items-center gap-4">
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center border',
          colorClass
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// ============================================================
// PAGE COMPONENT
// ============================================================
const supabase = createClient()

export default function DocumentosPage() {
  const { perfil, loading: roleLoading } = useRole()

  // Data state
  const [documentos, setDocumentos] = useState<DocumentoVectorial[]>([])
  const [obras, setObras] = useState<Pick<ObraProyecto, 'id' | 'nombre_obra'>[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumento | 'TODOS'>('TODOS')
  const [filtroObraId, setFiltroObraId] = useState<string>('TODAS')

  // Upload panel visibility
  const [uploaderOpen, setUploaderOpen] = useState(false)

  // ── Fetch obras ─────────────────────────────────────────
  const fetchObras = useCallback(async () => {
    const { data } = await supabase
      .from('obras_proyectos')
      .select('id, nombre_obra')
      .order('nombre_obra')
    setObras(data ?? [])
  }, [supabase])

  // ── Fetch documentos ─────────────────────────────────────
  const fetchDocumentos = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('documentos_vectoriales')
        .select(
          `
          id,
          nombre_archivo,
          tipo,
          url_storage,
          contenido_ocr,
          subido_por,
          obra_id,
          created_at,
          obras_proyectos:obra_id (id, nombre_obra),
          perfiles_empleados:subido_por (id, nombre_completo)
        `
        )
        .order('created_at', { ascending: false })

      if (filtroTipo !== 'TODOS') {
        query = query.eq('tipo', filtroTipo)
      }
      if (filtroObraId !== 'TODAS') {
        if (filtroObraId === 'SIN_OBRA') {
          query = query.is('obra_id', null)
        } else {
          query = query.eq('obra_id', filtroObraId)
        }
      }

      const { data, error } = await query
      if (error) throw error
      setDocumentos((data as unknown as DocumentoVectorial[]) ?? [])
    } catch (err) {
      console.error('[Documentos] Error fetching:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, filtroTipo, filtroObraId])

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    fetchObras()
  }, [fetchObras])

  useEffect(() => {
    if (!roleLoading) {
      fetchDocumentos()
    }
  }, [fetchDocumentos, roleLoading, filtroTipo, filtroObraId])

  // ── Computed KPIs ─────────────────────────────────────────
  const totalDocs = documentos.length
  const albaranes = documentos.filter((d) => d.tipo === 'ALBARAN').length
  const indexados = documentos.filter(
    (d) => d.tipo === 'ALBARAN' && d.contenido_ocr !== null
  ).length
  const pendientesOCR = documentos.filter(
    (d) => d.tipo === 'ALBARAN' && d.contenido_ocr === null
  ).length

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, oklch(0.62 0.22 264 / 0.2), oklch(0.58 0.24 300 / 0.2))',
                border: '1px solid oklch(0.62 0.22 264 / 0.3)',
              }}
            >
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Documentos</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-[52px]">
            Repositorio de documentos con pipeline OCR/RAG integrado
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDocumentos}
            className="h-9 w-9 p-0 rounded-xl hover:bg-muted/50"
            title="Actualizar"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>

          <Button
            onClick={() => setUploaderOpen((v) => !v)}
            size="sm"
            className="h-9 px-4 rounded-xl font-medium flex items-center gap-2"
            style={{
              background:
                'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
            }}
          >
            <FileText className="w-4 h-4" />
            Subir documento
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-200',
                uploaderOpen && 'rotate-180'
              )}
            />
          </Button>
        </div>
      </div>

      {/* ── Upload Panel (collapsible) ──────────────── */}
      {uploaderOpen && (
        <div className="glass-strong rounded-2xl p-5 border border-border/30">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Cargar nuevo documento
          </h2>
          <DocumentUploader
            obras={obras}
            onUploadSuccess={() => {
              fetchDocumentos()
            }}
          />
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total documentos"
          value={totalDocs}
          icon={<FileText className="w-5 h-5 text-primary" />}
          colorClass="bg-primary/10 border-primary/20"
        />
        <KpiCard
          label="Albaranes"
          value={albaranes}
          icon={<ImageIcon className="w-5 h-5 text-emerald-400" />}
          colorClass="bg-emerald-400/10 border-emerald-400/20"
        />
        <KpiCard
          label="Indexados (OCR)"
          value={indexados}
          icon={<Cpu className="w-5 h-5 text-sky-400" />}
          colorClass="bg-sky-400/10 border-sky-400/20"
        />
        <KpiCard
          label="Pendientes OCR"
          value={pendientesOCR}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          colorClass="bg-amber-400/10 border-amber-400/20"
        />
      </div>

      {/* ── Filters ────────────────────────────────── */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Filtros</span>
          </div>

          {/* Filtro por tipo */}
          <Select
            value={filtroTipo}
            onValueChange={(v) => v !== null && setFiltroTipo(v as TipoDocumento | 'TODOS')}
          >
            <SelectTrigger className="h-9 min-w-[180px] bg-muted/50 border-border rounded-xl text-sm">
              <SelectValue placeholder="Tipo de documento" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DOCUMENTO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por obra */}
          <Select
            value={filtroObraId}
            onValueChange={(v) => v !== null && setFiltroObraId(v)}
          >
            <SelectTrigger className="h-9 min-w-[200px] bg-muted/50 border-border rounded-xl text-sm">
              <SelectValue placeholder="Obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas las obras</SelectItem>
              <SelectItem value="SIN_OBRA">Sin obra asignada</SelectItem>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nombre_obra}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Results count */}
          <div className="ml-auto">
            <span className="text-xs text-muted-foreground">
              {loading ? (
                'Cargando…'
              ) : (
                <>
                  <span className="font-semibold text-foreground">{documentos.length}</span>{' '}
                  {documentos.length === 1 ? 'documento' : 'documentos'}
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── Document Table ──────────────────────────── */}
      <DocumentTable documentos={documentos} loading={loading} />

      {/* ── Footer info ─────────────────────────────── */}
      <div className="flex items-center justify-center gap-6 pt-2 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>OCR indexado</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span>OCR pendiente (sólo albaranes)</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <div className="w-2 h-2 rounded-full bg-border" />
          <span>No aplica OCR</span>
        </div>
      </div>
    </div>
  )
}
