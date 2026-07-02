import { Redirect, Tabs } from 'expo-router'
import { TabBarIcon } from '@/components/TabBarIcon'
import { useRestaurante } from '@/providers/RestauranteProvider'

// Bottom nav do admin (espelha o AdminNav da web): Painel · Cardápio · Mesas · Equipe · Configs.
// Ícones em SVG (TabBarIcon) — nada de emoji.
export default function AdminTabsLayout() {
  const { role } = useRestaurante()

  // Guard fino de role (auditoria item 2): /admin é SÓ admin — garçom/cozinha via deep link
  // (getorderapp://admin) voltam para a própria home. Escrita já é barrada pela RLS por role.
  if (role && role !== 'admin') {
    return <Redirect href={role === 'garcom' ? '/garcom' : role === 'cozinha' ? '/cozinha' : '/login'} />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2A2A26',
        tabBarInactiveTintColor: '#B8B5AB',
        tabBarStyle: { backgroundColor: '#FAF9F5', borderTopColor: '#DDD9CC' },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Painel', tabBarButtonTestID: 'tab-painel', tabBarIcon: ({ color }) => <TabBarIcon name="painel" color={color} /> }} />
      <Tabs.Screen name="cardapio" options={{ title: 'Cardápio', tabBarButtonTestID: 'tab-cardapio', tabBarIcon: ({ color }) => <TabBarIcon name="cardapio" color={color} /> }} />
      <Tabs.Screen name="mesas" options={{ title: 'Mesas', tabBarButtonTestID: 'tab-mesas', tabBarIcon: ({ color }) => <TabBarIcon name="mesas" color={color} /> }} />
      <Tabs.Screen name="equipe" options={{ title: 'Equipe', tabBarButtonTestID: 'tab-equipe', tabBarIcon: ({ color }) => <TabBarIcon name="equipe" color={color} /> }} />
      <Tabs.Screen name="config" options={{ title: 'Configs', tabBarButtonTestID: 'tab-config', tabBarIcon: ({ color }) => <TabBarIcon name="config" color={color} /> }} />
    </Tabs>
  )
}
