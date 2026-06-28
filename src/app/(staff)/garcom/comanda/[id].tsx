import { useEffect, useId, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Screen } from '@/components/ui/Screen'
import { Header } from '@/components/ui/Header'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Toast } from '@/components/ui/Toast'
import { CheckoutModal } from '@/components/CheckoutModal'
import { fmt } from '@/lib/formatters'
import { subtotalItem, totalComanda } from '@/lib/calcComanda'
import { useComanda, useItensComanda } from '@/lib/hooks/useComanda'
import { cancelarComandaVazia, marcarContaAtendida } from '@/lib/garcom'
import type { ItemPedido } from '@/types'

function groupRounds(itens: ItemPedido[]): { start: string; items: ItemPedido[] }[] {
  if (itens.length === 0) return []
  const sorted = [...itens].sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
  const rounds: { start: string; items: ItemPedido[] }[] = []
  let cur: { start: string; items: ItemPedido[] } | null = null
  for (const it of sorted) {
    if (!cur) {
      cur = { start: it.criado_em, items: [it] }
      continue
    }
    const last = cur.items[cur.items.length - 1]
    const gap = new Date(it.criado_em).getTime() - new Date(last.criado_em).getTime()
    if (gap <= 2 * 60_000) cur.items.push(it)
    else {
      rounds.push(cur)
      cur = { start: it.criado_em, items: [it] }
    }
  }
  if (cur) rounds.push(cur)
  return rounds
}

