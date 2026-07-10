-- ============================================================
-- SOTOALSUR ERP — ESQUEMA SQL COMPLETO
-- Ejecutar en el Editor SQL de Supabase
-- ============================================================

-- Inicialización de Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- ENUMS DEL SISTEMA
-- ============================================================
CREATE TYPE tipo_rol AS ENUM ('PROPIETARIO', 'SECRETARIA', 'TRABAJADOR');
CREATE TYPE tipo_entidad AS ENUM ('CLIENTE', 'PROVEEDOR');
CREATE TYPE estado_obra AS ENUM ('PLANIFICACION', 'EN_PROGRESO', 'PAUSADA', 'FINALIZADA');
CREATE TYPE tipo_transaccion AS ENUM (
    'PRESUPUESTO_INICIAL',
    'ADICIONAL',
    'GASTO_MATERIAL',
    'NOMINA',
    'SUBCONTRATO',
    'PAGO_CLIENTE',
    'GASTO_FLOTA'
);
CREATE TYPE estado_pago AS ENUM ('PENDIENTE', 'PAGADO', 'RECHAZADO');
CREATE TYPE tipo_documento AS ENUM ('PLANO', 'PRESUPUESTO_PDF', 'CONTRATO', 'ALBARAN', 'FACTURA');

-- ============================================================
-- 1. TABLA DE PERFILES DE EMPLEADOS
-- ============================================================
CREATE TABLE perfiles_empleados (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    nombre_completo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    rol tipo_rol DEFAULT 'TRABAJADOR' NOT NULL,
    costo_hora_base NUMERIC(10, 2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 2. CARTERA DE CLIENTES Y PROVEEDORES
-- ============================================================
CREATE TABLE directorio_entidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_comercial TEXT NOT NULL,
    razon_social TEXT,
    cif_nif TEXT UNIQUE NOT NULL,
    tipo tipo_entidad NOT NULL,
    telefono TEXT,
    email TEXT,
    direccion_fiscal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 3. GESTIÓN DE OBRAS Y ZONAS DE TRABAJO
-- ============================================================
CREATE TABLE obras_proyectos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID REFERENCES directorio_entidades(id) ON DELETE RESTRICT,
    nombre_obra TEXT NOT NULL,
    zona_trabajo_ubicacion TEXT NOT NULL,
    estado estado_obra DEFAULT 'PLANIFICACION' NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    presupuesto_adjudicado NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 4. FINANZAS, CONTABILIDAD Y CONTROL DE GASTOS/INGRESOS
-- ============================================================
CREATE TABLE contabilidad_finanzas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID REFERENCES obras_proyectos(id) ON DELETE CASCADE,
    entidad_id UUID REFERENCES directorio_entidades(id) ON DELETE RESTRICT,
    concepto TEXT NOT NULL,
    monto_neto NUMERIC(12, 2) NOT NULL,
    impuestos_iva NUMERIC(12, 2) DEFAULT 0.00,
    monto_total NUMERIC(12, 2) GENERATED ALWAYS AS (monto_neto + impuestos_iva) STORED,
    tipo tipo_transaccion NOT NULL,
    estado estado_pago DEFAULT 'PENDIENTE' NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE,
    numero_factura TEXT,
    comprobante_url TEXT,
    registrado_por UUID REFERENCES perfiles_empleados(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 5. CONTROL DE HORARIOS Y ASISTENCIA GEOLOCALIZADA
-- ============================================================
CREATE TABLE control_horarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empleado_id UUID REFERENCES perfiles_empleados(id) ON DELETE CASCADE,
    obra_id UUID REFERENCES obras_proyectos(id) ON DELETE SET NULL,
    marca_entrada TIMESTAMP WITH TIME ZONE NOT NULL,
    marca_salida TIMESTAMP WITH TIME ZONE,
    latitud_entrada NUMERIC(10, 7),
    longitud_entrada NUMERIC(10, 7),
    latitud_salida NUMERIC(10, 7),
    longitud_salida NUMERIC(10, 7),
    horas_computadas NUMERIC(5, 2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (marca_salida - marca_entrada)) / 3600
    ) STORED
);

-- ============================================================
-- 6. GESTIÓN DE NÓMINAS E HISTORIAL CONTABLE DEL PERSONAL
-- ============================================================
CREATE TABLE nominas_personal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empleado_id UUID REFERENCES perfiles_empleados(id) ON DELETE RESTRICT,
    periodo_mes INT NOT NULL,
    periodo_anio INT NOT NULL,
    horas_trabajadas_totales NUMERIC(6, 2) NOT NULL,
    salario_base_calculado NUMERIC(12, 2) NOT NULL,
    horas_extra_monto NUMERIC(12, 2) DEFAULT 0.00,
    deducciones NUMERIC(12, 2) DEFAULT 0.00,
    total_neto_liquidado NUMERIC(12, 2) NOT NULL,
    estado_abono estado_pago DEFAULT 'PENDIENTE' NOT NULL,
    fecha_pago DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL,
    UNIQUE(empleado_id, periodo_mes, periodo_anio)
);

-- ============================================================
-- 7. CONTROL DE FLOTA DE VEHÍCULOS
-- ============================================================
CREATE TABLE flota_vehiculos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    marca_modelo TEXT NOT NULL,
    matricula TEXT UNIQUE NOT NULL,
    vencimiento_seguro DATE NOT NULL,
    vencimiento_itv DATE NOT NULL,
    compania_seguradora TEXT,
    numero_poliza TEXT,
    activo BOOLEAN DEFAULT TRUE NOT NULL
);

