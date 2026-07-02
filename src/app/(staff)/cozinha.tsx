import { memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Redirect } from 'expo-router'
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { Screen } from '@/components/ui/Screen'
import { Spinner } from '@/components/ui/Spinner'
import { useItensCozinha } from '@/lib/hooks/useItensCozinha'
import { useCozinhaAlerta } from '@/lib/hooks/useCozinhaAlerta'
import { fmt } from '@/lib/formatters'
import type { ItemPedido, ItemStatus } from '@/types'

type ConexaoStatus = 'conectando' | 'ao_vivo' | 'reconectando' | 'sem_conexao'
type Tab = 'novo' | 'em_preparo' | 'pronto'

const TABS: { key: Tab; label: string; color: string }[] = [
  { key: 'novo', label: 'Novos', color: '#C8871E' },
  { key: 'em_preparo', label: 'Preparando', color: '#4A6B82' },
  { key: 'pronto', label: 'Prontos', color: '#567D4F' },
]
const NEXT_STATUS: Record<Tab, ItemStatus> = { novo: 'em_preparo', em_preparo: 'pronto', pronto: 'entregue' }
const NEXT_LABEL: Record<Tab, string> = {
  novo: 'Iniciar Preparo',
  em_preparo: 'Marcar Pronto',
  pronto: 'Confirmar Entrega',
}
const CONEXAO: Record<ConexaoStatus, { cor: string; label: string }> = {
  conectando: { cor: 'rgba(250,249,245,0.45)', label: 'Conectando' },
  ao_vivo: { cor: '#567D4F', label: 'Ao vivo' },
  reconectando: { cor: '#C8871E', label: 'Reconectando' },
  sem_conexao: { cor: '#C56B56', label: 'Sem conexão' },
}

const DARK = { text: '#F2F0E8', muted: 'rgba(250,249,245,0.62)', card: '#242821', accent: '#E08A74' }
const COL_W = Math.min(320, Math.floor(Dimensions.get('window').width * 0.84))

function relogioStr() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
const Relogio = memo(function Relogio() {
  const [hora, setHora] = useState(relogioStr)
  useEffect(() => {
    const t = setInterval(() => setHora(relogioStr()), 1000)
    return () => clearInterval(t)
  }, [])
  return <Text className="font-serif text-2xl" style={{ color: DARK.text }}>{hora}</Text>
})

// Adicionais agrupados por grupo (UPPER CASE) — a cozinha não pode perder ponto/sem-X.
function agruparAdicionais(it: ItemPedido) {
  const grupos: { grupo: string | null; nomes: string[] }[] = []
  for (const a of it.adicionais ?? []) {
    const grupo = a.grupo_nome_snapshot ? a.grupo_nome_snapshot.toUpperCase() : null
    const nome = a.nome_snapshot.toUpperCase()
    const last = grupos[grupos.length - 1]
    if (last && last.grupo === grupo) last.nomes.push(nome)
    else grupos.push({ grupo, nomes: [nome] })
  }
  return grupos
}

type Group = { key: string; mesa: string; cliente: string; criadoMin: number; itens: ItemPedido[] }

