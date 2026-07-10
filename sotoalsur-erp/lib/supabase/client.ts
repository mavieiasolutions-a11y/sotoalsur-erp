import { createBrowserClient } from '@supabase/ssr'

// ============================================================
// DATOS MOCK DE DEMOSTRACIÓN (LocalStorage Fallback)
// ============================================================
const DEFAULT_PERFILES = [
  { id: 'mock-propietario-id', nombre_completo: 'MatIAs (Demo)', email: 'admin@sotoalsur.com', rol: 'PROPIETARIO', costo_hora_base: 50, activo: true, created_at: new Date().toISOString() },
  { id: 'mock-trabajador-id', nombre_completo: 'Juan Trabajador', email: 'juan@sotoalsur.com', rol: 'TRABAJADOR', costo_hora_base: 15, activo: true, created_at: new Date().toISOString() }
]

const DEFAULT_ENTIDADES = [
  { id: 'ent-1', nombre_comercial: 'Materiales Alsur', razon_social: 'Alsur Materiales S.L.', cif_nif: 'B12345678', tipo: 'PROVEEDOR', telefono: '950123456', email: 'ventas@alsur.com', direccion_fiscal: 'Polígono Industrial Soto, 12', created_at: new Date().toISOString() },
  { id: 'ent-2', nombre_comercial: 'Constructora Soto', razon_social: 'Soto Promociones S.A.', cif_nif: 'A87654321', tipo: 'CLIENTE', telefono: '950789456', email: 'contacto@sotopromo.com', direccion_fiscal: 'Av. de la Constitución, 45', created_at: new Date().toISOString() }
]

const DEFAULT_OBRAS = [
  { id: 'obra-1', cliente_id: 'ent-2', nombre_obra: 'Promoción Residencial Vista Hermosa', zona_trabajo_ubicacion: 'Calle de la Alborada, Almería', estado: 'EN_PROGRESO', fecha_inicio: '2026-01-10', fecha_fin: '2026-12-20', presupuesto_adjudicado: 450000.00, created_at: new Date().toISOString() },
  { id: 'obra-2', cliente_id: 'ent-2', nombre_obra: 'Reforma Local Comercial Paseo', zona_trabajo_ubicacion: 'Paseo de Almería, 14', estado: 'PLANIFICACION', fecha_inicio: '2026-08-01', fecha_fin: '2026-10-15', presupuesto_adjudicado: 75000.00, created_at: new Date().toISOString() }
]

const DEFAULT_FINANZAS = [
  { id: 'fin-1', obra_id: 'obra-1', entidad_id: 'ent-2', concepto: 'Certificación Obra Nº 1', monto_neto: 50000.00, impuestos_iva: 10500.00, monto_total: 60500.00, tipo: 'PAGO_CLIENTE', estado: 'PAGADO', fecha_emision: '2026-07-02', registrado_por: 'mock-propietario-id', created_at: new Date().toISOString() },
  { id: 'fin-2', obra_id: 'obra-1', entidad_id: 'ent-1', concepto: 'Compra Cemento y Ladrillos', monto_neto: 4200.00, impuestos_iva: 882.00, monto_total: 5082.00, tipo: 'GASTO_MATERIAL', estado: 'PAGADO', fecha_emision: '2026-07-05', registrado_por: 'mock-propietario-id', created_at: new Date().toISOString() },
  { id: 'fin-3', obra_id: 'obra-1', registrado_por: 'mock-propietario-id', concepto: 'Subcontrata Electricidad Instalación', monto_neto: 12000.00, impuestos_iva: 2520.00, monto_total: 14520.00, tipo: 'SUBCONTRATO', estado: 'PENDIENTE', fecha_emision: '2026-07-09', created_at: new Date().toISOString() }
]

const DEFAULT_FLOTA = [
  { id: 'v-1', marca_modelo: 'Ford Transit 2.0', matricula: '1234-KBB', vencimiento_seguro: '2026-07-16', vencimiento_itv: '2026-07-28', compania_seguradora: 'Mapfre', numero_poliza: 'POL-998822', activo: true },
  { id: 'v-2', marca_modelo: 'Toyota Hilux Pickup', matricula: '9876-LCC', vencimiento_seguro: '2026-08-15', vencimiento_itv: '2026-11-20', compania_seguradora: 'Allianz', numero_poliza: 'POL-112233', activo: true }
]

