import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Header } from '@/components/ui/Header'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Toast } from '@/components/ui/Toast'
import { MarcaTab } from '@/components/MarcaTab'
import type { HorarioFuncionamento, Restaurante } from '@/types'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function maskTime(t: string) {
  const d = t.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}
function validTime(t: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(t)
  if (!m) return false
  return +m[1] < 24 && +m[2] < 60
}

export default function Config() {
  const { restauranteId, signOut } = useRestaurante()
  const [tab, setTab] = useState<'geral' | 'horario' | 'marca'>('geral')
  const [toast, setToast] = useState({ visible: false, message: '' })
  const showToast = (message: string) => setToast({ visible: true, message })

  const TAB_LABEL: Record<'geral' | 'horario' | 'marca', string> = { geral: 'Geral', horario: 'Horário', marca: 'Marca' }

  return (
    <Screen className="px-5">
      <Header title="Configurações" subtitle="Admin" onSair={() => signOut()} />
      <View className="mb-4 flex-row gap-2">
        {(['geral', 'horario', 'marca'] as const).map((t) => {
          const active = tab === t
          return (
            <Pressable key={t} onPress={() => setTab(t)} className="rounded-xl px-4 py-2" style={{ backgroundColor: active ? '#2A2A26' : 'transparent', borderWidth: 1, borderColor: active ? '#2A2A26' : '#DDD9CC' }}>
              <Text className="text-sm" style={{ color: active ? '#FAF9F5' : '#6B6A62', fontWeight: active ? '700' : '400' }}>{TAB_LABEL[t]}</Text>
            </Pressable>
          )
        })}
      </View>

      {tab === 'geral' ? (
        <GeralTab restauranteId={restauranteId} onToast={showToast} />
      ) : tab === 'horario' ? (
        <HorarioTab restauranteId={restauranteId} onToast={showToast} />
      ) : (
        <MarcaTab restauranteId={restauranteId} onToast={showToast} />
      )}

      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
    </Screen>
  )
}

function GeralTab({ restauranteId, onToast }: { restauranteId: string | null; onToast: (m: string) => void }) {
  const qc = useQueryClient()
  const [rest, setRest] = useState<Restaurante | null>(null)
  const [taxaPct, setTaxaPct] = useState('10')
  const [taxaObrigatoria, setTaxaObrigatoria] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [pausaMsg, setPausaMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!restauranteId) return
    supabase.from('restaurantes').select('*').eq('id', restauranteId).maybeSingle().then(({ data }) => {
      const r = data as Restaurante | null
      setRest(r)
      if (r) {
        setTaxaPct(String(r.taxa_servico_percentual ?? 10).replace('.', ','))
        setTaxaObrigatoria(r.taxa_servico_obrigatoria)
        setPausado(r.pedidos_pausados)
        setPausaMsg(r.pausa_mensagem ?? '')
      }
      setLoading(false)
    })
  }, [restauranteId])

  const save = async () => {
    if (!rest) return
    const taxaNum = parseFloat(taxaPct.replace(',', '.'))
    if (!Number.isFinite(taxaNum) || taxaNum < 0 || taxaNum > 100) {
      onToast('Taxa inválida (0–100%).')
      return
    }
    setBusy(true)
    const { error } = await supabase
      .from('restaurantes')
      .update({ taxa_servico_percentual: taxaNum, taxa_servico_obrigatoria: taxaObrigatoria, pedidos_pausados: pausado, pausa_mensagem: pausaMsg.trim() || null })
      .eq('id', rest.id)
    setBusy(false)
    if (error) return onToast(error.message)
    qc.invalidateQueries({ queryKey: ['disponibilidade'] })
    onToast('Configurações salvas')
  }

  if (loading) return <View className="py-16 items-center"><Spinner color="#9B4A3C" /></View>

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="rounded-xl border border-line bg-surface p-4">
        <Text className="mb-3 text-xs font-sans-bold uppercase text-text-mid">Taxa de serviço</Text>
        <Text className="mb-1 text-xs text-text-mid">Percentual (%)</Text>
        <TextInput value={taxaPct} onChangeText={(t) => setTaxaPct(t.replace(/[^0-9,.]/g, ''))} keyboardType="decimal-pad" placeholder="10" placeholderTextColor="#B8B5AB" className="border-b border-line py-3 text-base text-ink" />
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="flex-1 pr-3 text-sm text-ink">Obrigatória — garçom não remove no fechamento</Text>
          <Switch value={taxaObrigatoria} onValueChange={setTaxaObrigatoria} trackColor={{ true: '#4A5240', false: '#DDD9CC' }} />
        </View>
      </View>

      <View className="mt-4 rounded-xl border border-line bg-surface p-4">
        <Text className="mb-3 text-xs font-sans-bold uppercase text-text-mid">Pausar novos pedidos</Text>
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 pr-3 text-sm text-ink">Pausar novos pedidos temporariamente</Text>
          <Switch value={pausado} onValueChange={setPausado} trackColor={{ true: '#4A5240', false: '#DDD9CC' }} />
        </View>
        {pausado ? (
          <View className="mt-3">
            <Text className="mb-1 text-xs text-text-mid">Mensagem ao cliente</Text>
            <TextInput value={pausaMsg} onChangeText={setPausaMsg} multiline maxLength={200} placeholder="Estamos com a cozinha cheia, voltamos em alguns minutos" placeholderTextColor="#B8B5AB" className="rounded-xl border border-line bg-bg p-3 text-sm text-ink" style={{ minHeight: 64, textAlignVertical: 'top' }} />
          </View>
        ) : null}
      </View>

      <View className="mt-4">
        <Button label="Salvar alterações" onPress={save} loading={busy} />
      </View>
    </ScrollView>
  )
}

