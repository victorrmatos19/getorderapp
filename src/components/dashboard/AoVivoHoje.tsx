import { useEffect, useId, useState } from 'react'
import { Animated, Text, View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { fmt } from '@/lib/formatters'

// Pulso operacional do dia (independente do seletor de período), com realtime:
// faturamento de hoje (comandas fechadas hoje) + nº de comandas abertas agora.
function useAoVivo(restauranteId: string | null | undefined) {
  return useQuery({
    queryKey: ['dashboard-aovivo', restauranteId],
    enabled: !!restauranteId,
    queryFn: async () => {
      const inicio = new Date()
      inicio.setHours(0, 0, 0, 0)
      const [fechadasRes, abertasRes] = await Promise.all([
        supabase
          .from('comandas')
          .select('total')
          .eq('restaurante_id', restauranteId!)
          .eq('status', 'fechada')
          .gte('fechado_em', inicio.toISOString()),
        supabase
          .from('comandas')
          .select('id', { count: 'exact', head: true })
          .eq('restaurante_id', restauranteId!)
          .eq('status', 'aberta'),
      ])
      if (fechadasRes.error) throw fechadasRes.error
      if (abertasRes.error) throw abertasRes.error
      const faturamentoHoje = (fechadasRes.data ?? []).reduce((s, c: any) => s + (c.total ?? 0), 0)
      return { faturamentoHoje, comandasAbertas: abertasRes.count ?? 0 }
    },
  })
}

// Ponto pulsante (anima opacidade) — equivalente RN do dot de "ao vivo".
function PulsingDot() {
  const [op] = useState(() => new Animated.Value(1))
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [op])
  return (
    <Animated.View
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#9FE0A0', opacity: op }}
    />
  )
}

export default function AoVivoHoje({ restauranteId }: { restauranteId: string | null | undefined }) {
  const qc = useQueryClient()
  const { data } = useAoVivo(restauranteId)
  const cid = useId()

  useEffect(() => {
    if (!restauranteId) return
    const ch = supabase
      .channel(`dashboard-aovivo-${cid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, () => {
        qc.invalidateQueries({ queryKey: ['dashboard-aovivo', restauranteId] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_pedido' }, () => {
        qc.invalidateQueries({ queryKey: ['dashboard-aovivo', restauranteId] })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [restauranteId, qc, cid])

  return (
    <View className="flex-row items-center justify-between rounded-xl bg-primary p-4">
      <View className="flex-row items-center gap-2">
        <PulsingDot />
        <Text className="text-xs uppercase text-on-primary" style={{ opacity: 0.85, letterSpacing: 0.5 }}>
          Ao vivo · hoje
        </Text>
      </View>
      <View className="flex-row items-center gap-5">
        <View className="items-end">
          <Text className="text-xs text-on-primary" style={{ opacity: 0.8 }}>Faturamento</Text>
          <Text className="font-serif text-lg leading-tight text-on-primary">
            {fmt.currency(data?.faturamentoHoje ?? 0)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-on-primary" style={{ opacity: 0.8 }}>Comandas abertas</Text>
          <Text className="font-serif text-lg leading-tight text-on-primary">
            {data?.comandasAbertas ?? 0}
          </Text>
        </View>
      </View>
    </View>
  )
}
