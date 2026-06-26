import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { ProdutoGrupo } from '@/types'

// Vínculo produto ↔ grupos de adicionais (junção produtos_grupos). Porte do web.
// Desabilitado quando o produto ainda não foi salvo (sem id).
export function useProdutoGrupos(
  produtoId: string | null | undefined,
  restauranteId: string | null | undefined,
) {
  const qc = useQueryClient()
  const key = ['produtos-grupos', produtoId]

  const q = useQuery({
    queryKey: key,
    enabled: !!produtoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos_grupos')
        .select('*, grupo:grupos_adicionais(*, adicionais(*))')
        .eq('produto_id', produtoId!)
        .order('ordem')
      if (error) throw error
      return (data ?? []) as ProdutoGrupo[]
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key })
    qc.invalidateQueries({ queryKey: ['produto-opcoes', produtoId] })
  }

  // Vincula um grupo ao produto (idempotente via onConflict da UNIQUE).
  const vincular = useMutation({
    mutationFn: async (input: { grupoId: string; ordem: number }) => {
      if (!produtoId || !restauranteId) throw new Error('Produto não salvo')
      const { error } = await supabase.from('produtos_grupos').upsert(
        { restaurante_id: restauranteId, produto_id: produtoId, grupo_id: input.grupoId, ordem: input.ordem },
        { onConflict: 'produto_id,grupo_id', ignoreDuplicates: true },
      )
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const desvincular = useMutation({
    mutationFn: async (grupoId: string) => {
      if (!produtoId) throw new Error('Produto não salvo')
      const { error } = await supabase
        .from('produtos_grupos')
        .delete()
        .eq('produto_id', produtoId)
        .eq('grupo_id', grupoId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const setOrdem = useMutation({
    mutationFn: async (input: { grupoId: string; ordem: number }) => {
      if (!produtoId) throw new Error('Produto não salvo')
      const { error } = await supabase
        .from('produtos_grupos')
        .update({ ordem: input.ordem })
        .eq('produto_id', produtoId)
        .eq('grupo_id', input.grupoId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { ...q, vincular, desvincular, setOrdem }
}
