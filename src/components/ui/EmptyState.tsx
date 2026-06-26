import { Text, View } from 'react-native'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <View className="items-center gap-1 px-6 py-12">
      {icon ? <Text style={{ fontSize: 30 }}>{icon}</Text> : null}
      <Text className="mt-1 font-serif text-xl text-ink">{title}</Text>
      {description ? <Text className="text-center text-sm text-text-mid">{description}</Text> : null}
      {action ? <View className="mt-2">{action}</View> : null}
    </View>
  )
}
