import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { fmt } from '@/lib/formatters'
import { subtotalItem, precoEfetivo } from '@/lib/calcComanda'
import type { CartLine } from '@/lib/calcComanda'
import { useProdutoOpcoes } from '@/lib/hooks/useCardapio'
import { Spinner } from '@/components/ui/Spinner'
import type { GrupoAdicional, ItemPedido, Produto } from '@/types'

const MAX_OBS = 200

function seloRegra(g: GrupoAdicional): string {
  if (g.obrigatorio) return 'Obrigatório'
  if (g.selecao === 'unica') return 'Escolha 1'
  if (g.max_escolhas != null) return `Até ${g.max_escolhas}`
  if ((g.min_escolhas ?? 0) > 0) return `Mín. ${g.min_escolhas}`
  return 'Opcional'
}
function minExigido(g: GrupoAdicional): number {
  if (g.selecao === 'unica') return g.obrigatorio ? 1 : 0
  const min = g.min_escolhas ?? 0
  return g.obrigatorio ? Math.max(1, min) : min
}

export function ProdutoDetalhe({
  produto,
  bloqueado,
  onClose,
  onAddToCart,
}: {
  produto: Produto
  bloqueado?: boolean
  onClose: () => void
  onAddToCart: (line: CartLine) => void
}) {
  const opcoesQ = useProdutoOpcoes(produto.id)
  const grupos = useMemo(() => opcoesQ.data ?? [], [opcoesQ.data])
  const [sel, setSel] = useState<Record<string, string[]>>({})
  const [quantidade, setQuantidade] = useState(1)
  const [observacao, setObservacao] = useState('')

  const adicionalById = useMemo(() => {
    const m = new Map<string, { nome: string; preco: number }>()
    for (const g of grupos) for (const a of g.adicionais ?? []) m.set(a.id, { nome: a.nome, preco: a.preco })
    return m
  }, [grupos])

  const idsSelecionados = useMemo(() => Object.values(sel).flat(), [sel])

  const toggle = (g: GrupoAdicional, adicionalId: string) => {
    setSel((prev) => {
      const atual = prev[g.id] ?? []
      if (g.selecao === 'unica') {
        const next = atual[0] === adicionalId ? [] : [adicionalId]
        return { ...prev, [g.id]: next }
      }
      if (atual.includes(adicionalId)) return { ...prev, [g.id]: atual.filter((x) => x !== adicionalId) }
      if (g.max_escolhas != null && atual.length >= g.max_escolhas) return prev
      return { ...prev, [g.id]: [...atual, adicionalId] }
    })
  }

  const gruposPendentes = useMemo(
    () => grupos.filter((g) => (sel[g.id]?.length ?? 0) < minExigido(g)).map((g) => g.id),
    [grupos, sel],
  )

  const totalPreview = useMemo(
    () =>
      subtotalItem({
        preco_base_snapshot: precoEfetivo(produto),
        quantidade,
        adicionais: idsSelecionados.map((id) => ({ preco_snapshot: adicionalById.get(id)?.preco ?? 0 })),
      } as unknown as ItemPedido),
    [produto, quantidade, idsSelecionados, adicionalById],
  )

  const podeAdicionar = !bloqueado && !produto.esgotado && quantidade >= 1 && gruposPendentes.length === 0

  const confirmar = () => {
    if (!podeAdicionar) return
    const adicionais = idsSelecionados.map((id) => {
      const a = adicionalById.get(id)
      return { id, nome: a?.nome ?? '', preco: a?.preco ?? 0 }
    })
    onAddToCart({
      key: `${produto.id}-${idsSelecionados.join('.')}-${Date.now()}`,
      produto,
      quantidade,
      observacao: observacao.trim() || null,
      adicionais,
    })
    onClose()
  }

  const btnLabel = produto.esgotado
    ? 'Produto esgotado'
    : bloqueado
      ? 'Pedidos indisponíveis no momento'
      : gruposPendentes.length > 0
        ? 'Selecione as opções obrigatórias'
        : null

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-row items-center gap-3 border-b border-line px-5 py-3">
          <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-xl border border-line">
            <Text className="text-lg text-ink">‹</Text>
          </Pressable>
          <Text className="font-serif text-lg text-ink" numberOfLines={1} style={{ flex: 1 }}>{produto.nome}</Text>
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 16, paddingBottom: 24 }}>
          {produto.foto_url ? (
            <Image source={{ uri: produto.foto_url }} style={{ width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F2F0E8' }} contentFit="cover" />
          ) : null}

          <View className="mt-4 flex-row items-baseline justify-between gap-3">
            <Text className="font-serif text-2xl text-ink" style={{ flexShrink: 1 }}>{produto.nome}</Text>
            <View className="flex-row items-baseline gap-2">
              {produto.em_oferta && produto.oferta_preco != null && produto.oferta_preco < produto.preco ? (
                <Text className="text-xs text-muted line-through">{fmt.currency(produto.preco)}</Text>
              ) : null}
              <Text className="font-sans-bold text-base text-price">{fmt.currency(precoEfetivo(produto))}</Text>
            </View>
          </View>
          {produto.descricao ? <Text className="mt-2 text-sm text-text-mid">{produto.descricao}</Text> : null}

          {opcoesQ.isLoading ? (
            <View className="py-8 items-center"><Spinner /></View>
          ) : null}

          {grupos.map((g) => {
            const selecionadas = sel[g.id] ?? []
            const pendente = gruposPendentes.includes(g.id)
            const atingiuMax = g.selecao === 'multipla' && g.max_escolhas != null && selecionadas.length >= g.max_escolhas
            const borderCor = pendente ? '#9B4A3C' : '#DDD9CC'
            return (
              <View key={g.id} className="mt-6">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="font-sans-bold text-sm text-ink">{g.nome}</Text>
                  <View className="rounded-full px-2 py-0.5" style={{ borderWidth: 1, borderColor: borderCor }}>
                    <Text className="text-[11px]" style={{ color: pendente ? '#9B4A3C' : '#6B6A62' }}>{seloRegra(g)}</Text>
                  </View>
                </View>
                {pendente ? (
                  <Text className="mb-2 text-xs text-accent">
                    {g.selecao === 'unica' ? 'Selecione uma opção' : `Selecione ao menos ${minExigido(g)}`}
                  </Text>
                ) : null}
                <View className="overflow-hidden rounded-xl" style={{ borderWidth: 1, borderColor: borderCor }}>
                  {(g.adicionais ?? []).map((a, i, arr) => {
                    const checked = selecionadas.includes(a.id)
                    const disabled = !checked && atingiuMax
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => !disabled && toggle(g, a.id)}
                        className="flex-row items-center gap-3 px-3"
                        style={{
                          minHeight: 48,
                          borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                          borderBottomColor: '#DDD9CC',
                          backgroundColor: checked ? '#F2F0E8' : 'transparent',
                          opacity: disabled ? 0.45 : 1,
                        }}
                      >
                        <View
                          className="items-center justify-center"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: g.selecao === 'unica' ? 10 : 6,
                            borderWidth: 2,
                            borderColor: checked ? '#9B4A3C' : '#DDD9CC',
                            backgroundColor: checked ? '#9B4A3C' : 'transparent',
                          }}
                        >
                          {checked ? <Text style={{ color: '#FAF9F5', fontSize: 11, fontWeight: '700' }}>✓</Text> : null}
                        </View>
                        <Text className="flex-1 text-sm text-ink">{a.nome}</Text>
                        {a.preco > 0 ? <Text className="text-sm text-price">+ {fmt.currency(a.preco)}</Text> : null}
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            )
          })}

          <View className="mt-6">
            <Text className="mb-1 text-xs text-text-mid">Observação (opcional)</Text>
            <TextInput
              value={observacao}
              onChangeText={(t) => setObservacao(t.slice(0, MAX_OBS))}
              placeholder="Ex.: capricha no ponto, sem gelo"
              placeholderTextColor="#B8B5AB"
              multiline
              maxLength={MAX_OBS}
              className="rounded-xl border border-line bg-bg p-3 text-base text-ink"
              style={{ minHeight: 56, textAlignVertical: 'top' }}
            />
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <Text className="text-sm text-ink">Quantidade</Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setQuantidade((n) => Math.max(1, n - 1))}
                disabled={quantidade <= 1}
                className="h-11 w-11 items-center justify-center rounded-xl border border-line"
              >
                <Text style={{ fontSize: 20, color: quantidade <= 1 ? '#B8B5AB' : '#2A2A26' }}>−</Text>
              </Pressable>
              <Text className="font-sans-bold text-base text-ink" style={{ minWidth: 24, textAlign: 'center' }}>{quantidade}</Text>
              <Pressable
                onPress={() => setQuantidade((n) => Math.min(99, n + 1))}
                className="h-11 w-11 items-center justify-center rounded-xl bg-ink"
              >
                <Text style={{ fontSize: 20, color: '#FAF9F5' }}>+</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View className="border-t border-line bg-bg px-5 pb-6 pt-3">
          <Pressable
            onPress={confirmar}
            disabled={!podeAdicionar}
            className="w-full flex-row items-center justify-between rounded-xl px-4"
            style={{ minHeight: 52, backgroundColor: podeAdicionar ? '#9B4A3C' : '#DDD9CC' }}
          >
            {btnLabel ? (
              <Text className="w-full text-center font-sans-bold text-sm" style={{ color: podeAdicionar ? '#FAF9F5' : '#6B6A62' }}>{btnLabel}</Text>
            ) : (
              <>
                <Text className="font-sans-bold text-sm text-on-accent">Adicionar ao pedido</Text>
                <Text className="font-sans-bold text-sm text-on-accent">{fmt.currency(totalPreview)}</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  )
}
