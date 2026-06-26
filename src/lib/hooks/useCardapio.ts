import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Categoria, GrupoAdicional, Produto } from '@/types'

export function useProdutos(restauranteId: string | null | undefined, opts: { soDisponiveis?: boolean } = {}) {
  return useQuery({
    queryKey: ['produtos', restauranteId, opts.soDisponiveis ?? false],
    enabled: !!restauranteId,
    queryFn: async () => {
      let q = supabase
        .from('produtos')
        .select('*, categoria_ref:categorias(*)')
        .eq('restaurante_id', restauranteId!)
        .order('destaque_ordem', { ascending: true })
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true })
      if (opts.soDisponiveis) q = q.eq('disponivel', true)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Produto[]
    },
  })
}

export function useCategorias(restauranteId: string | null | undefined, opts: { soAtivas?: boolean } = {}) {
  return useQuery({
    queryKey: ['categorias', restauranteId, opts.soAtivas ?? false],
    enabled: !!restauranteId,
    queryFn: async () => {
      let q = supabase
        .from('categorias')
        .select('*')
        .eq('restaurante_id', restauranteId!)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true })
      if (opts.soAtivas) q = q.eq('ativa', true)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Categoria[]
    },
  })
}

// Grupos de adicionais vinculados a um produto (ativos, opções disponíveis, ordenados).
export function useProdutoOpcoes(produtoId: string | null | undefined) {
  return useQuery({
    queryKey: ['produto-opcoes', produtoId],
    enabled: !!produtoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos_grupos')
        .select('ordem, grupo:grupos_adicionais(*, adicionais(*))')
        .eq('produto_id', produtoId!)
        .order('ordem')
      if (error) throw error
      const grupos: GrupoAdicional[] = []
      for (const row of (data ?? []) as any[]) {
        const g = row.grupo
        if (!g || !g.ativo) continue
        const adicionais = (g.adicionais ?? [])
          .filter((a: any) => a.disponivel)
          .sort((a: any, b: any) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
        grupos.push({ ...g, adicionais } as GrupoAdicional)
      }
      return grupos
    },
  })
}
