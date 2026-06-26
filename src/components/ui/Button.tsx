import { Pressable, Text, View } from 'react-native'
import { Spinner } from './Spinner'

type Variant = 'accent' | 'ink' | 'outline'

// Variantes espelhando a web: accent (CTA), ink (ação neutra forte), outline (secundária).
export function Button({
  label,
  onPress,
  variant = 'accent',
  loading,
  disabled,
  testID,
}: {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  testID?: string
}) {
  const off = disabled || loading
  const box =
    variant === 'outline'
      ? 'border border-line bg-transparent'
      : off
        ? 'bg-line'
        : variant === 'ink'
          ? 'bg-ink'
          : 'bg-accent'
  const txt =
    variant === 'outline'
      ? 'text-text-mid'
      : off
        ? 'text-muted'
        : variant === 'ink'
          ? 'text-bg'
          : 'text-on-accent'

  return (
    <Pressable
      testID={testID}
      onPress={off ? undefined : onPress}
      className={`min-h-[48px] flex-row items-center justify-center gap-2 rounded-lg px-5 ${box}`}
      style={{ opacity: off ? 0.9 : 1 }}
    >
      {loading ? (
        <View className="flex-row items-center gap-2">
          <Spinner color="#FAF9F5" />
          <Text className={`font-sans-bold text-base ${txt}`}>Aguarde</Text>
        </View>
      ) : (
        <Text className={`font-sans-bold text-base ${txt}`}>{label}</Text>
      )}
    </Pressable>
  )
}
