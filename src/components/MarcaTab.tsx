import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { vars } from 'nativewind'
import { supabase } from '@/lib/supabase/client'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Button } from '@/components/ui/Button'
import { DEFAULT_ACCENT, DEFAULT_PRIMARY, deriveTheme } from '@/lib/theme'

const HEX = /^#[0-9a-fA-F]{6}$/

// Cor padrão dos preços do GetOrder (quando vazio cai no accent → terracota).
const DEFAULT_PRICE = DEFAULT_ACCENT

// Presets tocáveis: paleta GetOrder + alguns tons usuais.
const PRESETS = [
  '#4A5240', // verde oliva (primária GetOrder)
  '#2E3328', // verde escuro
  '#9B4A3C', // terracota (accent GetOrder)
  '#1F2937', // grafite
  '#7C3AED', // roxo
  '#0F766E', // teal
  '#B45309', // âmbar
  '#BE123C', // vinho
]

// Normaliza input do usuário: uppercase, '#' + até 6 hex. Campo VAZIO retorna ''
// (não '#') — apagar tudo volta a cor ao padrão GetOrder (salva null), como na web.
function maskHex(raw: string) {
  const body = raw.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6)
  return body ? `#${body}` : ''
}

async function uploadLogo(uri: string, restauranteId: string, mime?: string | null) {
  const ext = (mime?.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  // A policy do bucket 'logos' EXIGE o path começar por '<restaurante_id>/'.
  const path = `${restauranteId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const res = await fetch(uri)
  const buf = await res.arrayBuffer()
  const { error } = await supabase.storage.from('logos').upload(path, buf, { contentType: mime || 'image/jpeg', upsert: false })
  if (error) throw error
  return supabase.storage.from('logos').getPublicUrl(path).data.publicUrl
}

export function MarcaTab({ restauranteId, onToast }: { restauranteId: string | null; onToast: (m: string) => void }) {
  const { restaurante, refreshRestaurante } = useRestaurante()

  // Estado local editável a partir do restaurante já carregado no provider.
  const [primaria, setPrimaria] = useState(restaurante?.cor_primaria ?? '')
  const [accent, setAccent] = useState(restaurante?.cor_accent ?? '')
  const [preco, setPreco] = useState(restaurante?.cor_preco ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(restaurante?.logo_url ?? null)
  const [picked, setPicked] = useState<{ uri: string; mime?: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const preview = picked?.uri ?? logoUrl
  const nome = restaurante?.nome ?? ''

  const pickLogo = async () => {
    setErr('')
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setErr('Permissão de galeria negada.')
      return
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    if (!r.canceled && r.assets[0]) setPicked({ uri: r.assets[0].uri, mime: r.assets[0].mimeType })
  }

  const removeLogo = () => { setPicked(null); setLogoUrl(null) }
  const usarPadrao = () => { setPrimaria(''); setAccent(''); setPreco(''); setErr('') }

  const save = async () => {
    if (!restauranteId) return
    if (primaria && !HEX.test(primaria)) return setErr('Cor primária inválida (use #RRGGBB).')
    if (accent && !HEX.test(accent)) return setErr('Cor de destaque inválida (use #RRGGBB).')
    if (preco && !HEX.test(preco)) return setErr('Cor dos preços inválida (use #RRGGBB).')
    setBusy(true)
    setErr('')
    try {
      let logo = logoUrl
      if (picked) {
        logo = await uploadLogo(picked.uri, restauranteId, picked.mime)
      }
      const { error } = await supabase
        .from('restaurantes')
        .update({
          cor_primaria: primaria || null,
          cor_accent: accent || null,
          cor_preco: preco || null,
          logo_url: logo,
        })
        .eq('id', restauranteId)
      if (error) throw error
      setLogoUrl(logo)
      setPicked(null)
      await refreshRestaurante() // ThemeProvider repinta o app todo
      onToast('Marca salva')
    } catch (e: any) {
      onToast(e?.message || 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  // Previews repintam ao vivo a partir do state local (null quando vazio → defaults).
  // useMemo (auditoria item 13): só recalcula quando alguma cor muda.
  const lightTokens = useMemo(() => deriveTheme(primaria || null, accent || null, preco || null), [primaria, accent, preco])
  const darkTokens = useMemo(() => deriveTheme(primaria || null, accent || null, preco || null, { dark: true }), [primaria, accent, preco])

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Logo */}
      <View className="rounded-xl border border-line bg-surface p-4">
        <Text className="mb-3 text-xs font-sans-bold uppercase text-text-mid">Logo</Text>
        <View className="flex-row items-center gap-3">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-line bg-bg">
            {preview ? (
              <Image source={{ uri: preview }} style={{ width: 80, height: 80 }} contentFit="contain" />
            ) : (
              <Text style={{ fontSize: 28 }}>🏷️</Text>
            )}
          </View>
          <View className="flex-1 gap-2">
            <Pressable onPress={pickLogo} className="items-center rounded-xl bg-ink px-3 py-2">
              <Text className="font-sans-bold text-xs text-bg">{preview ? 'Trocar logo' : 'Adicionar logo'}</Text>
            </Pressable>
            {preview ? (
              <Pressable onPress={removeLogo} className="items-center rounded-xl border border-line px-3 py-2">
                <Text className="text-xs text-accent">Remover logo</Text>
              </Pressable>
            ) : null}
            <Text className="text-xs text-muted">PNG/JPG/WebP</Text>
          </View>
        </View>
      </View>

      {/* Cores */}
      <View className="mt-4 rounded-xl border border-line bg-surface p-4">
        <Text className="mb-3 text-xs font-sans-bold uppercase text-text-mid">Cores da marca</Text>

        <ColorField
          label="Cor primária"
          value={primaria}
          fallback={DEFAULT_PRIMARY}
          onChange={(v) => { setPrimaria(v); setErr('') }}
        />
        <View className="mt-4">
          <ColorField
            label="Cor de destaque (botões / CTAs)"
            value={accent}
            fallback={DEFAULT_ACCENT}
            onChange={(v) => { setAccent(v); setErr('') }}
          />
        </View>
        <View className="mt-4">
          <ColorField
            label="Cor dos preços"
            value={preco}
            fallback={accent && HEX.test(accent) ? accent : DEFAULT_PRICE}
            onChange={(v) => { setPreco(v); setErr('') }}
          />
          <Text className="mt-1 text-xs text-muted">Vazio = usa a cor de destaque.</Text>
        </View>

        {(primaria || accent || preco) ? (
          <Pressable onPress={usarPadrao} className="mt-4 self-start">
            <Text className="text-xs text-text-mid underline">Usar cores padrão GetOrder</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Pré-visualização ao vivo */}
      <View className="mt-4 rounded-xl border border-line bg-surface p-4">
        <Text className="mb-3 text-xs font-sans-bold uppercase text-text-mid">Pré-visualização</Text>

        <Text className="mb-2 text-xs text-text-mid">Cardápio do cliente</Text>
        <View style={vars(lightTokens)} className="overflow-hidden rounded-xl border border-line bg-bg p-3">
          <View className="mb-3 flex-row items-center gap-2">
            {preview ? (
              <Image source={{ uri: preview }} style={{ width: 22, height: 22, borderRadius: 11 }} contentFit="contain" />
            ) : (
              <Text className="font-sans-bold text-sm text-ink">{nome || 'Seu restaurante'}</Text>
            )}
            <Text className="text-xs text-muted">via GetOrder</Text>
          </View>
          <View className="mb-3 rounded-xl border border-line bg-surface p-3">
            <Text className="font-sans-bold text-sm text-ink">Produto exemplo</Text>
            <Text className="font-serif text-lg text-price">R$ 18,00</Text>
          </View>
          <View className="items-center justify-center rounded-lg bg-accent" style={{ minHeight: 44 }}>
            <Text className="font-sans-bold text-sm text-on-accent">Adicionar ao pedido</Text>
          </View>
        </View>

        <Text className="mb-2 mt-4 text-xs text-text-mid">Cozinha (tema escuro)</Text>
        <View style={vars(darkTokens)} className="overflow-hidden rounded-xl bg-primary-dk p-4">
          <Text className="mb-2 font-sans-bold text-sm" style={{ color: '#F2F0E8' }}>Mesa 5</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs" style={{ color: 'rgba(242,240,232,0.85)' }}>1× Produto exemplo</Text>
            <View className="rounded-lg bg-accent px-3 py-1">
              <Text className="font-sans-bold text-xs text-on-accent">Pronto</Text>
            </View>
          </View>
        </View>
      </View>

      {err ? <Text className="mt-4 text-xs text-accent">{err}</Text> : null}

      <View className="mt-4">
        <Button label="Salvar marca" onPress={save} loading={busy} />
      </View>
    </ScrollView>
  )
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string
  value: string
  fallback: string
  onChange: (v: string) => void
}) {
  const valid = HEX.test(value)
  const swatch = valid ? value : fallback
  return (
    <View>
      <Text className="mb-1 text-xs text-text-mid">{label}</Text>
      <View className="flex-row items-center gap-3">
        <View
          className="rounded-lg border border-line"
          style={{ width: 36, height: 36, backgroundColor: swatch }}
        />
        <TextInput
          value={value}
          onChangeText={(t) => onChange(maskHex(t))}
          placeholder={`${fallback} (padrão)`}
          placeholderTextColor="#B8B5AB"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          className="flex-1 border-b border-line py-2 text-base text-ink"
        />
      </View>
      <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
        {PRESETS.map((p) => {
          const active = value.toUpperCase() === p.toUpperCase()
          return (
            <Pressable
              key={p}
              onPress={() => onChange(p.toUpperCase())}
              className="rounded-lg"
              style={{
                width: 28,
                height: 28,
                backgroundColor: p,
                borderWidth: active ? 2 : 1,
                borderColor: active ? '#2A2A26' : '#DDD9CC',
              }}
            />
          )
        })}
      </View>
    </View>
  )
}
