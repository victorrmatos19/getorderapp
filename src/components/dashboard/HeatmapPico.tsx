import { ScrollView, Text, View } from 'react-native'
import { EmptyState } from '@/components/ui/EmptyState'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const SURFACE = '#F2F0E8' // --surface (neutro constante)
const CELL = 16
const LABEL_W = 34

// Mistura linear entre hexA e hexB (t=0 → hexA, t=1 → hexB). RN não tem color-mix CSS.
function mix(hexA: string, hexB: string, t: number): string {
  const a = parse(hexA)
  const b = parse(hexB)
  const k = Math.max(0, Math.min(1, t))
  const r = Math.round(a.r + (b.r - a.r) * k)
  const g = Math.round(a.g + (b.g - a.g) * k)
  const bl = Math.round(a.b + (b.b - a.b) * k)
  return `#${to(r)}${to(g)}${to(bl)}`
}
function parse(hex: string) {
  const h = hex.replace('#', '')
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}
function to(n: number) {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
}

// intensidade 0..1 → interpola surface → primary. `corPrimaria` é hex literal (deriveTheme).
function cor(n: number, max: number, corPrimaria: string): string {
  if (n === 0 || max === 0) return SURFACE
  const t = 0.15 + 0.85 * (n / max)
  return mix(SURFACE, corPrimaria, t)
}

export default function HeatmapPico({
  matriz,
  max,
  corPrimaria,
}: {
  matriz: number[][]
  max: number
  corPrimaria: string
}) {
  if (max === 0) {
    return <EmptyState icon="🗓️" title="Sem pedidos no período" />
  }
  const horas = Array.from({ length: 24 }, (_, h) => h)
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View className="flex-row">
          <View style={{ width: LABEL_W }} />
          {horas.map((h) => (
            <View key={h} style={{ width: CELL + 2, alignItems: 'center' }}>
              <Text className="text-text-mid" style={{ fontSize: 9 }}>{h % 3 === 0 ? `${h}h` : ''}</Text>
            </View>
          ))}
        </View>
        {matriz.map((linha, wd) => (
          <View key={wd} className="flex-row items-center" style={{ marginTop: 2 }}>
            <Text className="text-text-mid" style={{ width: LABEL_W, fontSize: 10 }}>{DIAS[wd]}</Text>
            {linha.map((n, h) => (
              <View
                key={h}
                style={{ width: CELL, height: CELL, margin: 1, borderRadius: 3, backgroundColor: cor(n, max, corPrimaria) }}
              />
            ))}
          </View>
        ))}
        <View className="mt-3 flex-row items-center gap-2">
          <Text className="text-text-mid" style={{ fontSize: 10 }}>menos</Text>
          <View className="flex-row gap-1">
            {[0.15, 0.4, 0.65, 1].map((t) => (
              <View key={t} style={{ width: 14, height: 10, borderRadius: 2, backgroundColor: mix(SURFACE, corPrimaria, t) }} />
            ))}
          </View>
          <Text className="text-text-mid" style={{ fontSize: 10 }}>mais</Text>
        </View>
      </View>
    </ScrollView>
  )
}
