import { Text, View } from 'react-native'
import { fmt } from '@/lib/formatters'
import type { Metrica, Resumo } from '@/lib/hooks/useDashboard'

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <Text className="text-xs text-muted">—</Text>
  }
  const up = delta >= 0
  const cor = up ? '#567D4F' : undefined // ready (verde) ↑; accent (terracota) ↓
  const pct = `${up ? '+' : ''}${Math.round(delta * 100)}%`
  return (
    <Text className={`text-xs font-sans-bold ${up ? '' : 'text-accent'}`} style={up ? { color: cor } : undefined}>
      {up ? '▲' : '▼'} {pct}
    </Text>
  )
}

function Card({ label, valor, m, semVendas }: { label: string; valor: string; m: Metrica; semVendas: boolean }) {
  return (
    <View className="flex-1 rounded-xl border border-line bg-surface p-4">
      <Text className="mb-2 text-xs text-text-mid">{label}</Text>
      <Text className="font-serif text-lg leading-tight text-ink" numberOfLines={1}>
        {valor}
      </Text>
      <View className="mt-1 flex-row items-center gap-1">
        {semVendas ? (
          <Text className="text-xs text-muted">—</Text>
        ) : (
          <>
            <DeltaBadge delta={m.delta} />
            <Text className="text-xs text-muted">vs anterior</Text>
          </>
        )}
      </View>
    </View>
  )
}

export default function ResumoCards({ resumo }: { resumo: Resumo }) {
  // Sem comandas fechadas no período → todas as métricas são 0 e cairiam num "−100%"
  // alarmante. Mostra um rótulo neutro no lugar (vale tb p/ semana fraca real em produção).
  const semVendas = resumo.comandas.atual === 0
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Card label="Faturamento" valor={fmt.currency(resumo.faturamento.atual)} m={resumo.faturamento} semVendas={semVendas} />
        <Card label="Ticket médio" valor={fmt.currency(resumo.ticketMedio.atual)} m={resumo.ticketMedio} semVendas={semVendas} />
      </View>
      <View className="flex-row gap-2">
        <Card label="Comandas" valor={String(resumo.comandas.atual)} m={resumo.comandas} semVendas={semVendas} />
        <Card label="Pessoas" valor={String(resumo.pessoas.atual)} m={resumo.pessoas} semVendas={semVendas} />
      </View>
      {semVendas ? (
        <Text className="text-xs text-muted">Sem vendas no período</Text>
      ) : null}
    </View>
  )
}
