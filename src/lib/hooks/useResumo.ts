import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

// Contadores da cozinha (itens ativos) + realtime — prova de Supabase + TanStack +
// channel funcionando no RN. RLS já escopa por tenant (staff autenticado).
export function useCozinhaResumo() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['cozinha-resumo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itens_pedido')
        .select('status')
        .in('status', ['novo', 'em_preparo', 'pronto'])
      if (error) throw error
      const c = { novos: 0, preparando: 0, prontos: 0 }
      for (const it of data ?? []) {
        if (it.status === 'novo') c.novos++
        else if (it.status === 'em_preparo') c.preparando++
        else if (it.status === 'pronto') c.prontos++
      }
      return c
    },
  })

  useEffect(() => {
    const ch = supabase
      .channel('app-cozinha-resumo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_pedido' }, () =>
        qc.invalidateQueries({ queryKey: ['cozinha-resumo'] }),
      )
      .subscribe()
    return () => {
      ch.unsubscribe()
    }
  }, [qc])

  return q
}

// Nº de comandas abertas — realtime (home do garçom).
export function useComandasAbertasCount() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['comandas-abertas-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('comandas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'aberta')
      if (error) throw error
      return count ?? 0
    },
  })

  useEffect(() => {
    const ch = supabase
      .channel('app-comandas-abertas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, () =>
        qc.invalidateQueries({ queryKey: ['comandas-abertas-count'] }),
      )
      .subscribe()
    return () => {
      ch.unsubscribe()
    }
  }, [qc])

  return q
}
