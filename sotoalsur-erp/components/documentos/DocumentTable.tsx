'use client'

import { useMemo } from 'react'
import type { DocumentoVectorial, TipoDocumento } from '@/lib/supabase/types'
import { formatDate } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Cpu,
  Clock,
  FileQuestion,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// CONFIG
// ============================================================
const tipoDocConfig: Record<
  TipoDocumento,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  PLANO: {
    label: 'Plano',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/20',
    icon: <FileText className="w-3 h-3" />,
  },
  PRESUPUESTO_PDF: {
    label: 'Presupuesto',
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10 border-violet-400/20',
    icon: <FileText className="w-3 h-3" />,
  },
  CONTRATO: {
    label: 'Contrato',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10 border-amber-400/20',
    icon: <FileText className="w-3 h-3" />,
  },
  ALBARAN: {
    label: 'Albarán',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/20',
    icon: <ImageIcon className="w-3 h-3" />,
  },
  FACTURA: {
    label: 'Factura',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10 border-orange-400/20',
    icon: <FileText className="w-3 h-3" />,
  },
}

// ============================================================
// PROPS
// ============================================================
interface DocumentTableProps {
  documentos: DocumentoVectorial[]
  loading?: boolean
}

// ============================================================
// OCR STATUS BADGE
// ============================================================
function OcrStatusBadge({ contenidoOcr, tipo }: { contenidoOcr: string | null; tipo: TipoDocumento }) {
  if (tipo !== 'ALBARAN') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/40 border border-border text-muted-foreground">
        <FileQuestion className="w-3 h-3" />
        N/A
      </span>
    )
  }

  if (contenidoOcr) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 border border-emerald-400/20 text-emerald-400">
        <Cpu className="w-3 h-3" />
        Indexado
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 border border-amber-400/20 text-amber-400">
      <Clock className="w-3 h-3" />
      Pendiente
    </span>
  )
}

// ============================================================
// FILE ICON
// ============================================================
function FileIconCell({ nombreArchivo }: { nombreArchivo: string }) {
  const ext = nombreArchivo.split('.').pop()?.toLowerCase()
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext ?? '')

  return (
    <div className="w-8 h-8 rounded-lg bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
      {isImage ? (
        <ImageIcon className="w-4 h-4 text-sky-400" />
      ) : (
        <FileText className="w-4 h-4 text-primary" />
      )}
    </div>
  )
}

// ============================================================
// SKELETON ROW
// ============================================================
function SkeletonRow() {
  return (
    <TableRow className="border-border/30">
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-muted/50 rounded-md animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
        </TableCell>
      ))}
    </TableRow>
  )
}

// ============================================================
// COMPONENT
// ============================================================
export function DocumentTable({ documentos, loading = false }: DocumentTableProps) {
  return (
    <div className="rounded-2xl border border-border/30 overflow-hidden glass">
      <Table>
        <TableHeader>
          <TableRow className="border-border/30 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide w-10" />
            <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
              Nombre del archivo
            </TableHead>
            <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
              Tipo
            </TableHead>
            <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
              Obra asociada
            </TableHead>
            <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
              Subido por
            </TableHead>
            <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
              Fecha
            </TableHead>
            <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
              Estado OCR
            </TableHead>
            <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wide text-right">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : documentos.length === 0 ? (
            <TableRow className="border-border/30">
              <TableCell colSpan={8} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">No hay documentos</p>
                  <p className="text-xs text-muted-foreground/60">
                    Sube el primer documento usando el panel de carga
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            documentos.map((doc) => {
              const tipoConfig = tipoDocConfig[doc.tipo]
              return (
                <TableRow
                  key={doc.id}
                  className="border-border/30 table-row-hover group"
                >
                  {/* File icon */}
                  <TableCell className="py-3 px-3">
                    <FileIconCell nombreArchivo={doc.nombre_archivo} />
                  </TableCell>

                  {/* Nombre archivo */}
                  <TableCell className="py-3">
                    <span className="text-sm font-medium text-foreground max-w-[200px] block truncate" title={doc.nombre_archivo}>
                      {doc.nombre_archivo}
                    </span>
                  </TableCell>

                  {/* Tipo badge */}
                  <TableCell className="py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                        tipoConfig.bgColor,
                        tipoConfig.color
                      )}
                    >
                      {tipoConfig.icon}
                      {tipoConfig.label}
                    </span>
                  </TableCell>

                  {/* Obra */}
                  <TableCell className="py-3">
                    {doc.obras_proyectos?.nombre_obra ? (
                      <span className="text-sm text-foreground">
                        {doc.obras_proyectos.nombre_obra}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">Sin obra</span>
                    )}
                  </TableCell>

                  {/* Subido por */}
                  <TableCell className="py-3">
                    {doc.perfiles_empleados?.nombre_completo ? (
                      <span className="text-sm text-foreground">
                        {doc.perfiles_empleados.nombre_completo}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">—</span>
                    )}
                  </TableCell>

                  {/* Fecha */}
                  <TableCell className="py-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </span>
                  </TableCell>

                  {/* OCR Status */}
                  <TableCell className="py-3">
                    <OcrStatusBadge contenidoOcr={doc.contenido_ocr} tipo={doc.tipo} />
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={doc.url_storage}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver documento"
                      >
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <a
                        href={doc.url_storage}
                        download={doc.nombre_archivo}
                        title="Descargar documento"
                      >
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-muted/50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
