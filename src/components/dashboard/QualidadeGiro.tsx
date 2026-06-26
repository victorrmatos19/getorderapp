import { Text, View } from 'react-native'
import type { Qualidade } from '@/lib/hooks/useDashboard'

function fmtMin(min: number | null): string {
  if (min === null) return '—'
  if (min < 60) return `${min}min`
  return `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, '0')}min`
}

export default function QualidadeGiro({ q }: { q: Qualidade }) {
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Box label="Tempo médio de mesa" valor={fmtMin(q.tempoMedioMesaMin)} />
        <Box label="Itens cancelados" valor={String(q.itensCancelados)} />
      </View>
      <View className="flex-row gap-2">
        <Box
          label="Comandas canceladas"
          valor={String(q.comandasCanceladas)}
          sub={`${q.porMotivo.expiracao_automatica} auto · ${q.porMotivo.cancelada_garcom} garçom`}
        />
        <Box
          label="Auto vs garçom"
          valor={`${q.porMotivo.expiracao_automatica} / ${q.porMotivo.cancelada_garcom}`}
          sub="expiração / manual"
        />
      </View>
    </View>
  )
}

function Box({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <View className="flex-1 rounded-lg border border-line bg-bg p-3">
      <Text className="mb-1 text-xs text-text-mid">{label}</Text>
      <Text className="text-base font-sans-bold text-ink">{valor}</Text>
      {sub ? <Text className="mt-0.5 text-xs text-muted">{sub}</Text> : null}
    </View>
  )
}
