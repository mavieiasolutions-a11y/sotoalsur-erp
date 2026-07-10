'use client'

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/useRole'
import type { InsertDocumento, ObraProyecto, TipoDocumento } from '@/lib/supabase/types'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudUpload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ============================================================
// TIPO DOCUMENTO CONFIG
// ============================================================
const tipoDocumentoConfig: Record<
  TipoDocumento,
  { label: string; color: string; bgColor: string; acceptsOCR: boolean }
> = {
  PLANO: {
    label: 'Plano',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/20',
    acceptsOCR: false,
  },
  PRESUPUESTO_PDF: {
    label: 'Presupuesto PDF',
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10 border-violet-400/20',
    acceptsOCR: false,
  },
  CONTRATO: {
    label: 'Contrato',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10 border-amber-400/20',
    acceptsOCR: false,
  },
  ALBARAN: {
    label: 'Albarán',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/20',
    acceptsOCR: true,
  },
  FACTURA: {
    label: 'Factura',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10 border-orange-400/20',
    acceptsOCR: false,
  },
}

// ============================================================
// PROPS
// ============================================================
interface DocumentUploaderProps {
  obras: Pick<ObraProyecto, 'id' | 'nombre_obra'>[]
  onUploadSuccess: () => void
}

type UploadState = 'idle' | 'uploading' | 'ocr' | 'success' | 'error'

