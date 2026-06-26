import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// Casca de tela: safe-area + fundo da identidade. `dark` = fundo da cozinha.
export function Screen({
  children,
  className,
  dark,
}: {
  children: React.ReactNode
  className?: string
  dark?: boolean
}) {
  return (
    <SafeAreaView className={`flex-1 ${dark ? 'bg-primary-dk' : 'bg-bg'}`}>
      <View className={`flex-1 ${className ?? ''}`}>{children}</View>
    </SafeAreaView>
  )
}
