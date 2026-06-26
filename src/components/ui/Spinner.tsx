import { ActivityIndicator } from 'react-native'

export function Spinner({ color = '#9B4A3C', size = 'small' }: { color?: string; size?: 'small' | 'large' }) {
  return <ActivityIndicator color={color} size={size} />
}
