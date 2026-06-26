import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Comanda, ItemPedido } from '@/types'

export function useComanda(id: string | undefined) {
  return useQuery({
    queryKey: ['comanda', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comandas')
        .select('*, mesa:mesas(*)')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as (Comanda & { mesa?: any }) | null
    },
  })
}

export function useItensComanda(comandaId: string | undefined) {
  return useQuery({
    queryKey: ['itens', 'comanda', comandaId],
    enabled: !!comandaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itens_pedido')
        .select('*, produto:produtos(*), adicionais:itens_pedido_adicionais(*)')
        .eq('comanda_id', comandaId!)
        .order('criado_em', { ascending: true })
      if (error) throw error
      return (data ?? []) as ItemPedido[]
    },
  })
}