type Row = { dia_semana: number; abre: string; fecha: string; fechado: boolean }
function ensureSeven(rows: HorarioFuncionamento[]): Row[] {
  const map = new Map<number, HorarioFuncionamento>()
  rows.forEach((r) => map.set(r.dia_semana, r))
  return Array.from({ length: 7 }, (_, dia) => {
    const r = map.get(dia)
    return { dia_semana: dia, abre: (r?.abre ?? '17:00').slice(0, 5), fecha: (r?.fecha ?? '23:00').slice(0, 5), fechado: r?.fechado ?? false }
  })
}

function HorarioTab({ restauranteId, onToast }: { restauranteId: string | null; onToast: (m: string) => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!restauranteId) return
    supabase.from('horarios_funcionamento').select('*').eq('restaurante_id', restauranteId).then(({ data }) => {
      setRows(ensureSeven((data ?? []) as HorarioFuncionamento[]))
      setLoading(false)
    })
  }, [restauranteId])

  const update = (dia: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.dia_semana === dia ? { ...r, ...patch } : r)))

  const save = async () => {
    if (!restauranteId) return
    for (const r of rows) {
      if (!r.fechado && (!validTime(r.abre) || !validTime(r.fecha))) {
        onToast(`Horário inválido em ${DIAS[r.dia_semana]} (use HH:MM).`)
        return
      }
    }
    setBusy(true)
    const payload = rows.map((r) => ({ restaurante_id: restauranteId, dia_semana: r.dia_semana, abre: r.fechado ? null : `${r.abre}:00`, fecha: r.fechado ? null : `${r.fecha}:00`, fechado: r.fechado }))
    const { error } = await supabase.from('horarios_funcionamento').upsert(payload, { onConflict: 'restaurante_id,dia_semana' })
    setBusy(false)
    if (error) return onToast(error.message)
    onToast('Horários salvos')
  }

  if (loading) return <View className="py-16 items-center"><Spinner color="#9B4A3C" /></View>

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text className="mb-3 text-xs font-sans-bold uppercase text-text-mid">Horário de funcionamento</Text>
      <View className="gap-2">
        {rows.map((r) => (
          <View key={r.dia_semana} className="rounded-xl border border-line bg-surface p-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-sans-bold text-ink">{DIAS[r.dia_semana]}</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-text-mid">Fechado</Text>
                <Switch value={r.fechado} onValueChange={(v) => update(r.dia_semana, { fechado: v })} trackColor={{ true: '#4A5240', false: '#DDD9CC' }} />
              </View>
            </View>
            {!r.fechado ? (
              <View className="mt-2 flex-row items-center gap-2">
                <TextInput value={r.abre} onChangeText={(t) => update(r.dia_semana, { abre: maskTime(t) })} keyboardType="number-pad" maxLength={5} className="rounded-lg border border-line bg-bg px-2 py-2 text-sm text-ink" style={{ width: 72, textAlign: 'center' }} />
                <Text className="text-xs text-text-mid">às</Text>
                <TextInput value={r.fecha} onChangeText={(t) => update(r.dia_semana, { fecha: maskTime(t) })} keyboardType="number-pad" maxLength={5} className="rounded-lg border border-line bg-bg px-2 py-2 text-sm text-ink" style={{ width: 72, textAlign: 'center' }} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <View className="mt-6">
        <Button label="Salvar horários" onPress={save} loading={busy} />
      </View>
    </ScrollView>
  )
}
