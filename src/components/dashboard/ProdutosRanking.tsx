import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { fmt } from '@/lib/formatters'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ProdutoLinha } from '@/lib/hooks/useDashboard'

type Ordem = 'receita' | 'volume'

export default function ProdutosRanking({
  produtos,
  adicionais,
}: {
  produtos: ProdutoLinha[]
  adicionais: { nome: string; qtd: number }[]
}) {
  const [ordem, setOrdem] = useState<Ordem>('receita')

  const ordenados = useMemo(() => {
    const arr = [...produtos]
    arr.sort((a, b) => (ordem === 'receita' ? b.receita - a.receita : b.qtd - a.qtd))
    return arr
  }, [produtos, ordem])

  const top = ordenados.slice(0, 8)
  const cauda = ordenados.length > 8 ? ordenados.slice(-3).reverse() : []
  const maxValor = top.length ? (ordem === 'receita' ? top[0].receita : top[0].qtd) : 0

  if (produtos.length === 0) {
    return <EmptyState icon="🍽️" title="Sem vendas no período" description="Ajuste o período." />
  }

  return (
    <View className="gap-4">
      <View className="flex-row justify-end">
        <View className="flex-row gap-1 rounded-lg border border-line bg-bg p-0.5">
          {(['receita', 'volume'] as Ordem[]).map((o) => {
            const active = ordem === o
            return (
              <Pressable
                key={o}
                onPress={() => setOrdem(o)}
                className="rounded-md px-2.5 py-1"
                style={{ backgroundColor: active ? '#2A2A26' : 'transparent' }}
              >
                <Text className="text-xs" style={{ color: active ? '#FAF9F5' : '#6B6A62', fontWeight: active ? '700' : '400' }}>
                  {o === 'receita' ? 'Receita' : 'Volume'}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View className="gap-2">
        {top.map((p) => {
          const valor = ordem === 'receita' ? p.receita : p.qtd
          const pct = maxValor ? Math.max(4, Math.round((valor / maxValor) * 100)) : 0
          return (
            <View key={p.nome}>
              <View className="mb-1 flex-row items-end justify-between">
                <Text className="flex-1 text-sm text-ink" numberOfLines={1}>{p.nome}</Text>
                <Text className="ml-2 text-xs text-text-mid">
                  {p.qtd} un · {fmt.currency(p.receita)}
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-line">
                <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </View>
            </View>
          )
        })}
      </View>

      {cauda.length > 0 ? (
        <View className="rounded-xl border border-line bg-surface p-3">
          <Text className="mb-2 text-xs font-sans-bold uppercase text-text-mid">
            Menos vendidos (possível encalhe)
          </Text>
          {cauda.map((p) => (
            <View key={p.nome} className="flex-row justify-between py-0.5">
              <Text className="flex-1 text-xs text-text-mid" numberOfLines={1}>{p.nome}</Text>
              <Text className="ml-2 text-xs text-text-mid">{p.qtd} un · {fmt.currency(p.receita)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {adicionais.length > 0 ? (
        <View>
          <Text className="mb-2 text-xs font-sans-bold uppercase text-text-mid">
            Adicionais mais pedidos
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {adicionais.slice(0, 8).map((a) => (
              <View key={a.nome} className="rounded-full border border-line bg-surface px-2 py-1">
                <Text className="text-xs text-ink">
                  {a.nome} <Text className="text-text-mid">×{a.qtd}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}
