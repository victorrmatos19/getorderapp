import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { fmt } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import type { GrupoAdicional, SelecaoAdicional } from '@/types'
import type { SalvarGrupoInput } from '@/lib/hooks/useAdicionais'

type Row = { key: string; id?: string; nome: string; preco: string; disponivel: boolean }

// Form de grupo de adicionais (criar/editar) — espelha o GrupoForm da web.
// selecao única → min/max escondidos (escolha exata de 1). múltipla → min/max + "sem teto".
export function GrupoForm({
  initial,
  busy,
  onClose,
  onSubmit,
}: {
  initial: GrupoAdicional | null
  busy: boolean
  onClose: () => void
  onSubmit: (input: SalvarGrupoInput) => void
}) {
  const seq = useRef(0)
  const novoKey = () => `k${seq.current++}`

  const [nome, setNome] = useState(initial?.nome ?? '')
  const [selecao, setSelecao] = useState<SelecaoAdicional>(initial?.selecao ?? 'unica')
  const [obrigatorio, setObrigatorio] = useState(initial?.obrigatorio ?? false)
  const [minEscolhas, setMinEscolhas] = useState(initial?.min_escolhas ?? 0)
  const [semTeto, setSemTeto] = useState(initial ? initial.max_escolhas == null : false)
  const [maxEscolhas, setMaxEscolhas] = useState(initial?.max_escolhas ?? 1)
  const [ativo, setAtivo] = useState(initial?.ativo ?? true)
  const [opcoes, setOpcoes] = useState<Row[]>(
    // opções existentes já têm id único → usa como key (não acessa o ref no render)
    (initial?.adicionais ?? []).map((a) => ({ key: a.id, id: a.id, nome: a.nome, preco: fmt.money(a.preco), disponivel: a.disponivel })),
  )
  const [removidas, setRemovidas] = useState<string[]>([])
  const [err, setErr] = useState('')

  const isUnica = selecao === 'unica'

  const setOpcao = (key: string, patch: Partial<Row>) =>
    setOpcoes((prev) => prev.map((o) => (o.key === key ? { ...o, ...patch } : o)))
  const addOpcao = () => setOpcoes((prev) => [...prev, { key: novoKey(), nome: '', preco: '', disponivel: true }])
  const rmOpcao = (row: Row) => {
    if (row.id) setRemovidas((prev) => [...prev, row.id!])
    setOpcoes((prev) => prev.filter((o) => o.key !== row.key))
  }

  const submit = () => {
    if (!nome.trim()) return setErr('Informe o nome do grupo.')
    const limpas = opcoes.filter((o) => o.nome.trim())
    if (limpas.length === 0) return setErr('Adicione ao menos uma opção.')
    for (const o of limpas) {
      const p = fmt.moneyParse(o.preco)
      if (!Number.isFinite(p) || p < 0) return setErr(`Preço inválido em "${o.nome.trim()}".`)
    }
    let min: number
    let max: number | null
    if (isUnica) {
      min = obrigatorio ? 1 : 0
      max = 1
    } else {
      min = Math.max(0, minEscolhas)
      if (obrigatorio && min < 1) min = 1
      max = semTeto ? null : Math.max(1, maxEscolhas)
      if (max != null && max < min) return setErr('O máximo deve ser maior ou igual ao mínimo.')
    }
    setErr('')
    onSubmit({
      id: initial?.id,
      nome: nome.trim(),
      selecao,
      obrigatorio,
      min_escolhas: min,
      max_escolhas: max,
      ativo,
      opcoes: limpas.map((o, i) => ({ id: o.id, nome: o.nome.trim(), preco: fmt.moneyParse(o.preco), disponivel: o.disponivel, ordem: i })),
      opcoesRemovidas: removidas,
    })
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !busy && onClose()}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => !busy && onClose()}>
          <Pressable onPress={() => {}} className="bg-bg" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' }}>
            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
              <Text className="mb-5 font-serif text-xl text-ink">{initial ? 'Editar grupo' : 'Novo grupo de adicionais'}</Text>

              <Text className="mb-1 text-xs text-text-mid">Nome do grupo</Text>
              <TextInput testID="grupo-nome" value={nome} onChangeText={(t) => { setNome(t); setErr('') }} placeholder="Ex.: Ponto da carne, Adicionais" placeholderTextColor="#B8B5AB" className="border-b border-line py-3 text-base text-ink" />

              {/* tipo de seleção */}
              <Text className="mb-2 mt-5 text-xs font-sans-bold uppercase text-text-mid">Tipo de escolha</Text>
              <View className="flex-row gap-2">
                {(['unica', 'multipla'] as const).map((s) => {
                  const active = selecao === s
                  return (
                    <Pressable key={s} testID={`grupo-selecao-${s}`} onPress={() => setSelecao(s)} className="flex-1 items-center rounded-xl px-3 py-2" style={{ backgroundColor: active ? '#2A2A26' : 'transparent', borderWidth: 1, borderColor: active ? '#2A2A26' : '#DDD9CC' }}>
                      <Text className="text-sm" style={{ color: active ? '#FAF9F5' : '#6B6A62', fontWeight: active ? '700' : '400' }}>{s === 'unica' ? 'Única' : 'Múltipla'}</Text>
                    </Pressable>
                  )
                })}
              </View>

              <ToggleRow label="Obrigatório (cliente precisa escolher)" value={obrigatorio} onChange={setObrigatorio} />

              {!isUnica ? (
                <View className="mt-1 rounded-xl border border-line bg-surface p-3">
                  <Stepper label="Mínimo de escolhas" value={minEscolhas} min={obrigatorio ? 1 : 0} onChange={setMinEscolhas} />
                  <ToggleRow label="Sem limite máximo" value={semTeto} onChange={setSemTeto} />
                  {!semTeto ? <Stepper label="Máximo de escolhas" value={maxEscolhas} min={1} onChange={setMaxEscolhas} /> : null}
                </View>
              ) : null}

              {/* opções */}
              <View className="mb-2 mt-5 flex-row items-center justify-between">
                <Text className="text-xs font-sans-bold uppercase text-text-mid">Opções</Text>
                <Pressable testID="grupo-add-opcao" onPress={addOpcao} className="rounded-lg bg-ink px-3 py-1.5"><Text className="font-sans-bold text-xs text-bg">+ Opção</Text></Pressable>
              </View>
              <View className="gap-2">
                {opcoes.map((o) => (
                  <View key={o.key} className="rounded-xl border border-line bg-surface p-3">
                    <View className="flex-row items-center gap-2">
                      <TextInput value={o.nome} onChangeText={(t) => setOpcao(o.key, { nome: t })} placeholder="Nome (ex.: Bacon)" placeholderTextColor="#B8B5AB" className="flex-1 border-b border-line py-2 text-sm text-ink" />
                      <Pressable onPress={() => rmOpcao(o)} className="h-8 w-8 items-center justify-center rounded-lg border border-line"><Text className="text-accent">✕</Text></Pressable>
                    </View>
                    <View className="mt-2 flex-row items-center justify-between">
                      <View style={{ width: 120 }}>
                        <Text className="mb-1 text-[11px] text-text-mid">Preço (0 = grátis)</Text>
                        <TextInput value={o.preco} onChangeText={(t) => setOpcao(o.key, { preco: fmt.moneyMask(t) })} keyboardType="numeric" placeholder="0,00" placeholderTextColor="#B8B5AB" className="border-b border-line py-1 text-sm text-ink" />
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs text-text-mid">Disponível</Text>
                        <Switch value={o.disponivel} onValueChange={(v) => setOpcao(o.key, { disponivel: v })} trackColor={{ true: '#4A5240', false: '#DDD9CC' }} />
                      </View>
                    </View>
                  </View>
                ))}
                {opcoes.length === 0 ? <Text className="py-2 text-xs text-muted">Nenhuma opção ainda — toque em “+ Opção”.</Text> : null}
              </View>

              <ToggleRow label="Grupo ativo" value={ativo} onChange={setAtivo} />

              {err ? <Text className="mt-3 text-xs text-accent">{err}</Text> : null}

              <View className="mt-6 flex-row gap-2">
                <Pressable onPress={onClose} disabled={busy} className="flex-1 items-center justify-center rounded-xl border border-line" style={{ minHeight: 48 }}><Text className="text-sm text-text-mid">Cancelar</Text></Pressable>
                <View style={{ flex: 2 }}><Button label="Salvar grupo" onPress={submit} loading={busy} testID="grupo-salvar" /></View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="mt-3 flex-row items-center justify-between">
      <Text className="flex-1 pr-3 text-sm text-ink">{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#4A5240', false: '#DDD9CC' }} />
    </View>
  )
}

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  const v = Math.max(min, value)
  return (
    <View className="mt-1 flex-row items-center justify-between py-1">
      <Text className="flex-1 pr-3 text-sm text-ink">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => onChange(Math.max(min, v - 1))} className="h-8 w-8 items-center justify-center rounded-lg border border-line"><Text className="text-base text-ink">−</Text></Pressable>
        <Text className="w-6 text-center text-base font-sans-bold text-ink">{v}</Text>
        <Pressable onPress={() => onChange(v + 1)} className="h-8 w-8 items-center justify-center rounded-lg border border-line"><Text className="text-base text-ink">+</Text></Pressable>
      </View>
    </View>
  )
}
