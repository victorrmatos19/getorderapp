import '../global.css'

import { useEffect } from 'react'
import { AppState, View } from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond'
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_700Bold,
} from '@expo-google-fonts/work-sans'

import { supabase } from '@/lib/supabase/client'
import { QueryProvider } from '@/providers/QueryProvider'
import { RestauranteProvider } from '@/providers/RestauranteProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { Spinner } from '@/components/ui/Spinner'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_700Bold,
  })

  // Supabase RN: só auto-refresh do token enquanto o app está em foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') supabase.auth.startAutoRefresh()
      else supabase.auth.stopAutoRefresh()
    })
    supabase.auth.startAutoRefresh()
    return () => sub.remove()
  }, [])

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF9F5' }}>
        <Spinner />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <RestauranteProvider>
          <ThemeProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FAF9F5' } }} />
          </ThemeProvider>
        </RestauranteProvider>
      </QueryProvider>
    </SafeAreaProvider>
  )
}
