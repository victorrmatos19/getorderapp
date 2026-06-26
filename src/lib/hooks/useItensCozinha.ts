import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { ItemPedido } from '@/types'

// Porta verbatim do hook web: itens ativos da cozinha (status in novo/em_preparo/pronto)
// com produto, comanda(mesa) e adicionais. RLS escopa por tenant (staff autenticado).
export function useItensCozinha() {
  return useQuery({
    queryKey: ['itens', 'cozinha'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itens_pedido')
        .select(
          'id, comanda_id, produto_id, quantidade, obs, status, criado_em, produto:produtos(nome), comanda:comandas(cliente_nome, mesa:mesas(nome)), adicionais:itens_pedido_adicionais(*)',
        )
        .in('status', ['novo', 'em_preparo', 'pronto'])
        .order('criado_em', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as ItemPedido[]
    },
  })
}
