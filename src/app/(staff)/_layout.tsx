import { Redirect, Stack } from 'expo-router'
import { Text, View } from 'react-native'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

// Guarda das rotas de staff (espelha o middleware web): exige sessão, conta ativa
// e role de staff. Roles finos por tela (admin vê garçom/cozinha) entram com as
// telas reais (Fases 2–4); na fundação cada role tem sua home.
export default function StaffLayout() {
  const { loading, userId, role, ativo, signOut } = useRestaurante()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Spinner />
      </View>
    )
  }
  if (!userId) return <Redirect href="/login" />

  if (ativo === false) {
    return (
      <Screen className="px-6 items-center justify-center gap-4">
        <Text className="font-serif text-xl text-ink">Conta desativada</Text>
        <Text className="text-center text-sm text-text-mid">
          Sua conta foi desativada. Procure o administrador do restaurante.
        </Text>
        <Button label="Sair" variant="outline" onPress={() => signOut()} />
      </Screen>
    )
  }

  if (!(role === 'admin' || role === 'garcom' || role === 'cozinha')) {
    return <Redirect href="/login" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