-- ============================================================
-- 8. REPOSITORIO DOCUMENTAL INDEXADO PARA RAG MULTIMODAL
-- ============================================================
CREATE TABLE documentos_vectoriales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id UUID REFERENCES obras_proyectos(id) ON DELETE CASCADE,
    nombre_archivo TEXT NOT NULL,
    tipo tipo_documento NOT NULL,
    url_storage TEXT NOT NULL,
    contenido_ocr TEXT,
    embedding VECTOR(1536),
    subido_por UUID REFERENCES perfiles_empleados(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

-- ============================================================
-- HABILITACIÓN DE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE perfiles_empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE directorio_entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contabilidad_finanzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominas_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE flota_vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_vectoriales ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS — FUNCIÓN AUXILIAR
-- ============================================================
CREATE OR REPLACE FUNCTION is_propietario()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM perfiles_empleados
        WHERE perfiles_empleados.id = auth.uid()
        AND perfiles_empleados.rol = 'PROPIETARIO'
    );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_authenticated_user()
RETURNS BOOLEAN AS $$
    SELECT auth.role() = 'authenticated';
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- POLÍTICAS RLS — PERFILES EMPLEADOS
-- ============================================================
CREATE POLICY "empleados_select_authenticated"
    ON perfiles_empleados FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "empleados_insert_propietario"
    ON perfiles_empleados FOR INSERT
    WITH CHECK (is_propietario());

CREATE POLICY "empleados_update_propietario"
    ON perfiles_empleados FOR UPDATE
    USING (is_propietario());

CREATE POLICY "empleados_delete_propietario"
    ON perfiles_empleados FOR DELETE
    USING (is_propietario());

-- ============================================================
-- POLÍTICAS RLS — DIRECTORIO ENTIDADES
-- ============================================================
CREATE POLICY "entidades_select_authenticated"
    ON directorio_entidades FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "entidades_write_propietario"
    ON directorio_entidades FOR ALL
    USING (is_propietario())
    WITH CHECK (is_propietario());

-- ============================================================
-- POLÍTICAS RLS — OBRAS PROYECTOS
-- ============================================================
CREATE POLICY "obras_select_authenticated"
    ON obras_proyectos FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "obras_write_propietario"
    ON obras_proyectos FOR ALL
    USING (is_propietario())
    WITH CHECK (is_propietario());

-- ============================================================
-- POLÍTICAS RLS — CONTABILIDAD FINANZAS
-- ============================================================
CREATE POLICY "finanzas_select_authenticated"
    ON contabilidad_finanzas FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "finanzas_write_propietario"
    ON contabilidad_finanzas FOR ALL
    USING (is_propietario())
    WITH CHECK (is_propietario());

-- ============================================================
-- POLÍTICAS RLS — CONTROL HORARIOS
-- (Excepción: trabajadores pueden insertar sus propios marcajes)
-- ============================================================
CREATE POLICY "horarios_select_authenticated"
    ON control_horarios FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "horarios_insert_own"
    ON control_horarios FOR INSERT
    WITH CHECK (auth.uid() = empleado_id);

CREATE POLICY "horarios_update_propietario"
    ON control_horarios FOR UPDATE
    USING (is_propietario());

CREATE POLICY "horarios_delete_propietario"
    ON control_horarios FOR DELETE
    USING (is_propietario());

-- ============================================================
-- POLÍTICAS RLS — NÓMINAS PERSONAL
-- ============================================================
CREATE POLICY "nominas_select_authenticated"
    ON nominas_personal FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "nominas_write_propietario"
    ON nominas_personal FOR ALL
    USING (is_propietario())
    WITH CHECK (is_propietario());

-- ============================================================
-- POLÍTICAS RLS — FLOTA VEHÍCULOS
-- ============================================================
CREATE POLICY "flota_select_authenticated"
    ON flota_vehiculos FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "flota_write_propietario"
    ON flota_vehiculos FOR ALL
    USING (is_propietario())
    WITH CHECK (is_propietario());

-- ============================================================
-- POLÍTICAS RLS — DOCUMENTOS VECTORIALES
-- (Cualquier autenticado puede subir; solo propietario modifica/elimina)
-- ============================================================
CREATE POLICY "documentos_select_authenticated"
    ON documentos_vectoriales FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "documentos_insert_authenticated"
    ON documentos_vectoriales FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "documentos_update_propietario"
    ON documentos_vectoriales FOR UPDATE
    USING (is_propietario());

CREATE POLICY "documentos_delete_propietario"
    ON documentos_vectoriales FOR DELETE
    USING (is_propietario());

-- ============================================================
-- ÍNDICE VECTORIAL PARA BÚSQUEDA RAG
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_documentos_embedding
    ON documentos_vectoriales
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================
-- STORAGE: Bucket para archivos adjuntos
-- (Ejecutar desde el Dashboard de Supabase Storage o via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', false);
-- ============================================================

-- ============================================================
-- TRIGGER AUTOMÁTICO DE PERFILES AL CREAR USUARIO EN AUTH
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles_empleados (id, nombre_completo, email, rol, costo_hora_base, activo)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', split_part(new.email, '@', 1)),
    new.email,
    COALESCE((new.raw_user_meta_data->>'rol')::tipo_rol, 'TRABAJADOR'::tipo_rol),
    COALESCE((new.raw_user_meta_data->>'costo_hora_base')::numeric, 0.00),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

