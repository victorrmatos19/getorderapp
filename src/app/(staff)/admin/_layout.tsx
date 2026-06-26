import { Tabs } from 'expo-router'
import { TabBarIcon } from '@/components/TabBarIcon'

// Bottom nav do admin (espelha o AdminNav da web): Painel · Cardápio · Mesas · Equipe · Configs.
// Ícones em SVG (TabBarIcon) — nada de emoji.
export default function AdminTabsLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Painel', tabBarIcon: ({ color }) => <TabBarIcon name="painel" color={color} /> }} />
      <Tabs.Screen name="cardapio" options={{ title: 'Cardápio', tabBarIcon: ({ color }) => <TabBarIcon name="cardapio" color={color} /> }} />
      <Tabs.Screen name="mesas" options={{ title: 'Mesas', tabBarIcon: ({ color }) => <TabBarIcon name="mesas" color={color} /> }} />
      <Tabs.Screen name="equipe" options={{ title: 'Equipe', tabBarIcon: ({ color }) => <TabBarIcon name="equipe" color={color} /> }} />
      <Tabs.Screen name="config" options={{ title: 'Configs', tabBarIcon: ({ color }) => <TabBarIcon name="config" color={color} /> }} />
    </Tabs>
  )
}
