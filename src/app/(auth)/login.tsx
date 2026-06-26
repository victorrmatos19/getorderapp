import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native'
import { Redirect } from 'expo-router'
import { supabase } from '@/lib/supabase/client'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/Logo'

export default function Login() {
  const { userId, role, signOut } = useRestaurante()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Já logado como staff → home do role.
  if (userId && (role === 'admin' || role === 'garcom' || role === 'cozinha')) {
    return <Redirect href={`/${role}`} />
  }

  const submit = async () => {
    if (!email || !password) {
      setErr('Preencha email e senha.')
      return
    }
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      setErr(/banned/i.test(error.message) ? 'Conta desativada. Procure o administrador.' : 'Credenciais inválidas.')
    }
    // Sucesso: RestauranteProvider resolve o role → o Redirect acima dispara.
  }

  const inputCls = 'border-b border-line py-3 text-base text-ink'

  return (
    <Screen className="px-6">
      <KeyboardAvoidingView className="flex-1 justify-center" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="mb-10 items-center">
        <Logo size="xl" />
        <Text className="mt-4 font-serif text-2xl text-ink">Entrar</Text>
        <Text className="mt-1 text-sm text-text-mid">Acesso restrito à equipe.</Text>
      </View>

      {userId && role === 'super_admin' ? (
        <View className="gap-4">
          <Text className="text-center text-sm text-text-mid">
            O painel super-admin é exclusivo da web. Saia e use o navegador.
          </Text>
          <Button label="Sair" variant="outline" onPress={() => signOut()} />
        </View>
      ) : (
        <View className="gap-6">
          <View>
            <Text className="mb-1 text-xs text-text-mid">Email</Text>
            <TextInput
              testID="login-email"
              value={email}
              onChangeText={(t) => {
                setEmail(t)
                setErr('')
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="voce@suaempresa.com.br"
              placeholderTextColor="#B8B5AB"
              className={inputCls}
            />
          </View>
          <View>
            <Text className="mb-1 text-xs text-text-mid">Senha</Text>
            <TextInput
              testID="login-senha"
              value={password}
              onChangeText={(t) => {
                setPassword(t)
                setErr('')
              }}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#B8B5AB"
              className={inputCls}
            />
          </View>

          {err ? <Text className="text-sm text-accent">{err}</Text> : null}

          <Button label="Entrar" onPress={submit} loading={busy} testID="login-entrar" />
        </View>
      )}
      </KeyboardAvoidingView>
    </Screen>
  )
}