const DEFAULT_HORARIOS = [
  { id: 'h-1', empleado_id: 'mock-trabajador-id', obra_id: 'obra-1', marca_entrada: '2026-07-10T08:00:00Z', marca_salida: '2026-07-10T16:30:00Z', latitud_entrada: 36.834, longitud_entrada: -2.463, latitud_salida: 36.835, longitud_salida: -2.464, horas_computadas: 8.5 }
]

const DEFAULT_NOMINAS = []

const DEFAULT_DOCUMENTOS = [
  { id: 'doc-1', obra_id: 'obra-1', nombre_archivo: 'plano_cimentacion_revisado.pdf', tipo: 'PLANO', url_storage: '#', contenido_ocr: null, subido_por: 'mock-propietario-id', created_at: new Date().toISOString() }
]

// Inicializar LocalStorage si no existen las claves de demo
function initLocalStorage() {
  if (typeof window === 'undefined') return
  const initKey = (key: string, def: any) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(def))
    }
  }
  initKey('demo_perfiles', DEFAULT_PERFILES)
  initKey('demo_entidades', DEFAULT_ENTIDADES)
  initKey('demo_obras', DEFAULT_OBRAS)
  initKey('demo_finanzas', DEFAULT_FINANZAS)
  initKey('demo_flota', DEFAULT_FLOTA)
  initKey('demo_horarios', DEFAULT_HORARIOS)
  initKey('demo_nominas', DEFAULT_NOMINAS)
  initKey('demo_documentos', DEFAULT_DOCUMENTOS)
  initKey('demo_session', { user: { id: 'mock-propietario-id', email: 'admin@sotoalsur.com' } })
}

// ============================================================
// CLIENTE MOCK INTERACTIVO DE SUPABASE
// ============================================================
class MockSupabaseClient {
  private getStore<T>(key: string): T[] {
    if (typeof window === 'undefined') return []
    return JSON.parse(localStorage.getItem(key) || '[]')
  }

