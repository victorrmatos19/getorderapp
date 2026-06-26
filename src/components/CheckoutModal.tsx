import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { supabase } from '@/lib/supabase/client'
import { fecharComanda } from '@/lib/garcom'
import { Spinner } from '@/components/ui/Spinner'
import { fmt } from '@/lib/formatters'
import { subtotalItem } from '@/lib/calcComanda'
import type { FormaPagamento, ItemPedido, Restaurante } from '@/types'

const METHODS: { id: FormaPagamento; label: string; emoji: string }[] = [
  { id: 'credito', label: 'Crédito', emoji: '💳' },
  { id: 'debito', label: 'Débito', emoji: '💳' },
  { id: 'pix', label: 'PIX', emoji: '📱' },
  { id: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
]

export function CheckoutModal({
  comandaId,
  clienteNome,
  mesaNome,
  restauranteId,
  itens,
  subtotal,
  onClose,
  onSuccess,
}: {
  comandaId: string
  clienteNome: string | null
  mesaNome: string
  restauranteId: string
  itens: ItemPedido[]
  subtotal: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [method, setMethod] = useState<FormaPagamento | null>(null)
  const [recebido, setRecebido] = useState('')
  const [taxaAplicada, setTaxaAplicada] = useState(true)
  const [numeroPessoas, setNumeroPessoas] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState<{ method: FormaPagamento; total: number } | null>(null)

  useEffect(() => {
    supabase
      .from('restaurantes')
      .select('*')
      .eq('id', restauranteId)
      .maybeSingle()
      .then(({ data }) => setRestaurante((data as Restaurante) ?? null))
  }, [restauranteId])

  const taxaPercentual = restaurante?.taxa_servico_percentual ?? 10
  const taxaObrigatoria = restaurante?.taxa_servico_obrigatoria ?? false
  const efetivamenteAplicada = taxaObrigatoria || taxaAplicada
  const servico = efetivamenteAplicada ? Math.round(subtotal * (taxaPercentual / 100) * 100) / 100 : 0
  const total = subtotal + servico
  const valorPorPessoa = numeroPessoas > 0 ? Math.round((total / numeroPessoas) * 100) / 100 : total
  const recebidoNum = fmt.moneyParse(recebido)
  const troco = method === 'dinheiro' ? Math.max(0, recebidoNum - total) : 0
  const podeConfirmar = !!method && !busy && (method !== 'dinheiro' || recebidoNum >= total)
  const itensAtivos = useMemo(() => itens.filter((it) => it.status !== 'cancelado'), [itens])

  const confirmar = async () => {
    if (!method) return
    setErr('')
    setBusy(true)
    try {
      const totalServidor = await fecharComanda({ comandaId, formaPagamento: method, taxaAplicada: efetivamenteAplicada, numeroPessoas })
      setSuccess({ method, total: totalServidor })
    } catch (e: any) {
      setErr(e?.message || 'Erro ao encerrar a comanda.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !busy && onClose()}>
      {success ? (
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View className="w-full rounded-xl bg-bg p-6" style={{ maxWidth: 360 }}>
            <View className="mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full" style={{ borderWidth: 1, borderColor: '#567D4F' }}>
              <Text style={{ color: '#567D4F', fontSize: 24 }}>✓</Text>
            </View>
            <Text className="text-center font-serif text-xl text-ink">Comanda encerrada</Text>
            <Text className="mt-1 text-center text-sm text-text-mid">{clienteNome ? `${clienteNome} · ` : ''}{mesaNome}</Text>
            <Text className="my-4 text-center font-serif text-2xl text-price">{fmt.currency(success.total)} recebido</Text>
            <Text className="text-center text-xs text-text-mid">via {METHODS.find((m) => m.id === success.method)?.label}</Text>
            {numeroPessoas > 1 ? (
              <Text className="mt-1 text-center text-xs text-text-mid">Dividido entre {numeroPessoas} ({fmt.currency(valorPorPessoa)} cada)</Text>
            ) : null}
            <Pressable onPress={onSuccess} className="mt-5 w-full items-center justify-center rounded-xl border border-line" style={{ minHeight: 48 }}>
              <Text className="font-sans-bold text-sm text-ink">Voltar para mesas</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => !busy && onClose()}>
          <Pressable onPress={() => {}} className="bg-bg" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <View className="flex-row items-center justify-between px-6 pt-6">
                <View>
                  <Text className="text-xs text-text-mid">{mesaNome}{clienteNome ? ` · ${clienteNome}` : ''}</Text>
                  <Text className="font-serif text-lg text-ink">Encerramento</Text>
                </View>
                <Pressable onPress={() => !busy && onClose()} className="h-9 w-9 items-center justify-center rounded-xl border border-line">
                  <Text className="text-text-mid">✕</Text>
                </Pressable>
              </View>

              <View className="mx-6 flex-row items-baseline justify-between border-b border-line py-4">
                <Text className="text-xs uppercase text-text-mid">Total</Text>
                <Text className="font-serif text-price" style={{ fontSize: 32 }}>{fmt.currency(total)}</Text>
              </View>

              {/* Resumo */}
              <View className="px-6 pt-4">
                <Text className="mb-2 text-xs font-sans-bold uppercase text-text-mid">Resumo</Text>
                {itensAtivos.map((it) => (
                  <View key={it.id} className="py-1.5">
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-text-mid" style={{ flexShrink: 1 }}>{it.produto?.nome ?? '—'} × {it.quantidade}</Text>
                      <Text className="text-sm text-ink">{fmt.currency(subtotalItem(it))}</Text>
                    </View>
                    {(it.adicionais ?? []).map((a) => (
                      <Text key={a.id} className="mt-0.5 text-xs text-text-mid">+ {a.nome_snapshot}{a.preco_snapshot > 0 ? ` (${fmt.currency(a.preco_snapshot)})` : ''}</Text>
                    ))}
                    {it.obs ? <Text className="mt-0.5 text-xs italic text-text-mid">↳ {it.obs}</Text> : null}
                  </View>
                ))}
                <View className="mt-2 flex-row items-center justify-between border-t border-line py-3">
                  <View>
                    <Text className="text-sm text-ink">Taxa de serviço ({taxaPercentual}%)</Text>
                    <Text className="text-xs text-text-mid">{taxaObrigatoria ? 'Obrigatória' : 'Opcional'}</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-sm font-sans-bold" style={{ color: efetivamenteAplicada ? '#2A2A26' : '#B8B5AB' }}>{fmt.currency(servico)}</Text>
                    <Switch
                      value={efetivamenteAplicada}
                      onValueChange={(v) => {
                        if (!taxaObrigatoria) setTaxaAplicada(v)
                      }}
                      disabled={taxaObrigatoria}
                      trackColor={{ true: '#4A5240', false: '#DDD9CC' }}
                    />
                  </View>
                </View>
              </View>

              {/* Dividir conta */}
              <View className="px-6 pt-4">
                <Text className="mb-3 text-xs font-sans-bold uppercase text-text-mid">Dividir conta</Text>
                <View className="rounded-xl border border-line bg-surface p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-ink">Número de pessoas</Text>
                    <View className="flex-row items-center gap-2">
                      <Pressable onPress={() => setNumeroPessoas((n) => Math.max(1, n - 1))} className="h-9 w-9 items-center justify-center rounded-xl border border-line">
                        <Text className="text-ink" style={{ fontSize: 18 }}>−</Text>
                      </Pressable>
                      <Text className="font-sans-bold text-base text-ink" style={{ minWidth: 24, textAlign: 'center' }}>{numeroPessoas}</Text>
                      <Pressable onPress={() => setNumeroPessoas((n) => Math.min(20, n + 1))} className="h-9 w-9 items-center justify-center rounded-xl border border-line">
                        <Text className="text-ink" style={{ fontSize: 18 }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  {numeroPessoas > 1 ? (
                    <View className="mt-2 flex-row items-center justify-between border-t border-line pt-2">
                      <Text className="text-sm text-text-mid">Valor por pessoa</Text>
                      <Text className="font-serif text-lg text-price">{fmt.currency(valorPorPessoa)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Métodos */}
              <View className="px-6 pt-4">
                <Text className="mb-3 text-xs font-sans-bold uppercase text-text-mid">Forma de pagamento</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {METHODS.map((m) => {
                    const active = method === m.id
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => setMethod(m.id)}
                        className="flex-row items-center gap-3 rounded-xl px-3"
                        style={{ width: '47.5%', minHeight: 56, borderWidth: 1, borderColor: active ? '#2A2A26' : '#DDD9CC', backgroundColor: active ? '#F2F0E8' : 'transparent' }}
                      >
                        <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                        <Text className="text-sm" style={{ color: active ? '#2A2A26' : '#6B6A62', fontWeight: active ? '700' : '400' }}>{m.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {method === 'dinheiro' ? (
                <View className="px-6 pt-4">
                  <Text className="mb-2 text-xs text-text-mid">Valor recebido</Text>
                  <TextInput
                    value={recebido}
                    onChangeText={(t) => setRecebido(fmt.moneyMask(t))}
                    placeholder="0,00"
                    placeholderTextColor="#B8B5AB"
                    keyboardType="numeric"
                    className="border-b border-line py-3 font-sans-bold text-ink"
                    style={{ fontSize: 18 }}
                  />
                  {recebidoNum > 0 ? (
                    <View className="mt-3 flex-row items-baseline justify-between border-t border-line pt-3">
                      <Text className="text-sm text-text-mid">Troco</Text>
                      <Text className="font-serif text-lg" style={{ color: recebidoNum >= total ? '#2A2A26' : '#9B4A3C' }}>{fmt.currency(troco)}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {err ? <Text className="px-6 pt-3 text-xs text-accent">{err}</Text> : null}

              <View className="mt-4 border-t border-line px-6 pb-6 pt-3">
                <Pressable
                  onPress={confirmar}
                  disabled={!podeConfirmar}
                  className="w-full flex-row items-center justify-center gap-2 rounded-xl"
                  style={{ minHeight: 52, backgroundColor: podeConfirmar ? '#9B4A3C' : '#DDD9CC' }}
                >
                  {busy ? (
                    <><Spinner color="#FAF9F5" /><Text className="font-sans-bold text-sm text-on-accent">Processando</Text></>
                  ) : (
                    <Text className="font-sans-bold text-sm" style={{ color: podeConfirmar ? '#FAF9F5' : '#6B6A62' }}>
                      {method ? 'Confirmar Pagamento' : 'Selecione a forma de pagamento'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      )}
    </Modal>
  )
}
