import { Text, View } from 'react-native'
import Svg, { Line, Path } from 'react-native-svg'

// Símbolo + wordmark do GetOrder (porte do Logo da web). É a MARCA GetOrder
// (não o tenant), então usa as cores fixas da marca — o "ícone igual o app".
// Símbolo: uma "comanda" (bloco de pedidos) com duas linhas + a linha de destaque.
const PRIMARY = '#4A5240'
const ACCENT = '#9B4A3C'
const INK = '#2A2A26'
const LIGHT = '#FAF9F5'

type Size = 'sm' | 'md' | 'lg' | 'xl'

export function Logo({
  size = 'md',
  variant = 'dark',
  showWordmark = true,
}: {
  size?: Size
  variant?: 'dark' | 'light'
  showWordmark?: boolean
}) {
  const fontPx = size === 'sm' ? 14 : size === 'lg' ? 22 : size === 'xl' ? 30 : 16
  const sym = Math.round(fontPx * 1.5)
  const isLight = variant === 'light'
  const main = isLight ? LIGHT : PRIMARY
  const accent = isLight ? '#C56B56' : ACCENT
  const textColor = isLight ? LIGHT : INK

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Svg width={sym} height={sym} viewBox="0 0 48 48" fill="none">
        <Path
          d="M14 11 a3 3 0 0 1 3 -3 H31 a3 3 0 0 1 3 3 V38 l-3.3 -2.4 l-3.3 2.4 l-3.4 -2.4 l-3.3 2.4 l-3.3 -2.4 L14 38 Z"
          stroke={main}
          strokeWidth={3.4}
          strokeLinejoin="round"
          fill="none"
        />
        <Line x1={19} y1={16} x2={29} y2={16} stroke={main} strokeWidth={2.6} strokeLinecap="round" />
        <Line x1={19} y1={21.5} x2={26} y2={21.5} stroke={main} strokeWidth={2.6} strokeLinecap="round" />
        <Line x1={19} y1={28} x2={29} y2={28} stroke={accent} strokeWidth={3.2} strokeLinecap="round" />
      </Svg>
      {showWordmark ? (
        <Text style={{ color: textColor, fontSize: fontPx, fontFamily: 'WorkSans_700Bold', letterSpacing: -0.4 }}>
          GetOrder
        </Text>
      ) : null}
    </View>
  )
}