export default function ComandaDetalhe() {
  const { id, lancado } = useLocalSearchParams<{ id: string; lancado?: string }>()
  const comandaId = id
  const qc = useQueryClient()

  const [toast, setToast] = useState(() =>
    lancado === '1' ? { visible: true, message: 'Pedido lançado para a cozinha' } : { visible: false, message: '' },
  )
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [entregandoId, setEntregandoId] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [cancelandoComanda, setCancelandoComanda] = useState(false)

  const cid = useId()
  const comandaQ = useComanda(comandaId)
  const itensQ = useItensComanda(comandaId)

  // Volta para a lista sem empilhar uma nova instância (que duplicaria o canal realtime).
  const voltarLista = () => {
    if (router.canDismiss()) router.dismissAll()
    else router.replace('/garcom')
  }

  useEffect(() => {
    const ch = supabase
      .channel(`garcom-comanda-${comandaId}-${cid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_pedido', filter: `comanda_id=eq.${comandaId}` }, () =>
        qc.invalidateQueries({ queryKey: ['itens', 'comanda', comandaId] }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [comandaId, qc, cid])

  // Garçom abriu a comanda → atende a solicitação de conta (limpa o sinal "Conta pedida", se houver).
  useEffect(() => {
    marcarContaAtendida(comandaId).catch(() => {})
  }, [comandaId])

  const itens = useMemo(() => itensQ.data ?? [], [itensQ.data])
  const subtotal = useMemo(() => totalComanda(itens), [itens])
  const rounds = useMemo(() => groupRounds(itens), [itens])
  const prontos = useMemo(() => itens.filter((it) => it.status === 'pronto'), [itens])

  const entregarIds = async (ids: string[]) => {
    if (ids.length === 0) return
    const { error } = await supabase.from('itens_pedido').update({ status: 'entregue' }).in('id', ids)
    if (error) {
      setToast({ visible: true, message: error.message })
      return
    }
    qc.invalidateQueries({ queryKey: ['itens', 'comanda', comandaId] })
    setToast({ visible: true, message: ids.length === 1 ? 'Item entregue ✓' : `${ids.length} itens entregues ✓` })
  }

  const cancelarItem = async (itId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('itens_pedido')
      .update({ status: 'cancelado', cancelado_em: new Date().toISOString(), cancelado_por: user?.id ?? null })
      .eq('id', itId)
      .eq('status', 'novo')
      .select('id')
    if (error) {
      setToast({ visible: true, message: error.message })
      return
    }
    if (!data || data.length === 0) {
      setToast({ visible: true, message: 'Já estava em preparo, não foi possível cancelar.' })
      return
    }
    setToast({ visible: true, message: 'Item cancelado' })
    qc.invalidateQueries({ queryKey: ['itens', 'comanda', comandaId] })
  }

  const cancelarComanda = async () => {
    if (cancelandoComanda) return
    setCancelandoComanda(true)
    try {
      await cancelarComandaVazia(comandaId)
      setToast({ visible: true, message: 'Comanda cancelada' })
      setTimeout(() => voltarLista(), 800)
    } catch (e: any) {
      setCancelandoComanda(false)
      setToast({ visible: true, message: e?.message || 'Erro ao cancelar a comanda.' })
    }
  }

  if (comandaQ.isLoading) {
    return (
      <Screen className="items-center justify-center">
        <Spinner color="#9B4A3C" />
      </Screen>
    )
  }
  if (comandaQ.isError || !comandaQ.data) {
    return (
      <Screen className="items-center justify-center px-6">
        <EmptyState
          icon="⚠️"
          title="Comanda não encontrada"
          action={<Pressable onPress={() => voltarLista()}><Text className="text-sm text-accent underline">Voltar</Text></Pressable>}
        />
      </Screen>
    )
  }

  const comanda = comandaQ.data as any
  const mesa = comanda.mesa
  const isFechada = comanda.status === 'fechada'
  const vazia = !itensQ.isLoading && itens.length === 0

  return (
    <Screen className="px-5">
      <Header title={comanda.cliente_nome || mesa?.nome || 'Comanda'} subtitle={comanda.cliente_nome ? mesa?.nome : undefined} onBack={() => voltarLista()} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 200 }}>
        {itensQ.isLoading ? (
          <View className="py-16 items-center"><Spinner color="#9B4A3C" /></View>
        ) : itens.length === 0 ? (
          <EmptyState icon="🍽️" title="Sem pedidos ainda" />
        ) : null}

        {rounds.map((r, idx) => (
          <View key={idx} className="mb-6">
            <View className="mb-3 flex-row items-baseline gap-3">
              <Text className="text-xs font-sans-bold uppercase text-text-mid">Rodada {idx + 1}</Text>
              <Text className="text-xs text-muted">{fmt.time(r.start)}</Text>
            </View>
            {r.items.map((it) => {
              const canceled = it.status === 'cancelado'
              const confirming = confirmCancelId === it.id
              return (
                <View key={it.id} className="flex-row items-start gap-3 border-b border-line py-3" style={{ opacity: canceled ? 0.55 : 1 }}>
                  <View className="min-w-0 flex-1">
                    <Text className={`text-sm text-ink ${canceled ? 'line-through' : ''}`}>
                      {it.produto?.nome ?? '—'} <Text className="text-text-mid">× {it.quantidade}</Text>
                    </Text>
                    {(it.adicionais ?? []).map((a) => (
                      <Text key={a.id} className="mt-0.5 text-xs text-text-mid">+ {a.nome_snapshot}{a.preco_snapshot > 0 ? ` (${fmt.currency(a.preco_snapshot)})` : ''}</Text>
                    ))}
                    {it.obs ? <Text className="mt-0.5 text-xs italic text-text-mid">↳ {it.obs}</Text> : null}
                    <View className="mt-1 flex-row">
                      {canceled ? (
                        <View className="rounded-full px-2 py-0.5" style={{ borderWidth: 1, borderColor: '#B8B5AB' }}>
                          <Text className="text-[11px] text-muted">Cancelado</Text>
                        </View>
                      ) : (
                        <StatusBadge status={it.status} />
                      )}
                    </View>
                    {confirming ? (
                      <View className="mt-2 flex-row items-center gap-2">
                        <Text className="text-xs text-text-mid">Cancelar este item?</Text>
                        <Pressable onPress={() => { cancelarItem(it.id); setConfirmCancelId(null) }} className="rounded-lg bg-accent px-2 py-1">
                          <Text className="text-xs text-on-accent">Sim, cancelar</Text>
                        </Pressable>
                        <Pressable onPress={() => setConfirmCancelId(null)} className="rounded-lg border border-line px-2 py-1">
                          <Text className="text-xs text-text-mid">Voltar</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                  <View className="items-end gap-1">
                    <Text className={`text-sm font-sans-bold ${canceled ? 'text-muted line-through' : 'text-ink'}`}>{fmt.currency(subtotalItem(it))}</Text>
                    {it.status === 'pronto' && !isFechada ? (
                      <Pressable onPress={async () => { setEntregandoId(it.id); await entregarIds([it.id]); setEntregandoId(null) }} disabled={entregandoId === it.id} className="rounded-lg px-2 py-1" style={{ backgroundColor: '#567D4F', minHeight: 32, justifyContent: 'center' }}>
                        {entregandoId === it.id ? <Spinner color="#FAF9F5" /> : <Text className="text-xs font-sans-bold" style={{ color: '#FAF9F5' }}>✓ Entreguei</Text>}
                      </Pressable>
                    ) : null}
                    {it.status === 'novo' && !isFechada && !confirming ? (
                      <Pressable onPress={() => setConfirmCancelId(it.id)} className="rounded-lg border border-line px-2 py-1">
                        <Text className="text-xs text-accent">Cancelar</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )
            })}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-bg px-5 pb-6 pt-4">
        <View className="mb-4 flex-row items-baseline justify-between border-b border-line pb-3">
          <Text className="text-sm text-ink">Subtotal</Text>
          <Text className="font-serif text-2xl text-price">{fmt.currency(subtotal)}</Text>
        </View>

        {isFechada ? (
          <Text className="text-center text-sm text-muted">Comanda já encerrada</Text>
        ) : (
          <View className="gap-2">
            <Pressable onPress={() => router.push(`/garcom/pedido?comanda=${comandaId}`)} className="w-full items-center justify-center rounded-xl bg-primary" style={{ minHeight: 52 }}>
              <Text className="font-sans-bold text-sm text-on-primary">+ Novo pedido</Text>
            </Pressable>
            {vazia ? (
              <Pressable onPress={cancelarComanda} disabled={cancelandoComanda} className="w-full items-center justify-center rounded-xl border border-accent" style={{ minHeight: 52 }}>
                {cancelandoComanda ? <Spinner color="#9B4A3C" /> : <Text className="font-sans-bold text-sm text-accent">Cancelar comanda vazia</Text>}
              </Pressable>
            ) : (
              <View className="flex-row gap-2">
                {prontos.length > 0 ? (
                  <Pressable onPress={async () => { setEntregando(true); await entregarIds(prontos.map((p) => p.id)); setEntregando(false) }} disabled={entregando} className="flex-1 items-center justify-center rounded-xl border" style={{ minHeight: 52, borderColor: '#567D4F' }}>
                    {entregando ? <Spinner color="#567D4F" /> : <Text className="font-sans-bold text-sm" style={{ color: '#567D4F' }}>✓ Entregar ({prontos.length})</Text>}
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setCheckoutOpen(true)} className="items-center justify-center rounded-xl bg-accent" style={{ flex: prontos.length > 0 ? 2 : 1, minHeight: 52 }}>
                  <Text className="font-sans-bold text-sm text-on-accent">Encerrar e Cobrar</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>

      {checkoutOpen ? (
        <CheckoutModal
          comandaId={comandaId}
          clienteNome={comanda.cliente_nome}
          mesaNome={mesa?.nome ?? ''}
          restauranteId={comanda.restaurante_id}
          itens={itens}
          subtotal={subtotal}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setToast({ visible: true, message: 'Comanda encerrada com sucesso!' })
            setTimeout(() => voltarLista(), 1200)
          }}
        />
      ) : null}

      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
    </Screen>
  )
}
