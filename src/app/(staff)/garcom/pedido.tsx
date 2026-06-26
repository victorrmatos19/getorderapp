import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Header } from '@/components/ui/Header'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProductCard } from '@/components/ProductCard'
import { ProdutoDetalhe } from '@/components/ProdutoDetalhe'
import { fmt } from '@/lib/formatters'
import { subtotalCartLine, totalCart } from '@/lib/calcComanda'
import type { CartLine } from '@/lib/calcComanda'
import { lancarPedidoGarcom } from '@/lib/garcom'
import { useProdutos, useCategorias } from '@/lib/hooks/useCardapio'
import type { Produto } from '@/types'

const TODOS = 'todos'

export default function PedidoGarcom() {
  const { mesa, comanda } = useLocalSearchParams<{ mesa?: string; comanda?: string }>()
  const mesaId = mesa ?? null
  const comandaId = comanda ?? null
  const { restauranteId } = useRestaurante()

  const [busca, setBusca] = useState('')
  const [catSel, setCatSel] = useState<string>(TODOS)
  const [cart, setCart] = useState<CartLine[]>([])
  const [detalhe, setDetalhe] = useState<Produto | null>(null)
  const [modal, setModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState('')

  const produtosQ = useProdutos(restauranteId, { soDisponiveis: true })
  const categoriasQ = useCategorias(restauranteId, { soAtivas: true })

  const alvoQ = useQuery({
    queryKey: ['pedido-alvo', mesaId, comandaId],
    enabled: !!(mesaId || comandaId),
    queryFn: async () => {
      if (comandaId) {
        const { data } = await supabase.from('comandas').select('id, mesa:mesas(nome)').eq('id', comandaId).maybeSingle()
        return (data as any)?.mesa?.nome ?? 'Comanda'
      }
      const { data } = await supabase.from('mesas').select('nome').eq('id', mesaId!).maybeSingle()
      return (data as any)?.nome ?? 'Mesa'
    },
  })

  const produtos = useMemo(() => produtosQ.data ?? [], [produtosQ.data])
  const categorias = useMemo(() => categoriasQ.data ?? [], [categoriasQ.data])
  const chips = useMemo(
    () => [{ id: TODOS, nome: 'Todos', emoji: undefined as string | undefined }, ...categorias.map((c) => ({ id: c.id, nome: c.nome, emoji: c.emoji ?? undefined }))],
    [categorias],
  )
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return produtos.filter((p) => {
      if (catSel !== TODOS && p.categoria_id !== catSel) return false
      if (!q) return true
      return p.nome.toLowerCase().includes(q) || (p.descricao ?? '').toLowerCase().includes(q)
    })
  }, [produtos, catSel, busca])

  const cartCount = cart.reduce((a, l) => a + l.quantidade, 0)
  const cartTotal = useMemo(() => totalCart(cart), [cart])

  const lancar = async () => {
    if (cart.length === 0 || submitting) return
    setSubmitting(true)
    setErro('')
    try {
      const id = await lancarPedidoGarcom({
        comandaId,
        mesaId,
        itens: cart.map((l) => ({
          produtoId: l.produto.id,
          quantidade: l.quantidade,
          observacao: l.observacao,
          adicionalIds: l.adicionais.map((a) => a.id),
        })),
      })
      router.replace(`/garcom/comanda/${id}?lancado=1`)
    } catch (e: any) {
      setSubmitting(false)
      setErro(e?.message || 'Erro ao lançar o pedido.')
    }
  }

  return (
    <Screen className="px-4">
      <Header
        title={alvoQ.data ?? (mesaId || comandaId ? '…' : 'Pedido')}
        subtitle={comandaId ? 'Novo pedido · comanda' : 'Novo pedido · mesa'}
        onBack={() => router.back()}
      />

      <TextInput
        value={busca}
        onChangeText={setBusca}
        placeholder="Buscar produto…"
        placeholderTextColor="#B8B5AB"
        className="rounded-xl border border-line bg-surface px-4 text-base text-ink"
        style={{ minHeight: 48 }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 flex-grow-0" contentContainerStyle={{ gap: 8 }}>
        {chips.map((c) => {
          const active = catSel === c.id
          return (
            <Pressable
              key={c.id}
              onPress={() => setCatSel(c.id)}
              className="rounded-xl px-4 py-2"
              style={{ backgroundColor: active ? '#2A2A26' : 'transparent', borderWidth: 1, borderColor: active ? '#2A2A26' : '#DDD9CC' }}
            >
              <Text className="text-sm" style={{ color: active ? '#FAF9F5' : '#6B6A62', fontWeight: active ? '700' : '400' }}>
                {c.emoji ? `${c.emoji} ` : ''}{c.nome}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <View className="flex-1">
        {produtosQ.isLoading || categoriasQ.isLoading ? (
          <View className="py-16 items-center"><Spinner color="#9B4A3C" /></View>
        ) : produtosQ.isError ? (
          <EmptyState icon="⚠️" title="Não foi possível carregar" action={<Pressable onPress={() => produtosQ.refetch()}><Text className="text-sm text-accent underline">Tentar novamente</Text></Pressable>} />
        ) : filtrados.length === 0 ? (
          <EmptyState icon="🔍" title="Nada encontrado" description="Ajuste a busca ou a categoria." />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: cart.length ? 88 : 24 }}>
            {filtrados.map((p, i, arr) => (
              <ProductCard key={p.id} produto={p} isLast={i === arr.length - 1} onOpen={() => setDetalhe(p)} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Barra do carrinho */}
      {cart.length > 0 ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-bg px-4 pb-6 pt-3">
          <Pressable onPress={() => setModal(true)} className="w-full flex-row items-center justify-between rounded-xl bg-accent px-4" style={{ minHeight: 52 }}>
            <Text className="text-xs text-on-accent" style={{ opacity: 0.85 }}>{cartCount} {cartCount === 1 ? 'item' : 'itens'}</Text>
            <Text className="font-sans-bold text-sm text-on-accent">Ver pedido</Text>
            <Text className="font-sans-bold text-sm text-on-accent">{fmt.currency(cartTotal)}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Resumo / lançar */}
      <Modal visible={modal && cart.length > 0} transparent animationType="slide" onRequestClose={() => !submitting && setModal(false)}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => !submitting && setModal(false)}>
          <Pressable onPress={() => {}} className="bg-bg px-5 pb-8 pt-6" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
            <Text className="mb-4 font-serif text-xl text-ink">Pedido</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {cart.map((l, i, arr) => (
                <View key={l.key} className="flex-row items-start gap-3 py-3" style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#DDD9CC' }}>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row justify-between gap-2">
                      <Text className="text-sm text-ink" style={{ flexShrink: 1 }}>
                        {l.produto.nome} <Text className="text-text-mid">× {l.quantidade}</Text>
                      </Text>
                      <Text className="font-sans-bold text-sm text-ink">{fmt.currency(subtotalCartLine(l))}</Text>
                    </View>
                    {l.adicionais.map((a) => (
                      <Text key={a.id} className="mt-0.5 text-xs text-text-mid">+ {a.nome}{a.preco > 0 ? ` (${fmt.currency(a.preco)})` : ''}</Text>
                    ))}
                    {l.observacao ? <Text className="mt-0.5 text-xs italic text-text-mid">↳ {l.observacao}</Text> : null}
                  </View>
                  <Pressable onPress={() => setCart((c) => c.filter((x) => x.key !== l.key))} className="h-8 w-8 items-center justify-center rounded-lg border border-line">
                    <Text className="text-accent">✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <View className="mb-6 mt-3 flex-row items-baseline justify-between border-t border-line pt-3">
              <Text className="text-base text-ink">Total</Text>
              <Text className="font-serif text-xl text-price">{fmt.currency(cartTotal)}</Text>
            </View>
            {erro ? <Text className="mb-3 text-center text-xs text-accent">{erro}</Text> : null}
            <View className="flex-row gap-2">
              <Pressable onPress={() => setModal(false)} disabled={submitting} className="flex-1 items-center justify-center rounded-xl border border-line" style={{ minHeight: 48 }}>
                <Text className="text-sm text-text-mid">Voltar</Text>
              </Pressable>
              <Pressable onPress={lancar} disabled={submitting} className="items-center justify-center rounded-xl" style={{ flex: 2, minHeight: 48, backgroundColor: submitting ? '#DDD9CC' : '#9B4A3C' }}>
                {submitting ? <View className="flex-row items-center gap-2"><Spinner color="#FAF9F5" /><Text className="font-sans-bold text-sm text-on-accent">Lançando</Text></View> : <Text className="font-sans-bold text-sm text-on-accent">Lançar pedido</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {detalhe ? (
        <ProdutoDetalhe produto={detalhe} onClose={() => setDetalhe(null)} onAddToCart={(line) => setCart((c) => [...c, line])} />
      ) : null}
    </Screen>
  )
}
