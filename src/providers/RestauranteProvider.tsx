import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Restaurante, Role } from '@/types'

// Porta do RestauranteContext da web: resolve role/restaurante do usuário logado
// e re-resolve em qualquer mudança de sessão (login/logout/refresh). Ao trocar de
// usuário, limpa o cache de queries do tenant anterior.

type Value = {
  loading: boolean
  userId: string | null
  email: string | null
  role: Role | null
  nome: string | null
  ativo: boolean
  restauranteId: string | null
  restaurante: Restaurante | null
  isSuperAdmin: boolean
  signOut: () => Promise<void>
  // Recarrega só a linha do restaurante (ex.: após salvar Marca/white-label) para
  // o ThemeProvider repintar sem precisar de logout/refresh de sessão.
  refreshRestaurante: () => Promise<void>
}

const RestauranteContext = createContext<Value>({
  loading: true,
  userId: null,
  email: null,
  role: null,
  nome: null,
  ativo: true,
  restauranteId: null,
  restaurante: null,
  isSuperAdmin: false,
  signOut: async () => {},
  refreshRestaurante: async () => {},
})

type State = Omit<Value, 'isSuperAdmin' | 'signOut' | 'refreshRestaurante'>

const EMPTY: State = {
  loading: false,
  userId: null,
  email: null,
  role: null,
  nome: null,
  ativo: true,
  restauranteId: null,
  restaurante: null,
}

export function RestauranteProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<State>({ ...EMPTY, loading: true })
  const lastUserId = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (lastUserId.current !== null && lastUserId.current !== (user?.id ?? null)) {
        queryClient.clear()
      }
      lastUserId.current = user?.id ?? null

      if (!user) {
        if (active) setState({ ...EMPTY })
        return
      }

      const { data: perfil } = await supabase
        .from('perfis')
        .select('role, restaurante_id, nome, ativo')
        .eq('id', user.id)
        .maybeSingle()

      let restaurante: Restaurante | null = null
      if (perfil?.restaurante_id) {
        const { data: r } = await supabase
          .from('restaurantes')
          .select('*')
          .eq('id', perfil.restaurante_id)
          .maybeSingle()
        restaurante = (r as Restaurante) ?? null
      }

      if (!active) return
      setState({
        loading: false,
        userId: user.id,
        email: user.email ?? null,
        role: (perfil?.role as Role) ?? null,
        nome: perfil?.nome ?? null,
        ativo: perfil?.ativo ?? true,
        restauranteId: perfil?.restaurante_id ?? null,
        restaurante,
      })
    }

    load()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        load()
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [queryClient])

  const refreshRestaurante = useCallback(async () => {
    if (!state.restauranteId) return
    const { data } = await supabase
      .from('restaurantes')
      .select('*')
      .eq('id', state.restauranteId)
      .maybeSingle()
    if (data) setState((s) => ({ ...s, restaurante: data as Restaurante }))
  }, [state.restauranteId])

  const value = useMemo<Value>(
    () => ({
      ...state,
      isSuperAdmin: state.role === 'super_admin',
      signOut: () => supabase.auth.signOut().then(() => {}),
      refreshRestaurante,
    }),
    [state, refreshRestaurante],
  )

  return <RestauranteContext.Provider value={value}>{children}</RestauranteContext.Provider>
}

export function useRestaurante() {
  return useContext(RestauranteContext)
}
