'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PerfilEmpleado, TipoRol } from '@/lib/supabase/types'

export function useRole() {
  const [perfil, setPerfil] = useState<PerfilEmpleado | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchPerfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('perfiles_empleados')
        .select('*')
        .eq('id', user.id)
        .single()

      setPerfil(data)
      setLoading(false)
    }

    fetchPerfil()
  }, [])

  const isPropietario = perfil?.rol === 'PROPIETARIO'
  const isSecretaria = perfil?.rol === 'SECRETARIA'
  const isTrabajador = perfil?.rol === 'TRABAJADOR'
  const canWrite = isPropietario
  const canRead = !!perfil

  return {
    perfil,
    loading,
    rol: perfil?.rol as TipoRol | undefined,
    isPropietario,
    isSecretaria,
    isTrabajador,
    canWrite,
    canRead,
  }
}
