import { useState } from 'react'
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Header } from '@/components/ui/Header'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Toast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { QRModal } from '@/components/QRModal'
import { fmt } from '@/lib/formatters'
import type { Mesa } from '@/types'

function useMesas(restauranteId: string | null) {
  return useQuery({
    queryKey: ['mesas', restauranteId],
    enabled: !!restauranteId,
    queryFn: async () => {
      const { data, error } = await supabase.from('mesas').select('*').eq('restaurante_id', restauranteId!).order('nome')
      if (error) throw error
      return (data ?? []) as Mesa[]
    },
  })
}

export default function MesasAdmin() {
  const qc = useQueryClient()
  const { restauranteId, signOut } = useRestaurante()
  const { data: mesas = [], isLoading, isError, refetch } = useMesas(restauranteId)
  const [editing, setEditing] = useState<Mesa | null>(null)
  const [creating, setCreating] = useState(false)
  const [qrMesa, setQrMesa] = useState<Mesa | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '' })

  const save = useMutation({
    mutationFn: async (input: { id?: string; nome: string; ativo: boolean }) => {
      if (input.id) {
        const { error } = await supabase.from('mesas').update({ nome: input.nome, ativo: input.ativo }).eq('id', input.id)
        if (error) throw error
      } else {
        if (!restauranteId) throw new Error('Restaurante não definido')
        const { error } = await supabase.from('mesas').insert({ nome: input.nome, ativo: input.ativo, restaurante_id: restauranteId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mesas'] })
      setEditing(null)
      setCreating(false)
      setToast({ visible: true, message: 'Mesa salva' })
    },
    onError: (e: any) => setToast({ visible: true, message: e?.message || 'Erro ao salvar' }),
  })

  const toggleAtivo = useMutation({
    mutationFn: async (m: Mesa) => {
      const { error } = await supabase.from('mesas').update({ ativo: !m.ativo }).eq('id', m.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mesas'] }),
  })

  const novaBtn = (
    <Pressable onPress={() => setCreating(true)} className="rounded-lg bg-ink px-3" style={{ minHeight: 40, justifyContent: 'center' }}>
      <Text className="font-sans-bold text-xs text-bg">+ Nova</Text>
    </Pressable>
  )

  return (
    <Screen className="px-5">
      <Header title="Mesas" subtitle="Admin" right={novaBtn} onSair={() => signOut()} />

      {isLoading ? (
        <View className="py-16 items-center"><Spinner color="#9B4A3C" /></View>
      ) : isError ? (
        <EmptyState icon="⚠️" title="Erro ao carregar" action={<Pressable onPress={() => refetch()}><Text className="text-sm text-accent underline">Tentar novamente</Text></Pressable>} />
      ) : mesas.length === 0 ? (
        <EmptyState icon="🪑" title="Nenhuma mesa cadastrada" description="Comece criando sua primeira mesa." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="gap-2">
            {mesas.map((m) => (
              <View key={m.id} className="flex-row items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                <View className="min-w-0 flex-1">
                  <Text className="font-sans-bold text-sm text-ink">{m.nome}</Text>
                  <Text className="text-xs text-text-mid">Criada em {fmt.date(m.criado_em)}</Text>
                </View>
                <Pressable onPress={() => toggleAtivo.mutate(m)} className="rounded-full px-2 py-1" style={{ borderWidth: 1, borderColor: m.ativo ? '#567D4F' : '#B8B5AB' }}>
                  <Text className="text-xs" style={{ color: m.ativo ? '#567D4F' : '#B8B5AB' }}>{m.ativo ? 'Ativa' : 'Inativa'}</Text>
                </Pressable>
                <Pressable onPress={() => setQrMesa(m)} className="rounded-xl border border-line px-3 py-2">
                  <Text className="text-xs text-ink">QR</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(m)} className="rounded-xl border border-line px-3 py-2">
                  <Text className="text-xs text-text-mid">Editar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {creating || editing ? (
        <MesaForm initial={editing} busy={save.isPending} onClose={() => { setEditing(null); setCreating(false) }} onSubmit={(d) => save.mutate({ id: editing?.id, ...d })} />
      ) : null}

      {qrMesa ? <QRModal mesa={qrMesa} onClose={() => setQrMesa(null)} /> : null}

      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
    </Screen>
  )
}

function MesaForm({ initial, busy, onClose, onSubmit }: { initial: Mesa | null; busy: boolean; onClose: () => void; onSubmit: (d: { nome: string; ativo: boolean }) => void }) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [ativo, setAtivo] = useState(initial?.ativo ?? true)
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !busy && onClose()}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => !busy && onClose()}>
        <Pressable onPress={() => {}} className="bg-bg px-6 pb-8 pt-6" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <Text className="mb-5 font-serif text-xl text-ink">{initial ? 'Editar mesa' : 'Nova mesa'}</Text>
          <Text className="mb-1 text-xs text-text-mid">Nome</Text>
          <TextInput value={nome} onChangeText={setNome} placeholder="Ex.: Mesa 5 ou Quadra 1" placeholderTextColor="#B8B5AB" className="border-b border-line py-3 text-base text-ink" />
          <View className="mt-5 flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-sm text-ink">Mesa ativa (clientes podem abrir comandas)</Text>
            <Switch value={ativo} onValueChange={setAtivo} trackColor={{ true: '#4A5240', false: '#DDD9CC' }} />
          </View>
          <View className="mt-6 flex-row gap-2">
            <Pressable onPress={onClose} disabled={busy} className="flex-1 items-center justify-center rounded-xl border border-line" style={{ minHeight: 48 }}>
              <Text className="text-sm text-text-mid">Cancelar</Text>
            </Pressable>
            <View style={{ flex: 2 }}>
              <Button label="Salvar" onPress={() => onSubmit({ nome: nome.trim(), ativo })} loading={busy} disabled={!nome.trim()} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
