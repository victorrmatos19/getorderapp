import { useState } from 'react'
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/Spinner'
import { ProdutoGruposSection } from '@/components/ProdutoGruposSection'
import { fmt } from '@/lib/formatters'
import type { Categoria, Produto } from '@/types'

async function uploadFoto(uri: string, restauranteId: string, mime?: string | null) {
  const ext = (mime?.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  const path = `${restauranteId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const res = await fetch(uri)
  const buf = await res.arrayBuffer()
  const { error } = await supabase.storage.from('produtos').upload(path, buf, { contentType: mime || 'image/jpeg', upsert: false })
  if (error) throw error
  return supabase.storage.from('produtos').getPublicUrl(path).data.publicUrl
}

export function ProdutoForm({
  initial,
  defaultCategoriaId,
  categorias,
  onClose,
  onSaved,
}: {
  initial: Produto | null
  defaultCategoriaId: string | null
  categorias: Categoria[]
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [descricao, setDescricao] = useState(initial?.descricao ?? '')
  const [preco, setPreco] = useState(initial?.preco != null ? fmt.money(initial.preco) : '')
  const [categoriaId, setCategoriaId] = useState<string>(initial?.categoria_id ?? defaultCategoriaId ?? categorias[0]?.id ?? '')
  const [disponivel, setDisponivel] = useState(initial?.disponivel ?? true)
  const [esgotado, setEsgotado] = useState(initial?.esgotado ?? false)
  const [emOferta, setEmOferta] = useState(initial?.em_oferta ?? false)
  const [ofertaPreco, setOfertaPreco] = useState(initial?.oferta_preco != null ? fmt.money(initial.oferta_preco) : '')
  const [novidade, setNovidade] = useState(initial?.novidade ?? false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(initial?.foto_url ?? null)
  const [picked, setPicked] = useState<{ uri: string; mime?: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const restauranteId = initial?.restaurante_id ?? categorias[0]?.restaurante_id ?? null
  const preview = picked?.uri ?? fotoUrl

  const pick = async () => {
    setErr('')
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setErr('Permissão de galeria negada.')
      return
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] })
    if (!r.canceled && r.assets[0]) setPicked({ uri: r.assets[0].uri, mime: r.assets[0].mimeType })
  }

  const submit = async () => {
    if (!nome.trim()) return setErr('Informe o nome.')
    if (!categoriaId) return setErr('Escolha a categoria.')
    const precoNum = fmt.moneyParse(preco)
    if (!Number.isFinite(precoNum) || precoNum <= 0) return setErr('Preço inválido.')
    let ofertaNum: number | null = null
    if (emOferta) {
      ofertaNum = fmt.moneyParse(ofertaPreco)
      if (!Number.isFinite(ofertaNum) || ofertaNum <= 0) return setErr('Preço promocional inválido.')
      if (ofertaNum >= precoNum) return setErr('Promocional deve ser menor que o preço.')
    }
    setBusy(true)
    setErr('')
    try {
      let foto = fotoUrl
      if (picked) {
        if (!restauranteId) throw new Error('Restaurante não definido')
        foto = await uploadFoto(picked.uri, restauranteId, picked.mime)
      }
      const cat = categorias.find((c) => c.id === categoriaId)
      const payload: any = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        preco: precoNum,
        categoria_id: categoriaId,
        categoria: (cat?.nome ?? '').toLowerCase(),
        em_oferta: emOferta,
        oferta_preco: ofertaNum,
        novidade,
        disponivel,
        esgotado,
        foto_url: foto,
      }
      if (initial) {
        const { error } = await supabase.from('produtos').update(payload).eq('id', initial.id)
        if (error) throw error
      } else {
        if (!restauranteId) throw new Error('Restaurante não definido')
        const { error } = await supabase.from('produtos').insert({ ...payload, restaurante_id: restauranteId })
        if (error) throw error
      }
      onSaved()
    } catch (e: any) {
      setErr(e?.message || 'Erro ao salvar.')
      setBusy(false)
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !busy && onClose()}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => !busy && onClose()}>
        <Pressable onPress={() => {}} className="bg-bg" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' }}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
            <Text className="mb-5 font-serif text-xl text-ink">{initial ? 'Editar produto' : 'Novo produto'}</Text>

            <View className="mb-5 flex-row items-center gap-3">
              <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
                {preview ? <Image source={{ uri: preview }} style={{ width: 80, height: 80 }} contentFit="cover" /> : <Text style={{ fontSize: 28 }}>🍽️</Text>}
              </View>
              <View className="flex-1 gap-2">
                <Pressable onPress={pick} className="items-center rounded-xl bg-ink px-3 py-2">
                  <Text className="font-sans-bold text-xs text-bg">{preview ? 'Trocar foto' : 'Adicionar foto'}</Text>
                </Pressable>
                {preview ? (
                  <Pressable onPress={() => { setPicked(null); setFotoUrl(null) }} className="items-center rounded-xl border border-line px-3 py-2">
                    <Text className="text-xs text-accent">Remover foto</Text>
                  </Pressable>
                ) : null}
                <Text className="text-xs text-muted">JPG/PNG/WebP</Text>
              </View>
            </View>

            <FormField label="Nome">
              <TextInput value={nome} onChangeText={(t) => { setNome(t); setErr('') }} placeholder="Nome do produto" placeholderTextColor="#B8B5AB" className="border-b border-line py-3 text-base text-ink" />
            </FormField>
            <FormField label="Descrição">
              <TextInput value={descricao} onChangeText={setDescricao} placeholder="Detalhes curtos" placeholderTextColor="#B8B5AB" className="border-b border-line py-3 text-base text-ink" />
            </FormField>

            <FormField label="Categoria">
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {categorias.map((c) => {
                  const active = categoriaId === c.id
                  return (
                    <Pressable key={c.id} onPress={() => setCategoriaId(c.id)} className="rounded-xl px-3 py-2" style={{ backgroundColor: active ? '#2A2A26' : 'transparent', borderWidth: 1, borderColor: active ? '#2A2A26' : '#DDD9CC' }}>
                      <Text className="text-sm" style={{ color: active ? '#FAF9F5' : '#6B6A62' }}>{c.emoji ? `${c.emoji} ` : ''}{c.nome}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </FormField>

            <FormField label="Preço (R$)">
              <TextInput value={preco} onChangeText={(t) => setPreco(fmt.moneyMask(t))} placeholder="0,00" placeholderTextColor="#B8B5AB" keyboardType="numeric" className="border-b border-line py-3 text-base text-ink" />
            </FormField>

            <View className="mt-4 rounded-xl border border-line bg-surface p-3">
              <Text className="mb-2 text-xs font-sans-bold uppercase text-text-mid">Destaque</Text>
              <ToggleRow label="🆕 Marcar como novidade" value={novidade} onChange={setNovidade} />
              <ToggleRow label="🔥 Em oferta" value={emOferta} onChange={setEmOferta} />
              {emOferta ? (
                <View className="mt-2">
                  <Text className="mb-1 text-xs text-text-mid">Preço promocional (R$)</Text>
                  <TextInput value={ofertaPreco} onChangeText={(t) => setOfertaPreco(fmt.moneyMask(t))} placeholder="0,00" placeholderTextColor="#B8B5AB" keyboardType="numeric" className="border-b border-line py-2 text-base text-ink" />
                </View>
              ) : null}
            </View>

            <View className="mt-3">
              <ToggleRow label="Disponível para venda" value={disponivel} onChange={setDisponivel} />
              <ToggleRow label="Esgotado (sem estoque hoje)" value={esgotado} onChange={setEsgotado} />
            </View>

            <ProdutoGruposSection produtoId={initial?.id} restauranteId={restauranteId} />

            {err ? <Text className="mt-4 text-xs text-accent">{err}</Text> : null}

            <View className="mt-6 flex-row gap-2">
              <Pressable onPress={onClose} disabled={busy} className="flex-1 items-center justify-center rounded-xl border border-line" style={{ minHeight: 48 }}>
                <Text className="text-sm text-text-mid">Cancelar</Text>
              </Pressable>
              <Pressable onPress={submit} disabled={busy} className="flex-row items-center justify-center gap-2 rounded-xl bg-accent" style={{ flex: 2, minHeight: 48 }}>
                {busy ? <><Spinner color="#FAF9F5" /><Text className="font-sans-bold text-sm text-on-accent">Salvando</Text></> : <Text className="font-sans-bold text-sm text-on-accent">Salvar</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="mb-1 text-xs text-text-mid">{label}</Text>
      {children}
    </View>
  )
}
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="flex-1 pr-3 text-sm text-ink">{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#4A5240', false: '#DDD9CC' }} />
    </View>
  )
}
