import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase do app de staff — SEMPRE anon key (nunca service_role no app).
// Mesmo backend da web (RLS/RPCs idênticas). Sessão persiste em AsyncStorage.
// (Hardening futuro: cifrar a sessão com expo-secure-store — fora do escopo da fundação.)
const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  // Falha cedo e clara se o .env não estiver configurado.
  throw new Error('EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY ausentes no .env')
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
