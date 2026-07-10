export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// ENUMS
// ============================================================
export type TipoRol = 'PROPIETARIO' | 'SECRETARIA' | 'TRABAJADOR'
export type TipoEntidad = 'CLIENTE' | 'PROVEEDOR'
export type EstadoObra = 'PLANIFICACION' | 'EN_PROGRESO' | 'PAUSADA' | 'FINALIZADA'
export type TipoTransaccion =
  | 'PRESUPUESTO_INICIAL'
  | 'ADICIONAL'
  | 'GASTO_MATERIAL'
  | 'NOMINA'
  | 'SUBCONTRATO'
  | 'PAGO_CLIENTE'
  | 'GASTO_FLOTA'
export type EstadoPago = 'PENDIENTE' | 'PAGADO' | 'RECHAZADO'
export type TipoDocumento = 'PLANO' | 'PRESUPUESTO_PDF' | 'CONTRATO' | 'ALBARAN' | 'FACTURA'

// ============================================================
// ROW TYPES
// ============================================================
export interface PerfilEmpleado {
  id: string
  nombre_completo: string
  email: string
  rol: TipoRol
  costo_hora_base: number
  activo: boolean
  created_at: string
}

export interface DirectorioEntidad {
  id: string
  nombre_comercial: string
  razon_social: string | null
  cif_nif: string
  tipo: TipoEntidad
  telefono: string | null
  email: string | null
  direccion_fiscal: string | null
  created_at: string
}

export interface ObraProyecto {
  id: string
  cliente_id: string | null
  nombre_obra: string
  zona_trabajo_ubicacion: string
  estado: EstadoObra
  fecha_inicio: string | null
  fecha_fin: string | null
  presupuesto_adjudicado: number
  created_at: string
  // Joined fields
  directorio_entidades?: DirectorioEntidad | null
}

export interface ContabilidadFinanza {
  id: string
  obra_id: string | null
  entidad_id: string | null
  concepto: string
  monto_neto: number
  impuestos_iva: number
  monto_total: number | null // Generated column
  tipo: TipoTransaccion
  estado: EstadoPago
  fecha_emision: string
  fecha_vencimiento: string | null
  numero_factura: string | null
  comprobante_url: string | null
  registrado_por: string | null
  created_at: string
  // Joined fields
  obras_proyectos?: Pick<ObraProyecto, 'id' | 'nombre_obra'> | null
  directorio_entidades?: Pick<DirectorioEntidad, 'id' | 'nombre_comercial'> | null
  perfiles_empleados?: Pick<PerfilEmpleado, 'id' | 'nombre_completo'> | null
}

export interface ControlHorario {
  id: string
  empleado_id: string
  obra_id: string | null
  marca_entrada: string
  marca_salida: string | null
  latitud_entrada: number | null
  longitud_entrada: number | null
  latitud_salida: number | null
  longitud_salida: number | null
  horas_computadas: number | null // Generated column
  // Joined fields
  perfiles_empleados?: Pick<PerfilEmpleado, 'id' | 'nombre_completo'> | null
  obras_proyectos?: Pick<ObraProyecto, 'id' | 'nombre_obra'> | null
}

export interface NominaPersonal {
  id: string
  empleado_id: string
  periodo_mes: number
  periodo_anio: number
  horas_trabajadas_totales: number
  salario_base_calculado: number
  horas_extra_monto: number
  deducciones: number
  total_neto_liquidado: number
  estado_abono: EstadoPago
  fecha_pago: string | null
  created_at: string
  // Joined fields
  perfiles_empleados?: Pick<PerfilEmpleado, 'id' | 'nombre_completo' | 'costo_hora_base'> | null
}

export interface FlotaVehiculo {
  id: string
  marca_modelo: string
  matricula: string
  vencimiento_seguro: string
  vencimiento_itv: string
  compania_seguradora: string | null
  numero_poliza: string | null
  activo: boolean
}

export interface DocumentoVectorial {
  id: string
  obra_id: string | null
  nombre_archivo: string
  tipo: TipoDocumento
  url_storage: string
  contenido_ocr: string | null
  embedding: number[] | null
  subido_por: string | null
  created_at: string
  // Joined fields
  obras_proyectos?: Pick<ObraProyecto, 'id' | 'nombre_obra'> | null
  perfiles_empleados?: Pick<PerfilEmpleado, 'id' | 'nombre_completo'> | null
}

// ============================================================
// INSERT TYPES (sin campos generados/auto)
// ============================================================
export type InsertObraProyecto = Omit<ObraProyecto, 'id' | 'created_at' | 'directorio_entidades'>
export type InsertContabilidad = Omit<
  ContabilidadFinanza,
  'id' | 'created_at' | 'monto_total' | 'obras_proyectos' | 'directorio_entidades' | 'perfiles_empleados'
>
export type InsertControlHorario = Omit<
  ControlHorario,
  'id' | 'horas_computadas' | 'perfiles_empleados' | 'obras_proyectos'
>
export type InsertNomina = Omit<NominaPersonal, 'id' | 'created_at' | 'perfiles_empleados'>
export type InsertFlotaVehiculo = Omit<FlotaVehiculo, 'id'>
export type InsertDocumento = Omit<
  DocumentoVectorial,
  'id' | 'created_at' | 'embedding' | 'obras_proyectos' | 'perfiles_empleados'
>
export type InsertEntidad = Omit<DirectorioEntidad, 'id' | 'created_at'>

// ============================================================
// DASHBOARD / COMPUTED TYPES
// ============================================================
export interface ResumenFinancieroObra {
  obra_id: string
  nombre_obra: string
  presupuesto_adjudicado: number
  total_gastos: number
  total_ingresos: number
  saldo: number
  desviacion_porcentaje: number
}

export interface VencimientoAlerta {
  vehiculo: FlotaVehiculo
  dias_hasta_itv: number
  dias_hasta_seguro: number
  nivel_critico: 'CRITICO' | 'ALERTA' | 'OK'
}
