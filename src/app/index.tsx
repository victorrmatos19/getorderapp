import { Redirect } from 'expo-router'
import { View } from 'react-native'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Spinner } from '@/components/ui/Spinner'

// Entrada: roteia por sessão/role (espelha DEFAULT_BY_ROLE da web; super_admin não entra).
export default function Index() {
  const { loading, userId, role } = useRestaurante()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Spinner />
      </View>
    )
  }
  if (!userId) return <Redirect href="/login" />
  if (role === 'cozinha') return <Redirect href="/cozinha" />
  if (role === 'garcom') return <Redirect href="/garcom" />
  if (role === 'admin') return <Redirect href="/admin" />
  return <Redirect href="/login" />
}
