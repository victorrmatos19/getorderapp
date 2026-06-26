import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { GrupoAdicional, SelecaoAdicional } from '@/types'

// CRUD de grupos de adicionais reutilizáveis (+ suas opções). Porte do web —
// mesmo backend (tabelas grupos_adicionais/adicionais); o front só consome.

export type OpcaoInput = { id?: string; nome: string; preco: number; disponivel: boolean; ordem: number }
export type SalvarGrupoInput = {
  id?: string
  nome: string
  selecao: SelecaoAdicional
  obrigatorio: boolean
  min_escolhas: number
  max_escolhas: number | null
  ativo: boolean
  opcoes: OpcaoInput[]
  opcoesRemovidas: string[]
}

export function useAdicionais(restauranteId: string | null | undefined) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ['grupos-adicionais', restauranteId],
    enabled: !!restauranteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grupos_adicionais')
        .select('*, adicionais(*)')
        .eq('restaurante_id', restauranteId!)
        .order('nome')
      if (error) throw error
      const grupos = (data ?? []) as GrupoAdicional[]
      for (const g of grupos) {
        g.adicionais = (g.adicionais ?? [])
          .slice()
          .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
      }
      return grupos
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['grupos-adicionais', restauranteId] })
    qc.invalidateQueries({ queryKey: ['produtos-grupos'] })
    qc.invalidateQueries({ queryKey: ['produto-opcoes'] })
  }

  // Cria/atualiza o grupo + faz o diff das opções (insere novas, atualiza as que
  // têm id, remove as marcadas). Tudo numa mutation; erro = throw.
  const salvarGrupo = useMutation({
    mutationFn: async (input: SalvarGrupoInput) => {
      if (!restauranteId) throw new Error('Restaurante não definido')
      const meta = {
        nome: input.nome,
        selecao: input.selecao,
        obrigatorio: input.obrigatorio,
        min_escolhas: input.min_escolhas,
        max_escolhas: input.max_escolhas,
        ativo: input.ativo,
      }
      let grupoId = input.id
      if (grupoId) {
        const { error } = await supabase.from('grupos_adicionais').update(meta).eq('id', grupoId)
        if (error) throw error
        if (input.opcoesRemovidas.length > 0) {
          const { error: eDel } = await supabase.from('adicionais').delete().in('id', input.opcoesRemovidas)
          if (eDel) throw eDel
        }
      } else {
        const { data, error } = await supabase
          .from('grupos_adicionais')
          .insert({ restaurante_id: restauranteId, ...meta })
          .select('id')
          .single()
        if (error) throw error
        grupoId = data.id
      }
      for (const op of input.opcoes) {
        if (op.id) {
          const { error } = await supabase
            .from('adicionais')
            .update({ nome: op.nome, preco: op.preco, disponivel: op.disponivel, ordem: op.ordem })
            .eq('id', op.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('adicionais').insert({
            restaurante_id: restauranteId,
            grupo_id: grupoId!,
            nome: op.nome,
            preco: op.preco,
            disponivel: op.disponivel,
            ordem: op.ordem,
          })
          if (error) throw error
        }
      }
    },
    onSuccess: invalidate,
  })

  // Toggle leve (ex.: ativo) sem abrir o form.
  const patchGrupo = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<GrupoAdicional> }) => {
      const { error } = await supabase.from('grupos_adicionais').update(input.patch).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const removeGrupo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('grupos_adicionais').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  // Quantos produtos usam este grupo (aviso antes de excluir).
  const contarVinculados = async (grupoId: string) => {
    const { count } = await supabase
      .from('produtos_grupos')
      .select('id', { count: 'exact', head: true })
      .eq('grupo_id', grupoId)
    return count ?? 0
  }

  return { ...list, salvarGrupo, patchGrupo, removeGrupo, contarVinculados }
}
