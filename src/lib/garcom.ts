import { supabase } from '@/lib/supabase/client'
import type { FormaPagamento } from '@/types'

// Wrappers das RPCs do garçom (mesmo backend da web; o app manda só IDs).

export type LancarItemInput = {
  produtoId: string
  quantidade: number
  observacao?: string | null
  adicionalIds?: string[]
}

// Lança pedido: find-or-create da comanda da mesa (ou usa a comanda) + cria os
// itens numa transação no servidor (preço/validação/snapshot na RPC).
export async function lancarPedidoGarcom(input: {
  comandaId?: string | null
  mesaId?: string | null
  itens: LancarItemInput[]
}): Promise<string> {
  const p_itens = input.itens.map((i) => ({
    produto_id: i.produtoId,
    quantidade: i.quantidade,
    observacao: i.observacao ?? '',
    adicionais: i.adicionalIds ?? [],
  }))
  const { data, error } = await supabase.rpc('lancar_pedido_garcom', {
    p_comanda_id: input.comandaId ?? null,
    p_mesa_id: input.mesaId ?? null,
    p_itens,
  })
  if (error) throw error
  return data as string
}

// Fecha a comanda; total/taxa RECOMPUTADOS no servidor a partir dos snapshots.
export async function fecharComanda(input: {
  comandaId: string
  formaPagamento: FormaPagamento
  taxaAplicada: boolean
  numeroPessoas: number
}): Promise<number> {
  const { data, error } = await supabase.rpc('fechar_comanda', {
    p_comanda_id: input.comandaId,
    p_forma_pagamento: input.formaPagamento,
    p_taxa_aplicada: input.taxaAplicada,
    p_numero_pessoas: input.numeroPessoas,
  })
  if (error) throw error
  return Number(data)
}

// Cancela comanda VAZIA do próprio tenant (RPC recusa se tiver itens).
export async function cancelarComandaVazia(comandaId: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_comanda_vazia', { p_comanda_id: comandaId })
  if (error) throw error
}
