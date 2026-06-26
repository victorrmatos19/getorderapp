import { Pressable, Text, View } from 'react-native'

export function Header({
  title,
  subtitle,
  onSair,
  onBack,
  right,
  dark,
}: {
  title: string
  subtitle?: string | null
  onSair?: () => void
  onBack?: () => void
  right?: React.ReactNode
  dark?: boolean
}) {
  return (
    <View className="flex-row items-start justify-between py-4">
      <View className="min-w-0 flex-1 flex-row items-center pr-3">
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} className="-ml-2 mr-1 h-12 w-12 items-center justify-center rounded-lg">
            <Text className={`text-xl ${dark ? 'text-bg' : 'text-ink'}`}>‹</Text>
          </Pressable>
        ) : null}
        <View className="min-w-0 flex-1">
          {subtitle ? (
            <Text className={`text-xs ${dark ? 'text-muted' : 'text-text-mid'}`}>{subtitle}</Text>
          ) : null}
          <Text className={`font-serif text-2xl ${dark ? 'text-bg' : 'text-ink'}`}>{title}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        {right}
        {onSair ? (
          <Pressable onPress={onSair} className="min-h-[44px] items-center justify-center rounded-lg border border-line px-3">
            <Text className={`text-xs ${dark ? 'text-muted' : 'text-text-mid'}`}>Sair</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
