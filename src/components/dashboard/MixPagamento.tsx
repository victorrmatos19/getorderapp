import { Text, View } from 'react-native'
import { fmt } from '@/lib/formatters'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Mix } from '@/lib/hooks/useDashboard'

export default function MixPagamento({ mix }: { mix: Mix }) {
  const totalValor = mix.pagamentos.reduce((s, p) => s + p.valor, 0)
  if (mix.pagamentos.length === 0) {
    return <EmptyState icon="💳" title="Sem comandas no período" />
  }
  return (
    <View className="gap-4">
      <View className="gap-2">
        {mix.pagamentos.map((p) => {
          const pct = totalValor ? Math.round((p.valor / totalValor) * 100) : 0
          return (
            <View key={p.forma}>
              <View className="mb-1 flex-row items-end justify-between">
                <Text className="text-sm text-ink">{p.forma}</Text>
                <Text className="text-xs text-text-mid">
                  {p.qtd} comandas · {fmt.currency(p.valor)} ({pct}%)
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-line">
                <View className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </View>
            </View>
          )
        })}
      </View>
      <View className="flex-row gap-2">
        <Mini label="Taxa captada" valor={fmt.currency(mix.taxaCaptada)} />
        <Mini label="Comandas c/ taxa" valor={`${Math.round(mix.pctComTaxa * 100)}%`} />
        <Mini label="Pessoas/comanda" valor={mix.pessoasPorComanda.toFixed(1)} />
      </View>
    </View>
  )
}

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <View className="flex-1 rounded-lg border border-line bg-bg p-3">
      <Text className="mb-1 text-xs text-text-mid">{label}</Text>
      <Text className="text-sm font-sans-bold text-ink">{valor}</Text>
    </View>
  )
}