export default function Cozinha() {
  const qc = useQueryClient()
  const { restaurante, restauranteId, role, signOut } = useRestaurante()
  const { data: itens = [], isLoading, isError, refetch } = useItensCozinha()
  const { mudo, alternarMudo, tocar } = useCozinhaAlerta()
  const [conexao, setConexao] = useState<ConexaoStatus>('conectando')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const cid = useId()

  // Debounce do alerta: vários INSERTs do mesmo pedido = um toque só.
  const tocarRef = useRef(tocar)
  useEffect(() => {
    tocarRef.current = tocar
  }, [tocar])
  const alertaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!restauranteId) return
    const agendar = () => {
      if (alertaTimer.current) clearTimeout(alertaTimer.current)
      alertaTimer.current = setTimeout(() => tocarRef.current(), 1500)
    }
    const ch = supabase
      .channel(`cozinha-orders-${cid}`)
      // Filtro por tenant no servidor (perf: não recebe eventos de outros restaurantes).
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itens_pedido', filter: `restaurante_id=eq.${restauranteId}` },
        (payload) => {
          // Defesa em profundidade: chime/refetch só para evento do PRÓPRIO tenant.
          const rid =
            (payload.new as { restaurante_id?: string })?.restaurante_id ??
            (payload.old as { restaurante_id?: string })?.restaurante_id
          if (rid && rid !== restauranteId) return
          qc.invalidateQueries({ queryKey: ['itens', 'cozinha'] })
          if (payload.eventType === 'INSERT') agendar()
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConexao('ao_vivo')
        else if (status === 'CHANNEL_ERROR') setConexao('sem_conexao')
        else if (status === 'TIMED_OUT' || status === 'CLOSED') setConexao('reconectando')
      })
    return () => {
      if (alertaTimer.current) clearTimeout(alertaTimer.current)
      supabase.removeChannel(ch)
    }
  }, [qc, cid, restauranteId])

  const colunas = useMemo(() => {
    const maps: Record<Tab, Map<string, Group>> = { novo: new Map(), em_preparo: new Map(), pronto: new Map() }
    for (const it of itens) {
      const status = it.status as Tab
      if (!(status in maps)) continue
      const map = maps[status]
      const key = it.comanda_id
      const mesa = (it.comanda as any)?.mesa?.nome ?? 'Mesa'
      const cliente = (it.comanda as any)?.cliente_nome ?? ''
      const min = fmt.elapsedMin(it.criado_em)
      const g = map.get(key)
      if (g) {
        g.itens.push(it)
        if (min > g.criadoMin) g.criadoMin = min
      } else {
        map.set(key, { key, mesa, cliente, criadoMin: min, itens: [it] })
      }
    }
    return TABS.map((t) => ({
      ...t,
      groups: Array.from(maps[t.key].values()).sort((a, b) => b.criadoMin - a.criadoMin),
    }))
  }, [itens])

  const counts = useMemo(() => {
    const c = { novo: 0, em_preparo: 0, pronto: 0 } as Record<Tab, number>
    for (const it of itens) if (it.status in c) c[it.status as Tab] += 1
    return c
  }, [itens])

  const avancar = async (group: Group, tab: Tab) => {
    setBusyKey(group.key)
    try {
      const ids = group.itens.map((i) => i.id)
      const { error } = await supabase.from('itens_pedido').update({ status: NEXT_STATUS[tab] }).in('id', ids)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['itens', 'cozinha'] })
    } catch {
      /* erro silencioso na fundação; toast vem com a UI completa */
    } finally {
      setBusyKey(null)
    }
  }

  const cfg = CONEXAO[conexao]

  // Guard fino de role (auditoria item 2): /cozinha é admin|cozinha — garçom (ex.: via
  // deep link getorderapp://cozinha) volta para a própria home. Escrita já é barrada pela RLS.
  if (role && role !== 'admin' && role !== 'cozinha') {
    return <Redirect href={role === 'garcom' ? '/garcom' : '/login'} />
  }

  return (
    <ThemeProvider dark>
      <Screen dark className="px-4">
        {/* Header: relógio + conexão + som */}
        <View className="flex-row items-center justify-between py-3">
          <View>
            <Text className="text-xs" style={{ color: DARK.muted }}>
              Cozinha · {restaurante?.nome ?? 'GetOrder'}
            </Text>
            <Relogio />
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1.5">
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cfg.cor }} />
              <Text className="text-xs" style={{ color: DARK.muted }}>{cfg.label}</Text>
            </View>
            <Pressable
              onPress={alternarMudo}
              className="items-center justify-center rounded-lg px-3"
              style={{ minWidth: 44, minHeight: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={{ fontSize: 16, color: mudo ? DARK.muted : DARK.text }}>{mudo ? '🔕' : '🔔'}</Text>
            </Pressable>
            <Pressable onPress={() => signOut()} className="rounded-lg px-3 py-2" style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
              <Text className="text-xs" style={{ color: DARK.muted }}>Sair</Text>
            </Pressable>
          </View>
        </View>

        {isError ? (
          <View className="items-center py-16 gap-3">
            <Text className="text-sm" style={{ color: DARK.accent }}>Não foi possível carregar.</Text>
            <Pressable onPress={() => refetch()}>
              <Text className="text-sm underline" style={{ color: DARK.accent }}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View className="py-16 items-center">
            <Spinner color="#C56B56" />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
            <View className="flex-row gap-3">
              {colunas.map((col) => (
                <View key={col.key} style={{ width: COL_W }} className="flex-1">
                  <View className="flex-row items-center gap-2 pb-2 mb-3" style={{ borderBottomWidth: 2, borderBottomColor: col.color }}>
                    <Text className="font-sans-bold text-sm" style={{ color: col.color }}>{col.label}</Text>
                    <Text className="text-xs" style={{ color: DARK.muted }}>{counts[col.key]}</Text>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                    {col.groups.length === 0 && (
                      <Text className="text-center py-10 text-sm" style={{ color: DARK.muted }}>
                        Nenhum pedido neste estado.
                      </Text>
                    )}
                    {col.groups.map((g) => {
                      const urgent = g.criadoMin > 15
                      return (
                        <View
                          key={g.key}
                          className="rounded-xl p-4 mb-3"
                          style={{ backgroundColor: DARK.card, borderWidth: 1, borderColor: urgent ? DARK.accent : 'rgba(255,255,255,0.08)' }}
                        >
                          <View className="flex-row justify-between items-start mb-3">
                            <View className="min-w-0 flex-1 pr-2">
                              <Text className="font-sans-bold text-base" style={{ color: DARK.text }}>{g.mesa}</Text>
                              {g.cliente ? <Text className="text-xs mt-0.5" style={{ color: DARK.muted }}>{g.cliente}</Text> : null}
                            </View>
                            <Text className="text-xs" style={{ color: urgent ? DARK.accent : DARK.muted, fontWeight: urgent ? '700' : '400' }}>
                              {urgent ? '⚠ ' : ''}{g.criadoMin} min
                            </Text>
                          </View>

                          <View className="mb-4">
                            {g.itens.map((it) => (
                              <View key={it.id} className="py-1.5">
                                <Text className="text-sm" style={{ color: DARK.text }}>
                                  {it.produto?.nome ?? '—'} <Text style={{ color: DARK.muted }}>× {it.quantidade}</Text>
                                </Text>
                                {agruparAdicionais(it).map((gr, idx) => (
                                  <View key={idx} className="mt-1 rounded px-2 py-1" style={{ backgroundColor: 'rgba(224,138,116,0.08)', borderLeftWidth: 3, borderLeftColor: DARK.accent }}>
                                    <Text className="font-sans-bold text-sm" style={{ color: DARK.accent }}>
                                      {gr.grupo ? `${gr.grupo}: ` : '› '}{gr.nomes.join(', ')}
                                    </Text>
                                  </View>
                                ))}
                                {it.obs ? (
                                  <View className="mt-1 rounded px-2 py-1" style={{ backgroundColor: 'rgba(224,138,116,0.08)', borderLeftWidth: 3, borderLeftColor: DARK.accent }}>
                                    <Text className="font-sans-bold text-sm" style={{ color: DARK.accent }}>↳ {it.obs}</Text>
                                  </View>
                                ) : null}
                              </View>
                            ))}
                          </View>

                          <Pressable
                            onPress={() => avancar(g, col.key)}
                            disabled={busyKey === g.key}
                            className="rounded-xl items-center justify-center"
                            style={{ minHeight: 44, backgroundColor: col.color, opacity: busyKey === g.key ? 0.7 : 1 }}
                          >
                            {busyKey === g.key ? (
                              <Spinner color="#1A1E17" />
                            ) : (
                              <Text className="font-sans-bold text-sm" style={{ color: '#1A1E17' }}>{NEXT_LABEL[col.key]}</Text>
                            )}
                          </Pressable>
                        </View>
                      )
                    })}
                    <View style={{ height: 24 }} />
                  </ScrollView>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </Screen>
    </ThemeProvider>
  )
}
