import { Redirect, Stack } from 'expo-router'
import { useRestaurante } from '@/providers/RestauranteProvider'

// Guard fino de role (auditoria item 2), espelhando o middleware web:
// /garcom/* é admin|garcom — cozinha (ex.: via deep link getorderapp://garcom)
// volta para a própria home. A escrita real já é barrada pela RLS por role.
export default function GarcomLayout() {
  const { role } = useRestaurante()

  if (role && role !== 'admin' && role !== 'garcom') {
    return <Redirect href={role === 'cozinha' ? '/cozinha' : '/login'} />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