  private setStore<T>(key: string, data: T[]) {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify(data))
  }

  // Simulación de Auth
  auth = {
    getUser: async () => {
      if (typeof window === 'undefined') return { data: { user: null } }
      const session = JSON.parse(localStorage.getItem('demo_session') || 'null')
      return { data: { user: session?.user || null }, error: null }
    },
    signInWithPassword: async ({ email }: { email: string }) => {
      initLocalStorage()
      const perfiles = this.getStore<any>('demo_perfiles')
      const perfil = perfiles.find(p => p.email === email) || perfiles[0]
      const user = { id: perfil.id, email: perfil.email }
      localStorage.setItem('demo_session', JSON.stringify({ user }))
      return { data: { user }, error: null }
    },
    signOut: async () => {
      localStorage.removeItem('demo_session')
      return { error: null }
    }
  }

  // Simulación de Storage
  storage = {
    from: () => ({
      upload: async (path: string, file: any) => {
        return { data: { path }, error: null }
      },
      getPublicUrl: (path: string) => {
        return { data: { publicUrl: '#' } }
      }
    })
  }

  // Consultas e Inserciones de Base de Datos
  from(table: string) {
    initLocalStorage()
    const storeKey = `demo_${table}`
    let data = this.getStore<any>(storeKey)

    // Simulador de constructor de consultas encadenadas
    const queryBuilder = {
      data,
      select: (columns?: string) => {
        // Simular joins sencillos
        if (columns && (columns.includes('directorio_entidades') || columns.includes('perfiles_empleados') || columns.includes('obras_proyectos'))) {
          const entidades = this.getStore<any>('demo_directorio_entidades')
          const perfiles = this.getStore<any>('demo_perfiles_empleados')
          const obras = this.getStore<any>('demo_obras_proyectos')
          queryBuilder.data = queryBuilder.data.map(item => ({
            ...item,
            directorio_entidades: entidades.find(e => e.id === item.entidad_id || e.id === item.cliente_id) || null,
            perfiles_empleados: perfiles.find(p => p.id === item.empleado_id || p.id === item.registrado_por || p.id === item.subido_por) || null,
            obras_proyectos: obras.find(o => o.id === item.obra_id) || null
          }))
        }
        return queryBuilder
      },
      eq: (column: string, value: any) => {
        queryBuilder.data = queryBuilder.data.filter(item => item[column] === value)
        return queryBuilder
      },
      neq: (column: string, value: any) => {
        queryBuilder.data = queryBuilder.data.filter(item => item[column] !== value)
        return queryBuilder
      },
      is: (column: string, value: any) => {
        queryBuilder.data = queryBuilder.data.filter(item => item[column] === value)
        return queryBuilder
      },
      order: (column: string, options?: any) => {
        queryBuilder.data.sort((a, b) => {
          if (a[column] < b[column]) return options?.ascending ? -1 : 1
          if (a[column] > b[column]) return options?.ascending ? 1 : -1
          return 0
        })
        return queryBuilder
      },
      limit: (num: number) => {
        queryBuilder.data = queryBuilder.data.slice(0, num)
        return queryBuilder
      },
      gte: (column: string, value: any) => {
        queryBuilder.data = queryBuilder.data.filter(item => item[column] >= value)
        return queryBuilder
      },
      lte: (column: string, value: any) => {
        queryBuilder.data = queryBuilder.data.filter(item => item[column] <= value)
        return queryBuilder
      },
      single: () => {
        return { data: queryBuilder.data[0] || null, error: queryBuilder.data[0] ? null : { message: 'Not found' } }
      },
      // Mutaciones
      insert: async (newData: any) => {
        const items = Array.isArray(newData) ? newData : [newData]
        const created = items.map(item => ({
          id: `mock-id-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          ...item
        }))
        const updatedStore = [...created, ...this.getStore<any>(storeKey)]
        this.setStore(storeKey, updatedStore)
        return { data: Array.isArray(newData) ? created : created[0], error: null }
      },
      update: async (updateData: any) => {
        // En un update real, filtramos primero. Simulamos update en los datos filtrados
        const updatedStore = this.getStore<any>(storeKey).map(item => {
          const match = queryBuilder.data.some(f => f.id === item.id)
          return match ? { ...item, ...updateData } : item
        })
        this.setStore(storeKey, updatedStore)
        return { data: updateData, error: null }
      },
      upsert: async (upsertData: any) => {
        const items = Array.isArray(upsertData) ? upsertData : [upsertData]
        let currentStore = this.getStore<any>(storeKey)
        items.forEach(item => {
          const index = currentStore.findIndex(c => c.id === item.id)
          if (index !== -1) {
            currentStore[index] = { ...currentStore[index], ...item }
          } else {
            currentStore.push({ id: `mock-id-${Date.now()}`, ...item })
          }
        })
        this.setStore(storeKey, currentStore)
        return { data: upsertData, error: null }
      },
      delete: async () => {
        const idsToRemove = queryBuilder.data.map(d => d.id)
        const updatedStore = this.getStore<any>(storeKey).filter(item => !idsToRemove.includes(item.id))
        this.setStore(storeKey, updatedStore)
        return { error: null }
      },
      // Permitir la resolución asíncrona de la query
      then: (resolve: any) => {
        resolve({ data: queryBuilder.data, error: null })
      }
    }
    return queryBuilder
  }
}

// Exportar el cliente de Supabase real o el Mock interactivo según la configuración
export function createClient() {
  // Si no se han configurado credenciales reales de Supabase en las variables de entorno,
  // o si el proyecto se encuentra en modo bypass/offline, devolvemos el Mock Client interactivo.
  const isDummyUrl = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy') ||
                     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('TU_PROYECTO')
  
  if (isDummyUrl) {
    if (typeof window !== 'undefined') {
      initLocalStorage()
    }
    return new MockSupabaseClient() as any
  }

  // De lo contrario, usamos el cliente real de Supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createBrowserClient(url!, anonKey!)
}
