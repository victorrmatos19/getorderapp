import { useEffect, useId, useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Header } from '@/components/ui/Header'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { fmt } from '@/lib/formatters'
import { totalComanda } from '@/lib/calcComanda'
import type { Comanda, ItemPedido, Mesa } from '@/types'

type Row = Comanda & { mesa: Mesa; itens: (ItemPedido & { produto?: { preco: number } })[] }

function useGarcomData() {
  return useQuery({
    queryKey: ['garcom-mesas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comandas')
        .select(
          'id, mesa_id, cliente_nome, criado_em, mesa:mesas(id, nome), itens:itens_pedido(id, status, quantidade, preco_base_snapshot, produto:produtos(preco), adicionais:itens_pedido_adicionais(preco_snapshot))',
        )
        .eq('status', 'aberta')
        .order('criado_em')
      if (error) throw error
      return (data ?? []) as unknown as Row[]
    },
  })
}

export default function GarcomList() {
  const qc = useQueryClient()
  const { signOut } = useRestaurante()
  const { data: rows = [], isLoading, isError, refetch } = useGarcomData()
  const cid = useId()

  useEffect(() => {
    const ch = supabase
      .channel(`garcom-list-${cid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, () =>
        qc.invalidateQueries({ queryKey: ['garcom-mesas'] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_pedido' }, () =>
        qc.invalidateQueries({ queryKey: ['garcom-mesas'] }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [qc, cid])

  const byMesa = useMemo(() => {
    const m = new Map<string, { mesa: Mesa; comandas: Row[] }>()
    for (const c of rows) {
      const key = c.mesa.id
      const g = m.get(key) ?? { mesa: c.mesa, comandas: [] }
      g.comandas.push(c)
      m.set(key, g)
    }
    return Array.from(m.values()).sort((a, b) => a.mesa.nome.localeCompare(b.mesa.nome))
  }, [rows])

  const novaBtn = (
    <Pressable
      onPress={() => router.push('/garcom/nova-comanda')}
      className="rounded-lg bg-accent px-3"
      style={{ minHeight: 40, justifyContent: 'center' }}
    >
      <Text className="font-sans-bold text-xs text-on-accent">+ Nova comanda</Text>
    </Pressable>
  )

  return (
    <Screen className="px-4">
      <Header title="Salão" subtitle="Garçom" right={novaBtn} onSair={() => signOut()} />

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
      ) : byMesa.length === 0 ? (
        <EmptyState icon="🍽️" title="Nenhuma mesa ocupada" description="Aguardando clientes." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="gap-3">
            {byMesa.map(({ mesa, comandas }) => {
              const prontos = comandas.flatMap((c) => c.itens).filter((i) => i.status === 'pronto').length
              const verde = prontos > 0
              const txt = verde ? '#FAF9F5' : '#2A2A26'
              const sub = verde ? 'rgba(250,249,245,0.78)' : '#6B6A62'
              const linha = verde ? 'rgba(255,255,255,0.18)' : '#DDD9CC'
              return (
                <View
                  key={mesa.id}
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: verde ? '#567D4F' : '#F2F0E8', borderWidth: 1, borderColor: verde ? '#567D4F' : '#DDD9CC' }}
                >
                  <View className="flex-row items-center justify-between px-4 py-3" style={{ borderBottomWidth: 1, borderBottomColor: linha }}>
                    <Text className="font-serif text-lg" style={{ color: txt }}>{mesa.nome}</Text>
                    <View className="flex-row items-center gap-2">
                      {verde ? (
                        <View className="rounded-full px-2 py-0.5" style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
                          <Text className="font-sans-bold text-xs" style={{ color: '#FAF9F5' }}>{prontos} prontos</Text>
                        </View>
                      ) : null}
                      <Text className="text-xs" style={{ color: sub }}>
                        {comandas.length} {comandas.length === 1 ? 'comanda' : 'comandas'}
                      </Text>
                    </View>
                  </View>

                  {comandas.map((c) => {
                    const total = totalComanda(c.itens as ItemPedido[])
                    const itemsCount = c.itens.reduce((s, i) => s + i.quantidade, 0)
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => router.push(`/garcom/comanda/${c.id}`)}
                        className="flex-row items-center justify-between px-4 py-3"
                        style={{ minHeight: 56, borderTopWidth: 1, borderTopColor: linha }}
                      >
                        <View className="min-w-0 flex-1 pr-2">
                          <Text className="font-sans-bold text-sm" style={{ color: txt }} numberOfLines={1}>
                            {c.cliente_nome || 'Comanda da mesa'}
                          </Text>
                          <Text className="text-xs" style={{ color: sub }}>
                            {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} · aberta {fmt.time(c.criado_em)}
                          </Text>
                        </View>
                        <Text
                          className={`font-sans-bold text-sm ${verde ? '' : 'text-price'}`}
                          style={verde ? { color: '#FAF9F5' } : undefined}
                        >
                          {fmt.currency(total)}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              )
            })}
          </View>
        </ScrollView>
      )}
    </Screen>
  )
}
