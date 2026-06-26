import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export function Toast({
  visible,
  message,
  onClose,
  duration = 3000,
}: {
  visible: boolean
  message: string
  onClose: () => void
  duration?: number
}) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [visible, duration, onClose])

  if (!visible) return null
  return (
    <SafeAreaView pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <View testID="toast" className="mx-3 mt-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#2A2A26' }}>
        <Text className="text-sm" style={{ color: '#FAF9F5' }}>{message}</Text>
      </View>
    </SafeAreaView>
  )
}
