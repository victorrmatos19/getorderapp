import type { ColorValue } from 'react-native'
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'

// Ícones da bottom-tab do admin em SVG (react-native-svg) — estilo OUTLINE único
// (regra do CLAUDE.md), sem emoji (que renderiza como tofu/"?"). A cor vem do
// tabBarActiveTintColor/InactiveTintColor via prop `color`.
const BG = '#FAF9F5'

export type TabIconName = 'painel' | 'cardapio' | 'mesas' | 'equipe' | 'config'

export function TabBarIcon({ name, color, size = 24 }: { name: TabIconName; color: ColorValue; size?: number }) {
  const common = {
    stroke: color,
    strokeWidth: 1.9,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'painel' ? (
        <>
          <Line x1={3.5} y1={20.5} x2={20.5} y2={20.5} {...common} />
          <Rect x={5} y={12} width={3.4} height={8.5} rx={1} {...common} />
          <Rect x={10.3} y={8} width={3.4} height={12.5} rx={1} {...common} />
          <Rect x={15.6} y={15} width={3.4} height={5.5} rx={1} {...common} />
        </>
      ) : null}

      {name === 'cardapio' ? (
        <>
          <Line x1={7} y1={3.5} x2={7} y2={20.5} {...common} />
          <Path d="M4.7 3.5 V7.2 M7 3.5 V7.2 M9.3 3.5 V7.2" {...common} />
          <Path d="M4.7 7.2 H9.3" {...common} />
          <Path d="M16.4 3.5 C 13.8 5.5 13.8 10 16.4 12 L16.4 20.5" {...common} />
        </>
      ) : null}

      {name === 'mesas' ? (
        <>
          <Rect x={3.8} y={3.8} width={7} height={7} rx={1.6} {...common} />
          <Rect x={13.2} y={3.8} width={7} height={7} rx={1.6} {...common} />
          <Rect x={3.8} y={13.2} width={7} height={7} rx={1.6} {...common} />
          <Rect x={13.2} y={13.2} width={7} height={7} rx={1.6} {...common} />
        </>
      ) : null}

      {name === 'equipe' ? (
        <>
          <Circle cx={8.5} cy={8} r={3} {...common} />
          <Path d="M3.5 20 c0-3.2 2.2-5 5-5 s5 1.8 5 5" {...common} />
          <Circle cx={16.5} cy={8.8} r={2.4} {...common} />
          <Path d="M15.5 15.2 c2.6 0.1 4.8 1.9 4.8 4.8" {...common} />
        </>
      ) : null}

      {name === 'config' ? (
        <>
          <Line x1={4} y1={7} x2={20} y2={7} {...common} />
          <Line x1={4} y1={12} x2={20} y2={12} {...common} />
          <Line x1={4} y1={17} x2={20} y2={17} {...common} />
          <Circle cx={9} cy={7} r={2.1} {...common} fill={BG} />
          <Circle cx={15} cy={12} r={2.1} {...common} fill={BG} />
          <Circle cx={8} cy={17} r={2.1} {...common} fill={BG} />
        </>
      ) : null}
    </Svg>
  )
}
