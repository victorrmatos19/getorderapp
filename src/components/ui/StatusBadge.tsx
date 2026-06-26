import { Text, View } from 'react-native'
import type { ItemStatus } from '@/types'

const MAP: Record<ItemStatus, { label: string; color: string }> = {
  novo: { label: 'Novo', color: '#C8871E' },
  em_preparo: { label: 'Preparando', color: '#4A6B82' },
  pronto: { label: 'Pronto', color: '#567D4F' },
  entregue: { label: 'Entregue', color: '#6B6A62' },
  cancelado: { label: 'Cancelado', color: '#B8B5AB' },
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  const s = MAP[status]
  return (
    <View className="self-start rounded-full px-2 py-0.5" style={{ borderWidth: 1, borderColor: s.color }}>
      <Text className="font-sans-medium text-xs" style={{ color: s.color }}>
        {s.label}
      </Text>
    </View>
  )
}
