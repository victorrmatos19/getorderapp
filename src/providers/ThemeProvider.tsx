import { View } from 'react-native'
import { vars } from 'nativewind'
import { deriveTheme } from '@/lib/theme'
import { useRestaurante } from '@/providers/RestauranteProvider'

// Porta do ThemeScope da web: injeta as CSS vars do white-label (derivadas em
// lib/theme.ts, fonte única) num container raiz. Descendentes usam `bg-primary`,
// `text-price` etc. `dark` deriva o tema escuro da cozinha.
export function ThemeProvider({
  children,
  dark,
}: {
  children: React.ReactNode
  dark?: boolean
}) {
  const { restaurante } = useRestaurante()
  const tokens = deriveTheme(
    restaurante?.cor_primaria,
    restaurante?.cor_accent,
    restaurante?.cor_preco,
    { dark },
  )
  return (
    <View style={vars(tokens)} className="flex-1">
      {children}
    </View>
  )
}