// ============================================================
// COMPONENT
// ============================================================
export function DocumentUploader({ obras, onUploadSuccess }: DocumentUploaderProps) {
  const { perfil, canWrite } = useRole()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('ALBARAN')
  const [obraId, setObraId] = useState<string>('')
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // ── Drag handlers ─────────────────────────────────────────
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadState('idle')
      setErrorMessage('')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadState('idle')
      setErrorMessage('')
    }
  }

  // ── Format file size ──────────────────────────────────────
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isImageFile = (file: File) => file.type.startsWith('image/')

  // ── Upload handler ────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile || !perfil) return
    if (!canWrite) {
      setErrorMessage('No tienes permisos para subir documentos.')
      return
    }

    setUploadState('uploading')
    setUploadProgress(10)
    setErrorMessage('')

    try {
      // Build storage path
      const timestamp = Date.now()
      const ext = selectedFile.name.split('.').pop()
      const safeFilename = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${tipoDocumento}/${timestamp}_${safeFilename}`

      setUploadProgress(30)

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('documentos')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageError) {
        throw new Error(`Error de almacenamiento: ${storageError.message}`)
      }

      setUploadProgress(60)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(storagePath)

      const publicUrl = urlData.publicUrl

      // Insert record in documentos_vectoriales
      const insertPayload: InsertDocumento = {
        nombre_archivo: selectedFile.name,
        tipo: tipoDocumento,
        url_storage: publicUrl,
        obra_id: obraId || null,
        subido_por: perfil.id,
        contenido_ocr: null,
      }

      const { error: dbError } = await supabase
        .from('documentos_vectoriales')
        .insert(insertPayload)

      if (dbError) {
        throw new Error(`Error al registrar el documento: ${dbError.message}`)
      }

      setUploadProgress(80)

      // If ALBARAN, call OCR webhook
      if (tipoDocumento === 'ALBARAN') {
        setUploadState('ocr')
        try {
          const ocrResponse = await fetch('/api/ocr-albaran', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_url: publicUrl,
              obra_id: obraId || null,
              registrado_por: perfil.id,
            }),
          })
          if (!ocrResponse.ok) {
            console.warn('[OCR] Webhook returned non-OK status, document saved without OCR')
          }
        } catch (ocrErr) {
          console.warn('[OCR] Webhook call failed, document saved without OCR:', ocrErr)
        }
      }

      setUploadProgress(100)
      setUploadState('success')
      onUploadSuccess()

      // Reset after success
      setTimeout(() => {
        setSelectedFile(null)
        setUploadState('idle')
        setUploadProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }, 2500)
    } catch (err) {
      console.error('[DocumentUploader] Upload failed:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Error desconocido')
      setUploadState('error')
      setUploadProgress(0)
    }
  }

  const resetFile = () => {
    setSelectedFile(null)
    setUploadState('idle')
    setUploadProgress(0)
    setErrorMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer',
          dragActive
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-border/50 hover:border-primary/50 hover:bg-primary/5',
          selectedFile ? 'cursor-default' : 'cursor-pointer',
          'min-h-[160px] flex flex-col items-center justify-center gap-3 px-6 py-8'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploadState === 'uploading' || uploadState === 'ocr'}
        />

        {!selectedFile ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <CloudUpload className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Arrastra y suelta tu archivo aquí
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                o haz clic para seleccionar · PDF, JPG, PNG, WEBP
              </p>
            </div>
          </>
        ) : (
          <div className="w-full flex items-start gap-4" onClick={(e) => e.stopPropagation()}>
            {/* File icon */}
            <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center flex-shrink-0">
              {isImageFile(selectedFile) ? (
                <ImageIcon className="w-6 h-6 text-sky-400" />
              ) : (
                <FileText className="w-6 h-6 text-primary" />
              )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatFileSize(selectedFile.size)}
              </p>

              {/* Progress bar */}
              {(uploadState === 'uploading' || uploadState === 'ocr') && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {uploadState === 'ocr' ? 'Procesando OCR…' : 'Subiendo…'}
                    </span>
                    <span className="text-xs text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Success state */}
              {uploadState === 'success' && (
                <div className="mt-2 flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {tipoDocumento === 'ALBARAN'
                      ? 'Subido y enviado a OCR correctamente'
                      : 'Documento subido correctamente'}
                  </span>
                </div>
              )}

              {/* Error state */}
              {uploadState === 'error' && (
                <div className="mt-2 flex items-center gap-1.5 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">{errorMessage || 'Error al subir el archivo'}</span>
                </div>
              )}
            </div>

            {/* Remove file button */}
            {uploadState === 'idle' || uploadState === 'error' ? (
              <button
                onClick={resetFile}
                className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Configuration fields */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tipo de documento */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Tipo de documento
          </label>
          <Select
            value={tipoDocumento}
            onValueChange={(v) => setTipoDocumento(v as TipoDocumento)}
            disabled={uploadState === 'uploading' || uploadState === 'ocr'}
          >
            <SelectTrigger className="w-full h-10 bg-muted/50 border-border rounded-xl">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(tipoDocumentoConfig) as TipoDocumento[]).map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  <span className={tipoDocumentoConfig[tipo].color}>
                    {tipoDocumentoConfig[tipo].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tipoDocumentoConfig[tipoDocumento]?.acceptsOCR && (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              OCR automático activado
            </p>
          )}
        </div>

        {/* Obra asociada */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Obra asociada
          </label>
          <Select
            value={obraId}
            onValueChange={(v) => v !== null && setObraId(v)}
            disabled={uploadState === 'uploading' || uploadState === 'ocr'}
          >
            <SelectTrigger className="w-full h-10 bg-muted/50 border-border rounded-xl">
              <SelectValue placeholder="Sin obra (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin obra</SelectItem>
              {obras.map((obra) => (
                <SelectItem key={obra.id} value={obra.id}>
                  {obra.nombre_obra}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Upload button */}
      <Button
        onClick={handleUpload}
        disabled={
          !selectedFile ||
          uploadState === 'uploading' ||
          uploadState === 'ocr' ||
          uploadState === 'success' ||
          !canWrite
        }
        className="w-full h-11 rounded-xl font-medium"
        style={{
          background:
            !selectedFile || !canWrite
              ? undefined
              : 'linear-gradient(135deg, oklch(0.62 0.22 264), oklch(0.58 0.24 300))',
        }}
      >
        {uploadState === 'uploading' || uploadState === 'ocr' ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {uploadState === 'ocr' ? 'Procesando OCR…' : 'Subiendo…'}
          </>
        ) : uploadState === 'success' ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Subido correctamente
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            {canWrite ? 'Subir documento' : 'Sin permisos de escritura'}
          </>
        )}
      </Button>

      {!canWrite && (
        <p className="text-xs text-center text-muted-foreground">
          Solo el Propietario puede subir documentos.
        </p>
      )}
    </div>
  )
}
