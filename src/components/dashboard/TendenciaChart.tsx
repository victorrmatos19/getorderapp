import { useState } from 'react'
import { LayoutChangeEvent, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

type Ponto = { label: string; valor: number }

const ALTURA = 200
const PAD_BOTTOM = 22 // espaço p/ rótulos do eixo X
const MAX_LABELS = 6

// Área chart simples (linha poligonal + preenchimento até a base). Sem recharts:
// no RN desenhamos com react-native-svg. `corPrimaria` é hex literal (deriveTheme).
export default function TendenciaChart({
  data,
  corPrimaria,
}: {
  data: Ponto[]
  corPrimaria: string
}) {
  const [largura, setLargura] = useState(0)

  const onLayout = (e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width)

  const alturaPlot = ALTURA - PAD_BOTTOM
  const n = data.length
  const maxValor = data.reduce((m, p) => Math.max(m, p.valor), 0)

  // Coordenadas dos pontos no espaço de plotagem.
  const px = (i: number) => (n <= 1 ? largura / 2 : (i / (n - 1)) * largura)
  const py = (v: number) => (maxValor <= 0 ? alturaPlot : alturaPlot - (v / maxValor) * (alturaPlot - 6) - 3)

  // labels do eixo X: poucos (preserveStartEnd ~6)
  const passo = n <= MAX_LABELS ? 1 : Math.ceil(n / MAX_LABELS)
  const labels = data
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i === 0 || i === n - 1 || i % passo === 0)

  let linePath = ''
  let areaPath = ''
  if (n >= 1 && largura > 0) {
    const pts = data.map((p, i) => ({ x: px(i), y: py(p.valor) }))
    linePath = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
    areaPath =
      `M ${pts[0].x.toFixed(1)} ${alturaPlot} ` +
      pts.map((pt) => `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ') +
      ` L ${pts[pts.length - 1].x.toFixed(1)} ${alturaPlot} Z`
  }

  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      <View style={{ height: alturaPlot }}>
        {largura > 0 && n >= 1 ? (
          <Svg width={largura} height={alturaPlot}>
            {areaPath ? <Path d={areaPath} fill={corPrimaria} fillOpacity={0.18} /> : null}
            {linePath ? (
              <Path d={linePath} stroke={corPrimaria} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
          </Svg>
        ) : null}
      </View>
      <View className="mt-1 flex-row justify-between">
        {labels.map(({ p, i }) => (
          <Text key={`${p.label}-${i}`} className="text-text-mid" style={{ fontSize: 11 }}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  )
}
