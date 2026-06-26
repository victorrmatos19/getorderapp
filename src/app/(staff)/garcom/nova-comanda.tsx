import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Header } from '@/components/ui/Header'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

type MesaLivre = { id: string; nome: string; tipo: string | null }

function useMesasLivres(restauranteId: string | null | undefined) {
  return useQuery({
    queryKey: ['mesas-livres', restauranteId],
    enabled: !!restauranteId,
    queryFn: async (): Promise<MesaLivre[]> => {
      const [mesasRes, abertasRes] = await Promise.all([
        supabase.from('mesas').select('id, nome, tipo').eq('restaurante_id', restauranteId!).eq('ativo', true).order('nome'),
        supabase.from('comandas').select('mesa_id').eq('restaurante_id', restauranteId!).eq('status', 'aberta'),
      ])
      if (mesasRes.error) throw mesasRes.error
      if (abertasRes.error) throw abertasRes.error
      const ocupadas = new Set((abertasRes.data ?? []).map((c: any) => c.mesa_id))
      return ((mesasRes.data ?? []) as MesaLivre[]).filter((m) => !ocupadas.has(m.id))
    },
  })
}

export default function NovaComanda() {
  const { restauranteId } = useRestaurante()
  const { data: mesas = [], isLoading, isError, refetch } = useMesasLivres(restauranteId)
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return q ? mesas.filter((m) => m.nome.toLowerCase().includes(q)) : mesas
  }, [mesas, busca])

  return (
    <Screen className="px-4">
      <Header title="Nova comanda" subtitle="Escolha a mesa" onBack={() => router.back()} />

      <View className="pb-3">
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar mesa…"
          placeholderTextColor="#B8B5AB"
          className="rounded-xl border border-line bg-surface px-4 text-base text-ink"
          style={{ minHeight: 48 }}
        />
      </View>

      {isLoading ? (
        <View className="py-16 items-center">
          <Spinner color="#9B4A3C" />
        </View>
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Erro ao carregar"
          action={
            <Pressable onPress={() => refetch()}>
              <Text className="text-sm text-accent underline">Tentar novamente</Text>
            </Pressable>
          }
        />
      ) : mesas.length === 0 ? (
        <EmptyState icon="🍽️" title="Nenhuma mesa livre" description="Todas as mesas estão com comanda aberta." />
      ) : filtradas.length === 0 ? (
        <EmptyState icon="🔍" title="Nada encontrado" description={`Nenhuma mesa para “${busca}”.`} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {filtradas.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/garcom/pedido?mesa=${m.id}`)}
                className="rounded-xl border border-line bg-surface px-4 py-5"
                style={{ width: '47.5%', minHeight: 72 }}
              >
                <Text className="font-serif text-lg text-ink">{m.nome}</Text>
                <Text className="mt-1 text-xs text-text-mid">
                  {m.tipo === 'quadra' ? 'Quadra' : 'Mesa'} · livre
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  )
}
