import { useMemo, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Header } from '@/components/ui/Header'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Toast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { ProdutoForm } from '@/components/ProdutoForm'
import { GrupoForm } from '@/components/GrupoForm'
import { useProdutos, useCategorias } from '@/lib/hooks/useCardapio'
import { useCategoriasAdmin } from '@/lib/hooks/useCategoriasAdmin'
import { useAdicionais } from '@/lib/hooks/useAdicionais'
import { resumoRegra } from '@/lib/adicionaisRegra'
import { fmt } from '@/lib/formatters'
import { thumb } from '@/lib/img'
import type { Categoria, GrupoAdicional, Produto } from '@/types'

export default function Cardapio() {
  const { signOut } = useRestaurante()
  const [tab, setTab] = useState<'produtos' | 'categorias' | 'adicionais'>('produtos')
  const [toast, setToast] = useState({ visible: false, message: '' })
  const showToast = (message: string) => setToast({ visible: true, message })

  const TAB_LABEL: Record<'produtos' | 'categorias' | 'adicionais', string> = { produtos: 'Produtos', categorias: 'Categorias', adicionais: 'Adicionais' }

  return (
    <Screen className="px-5">
      <Header title="Cardápio" subtitle="Admin" onSair={() => signOut()} />
      <View className="mb-3 flex-row gap-2">
        {(['produtos', 'categorias', 'adicionais'] as const).map((t) => {
          const active = tab === t
          return (
            <Pressable key={t} testID={`cardapio-tab-${t}`} onPress={() => setTab(t)} className="rounded-xl px-4 py-2" style={{ backgroundColor: active ? '#2A2A26' : 'transparent', borderWidth: 1, borderColor: active ? '#2A2A26' : '#DDD9CC' }}>
              <Text className="text-sm" style={{ color: active ? '#FAF9F5' : '#6B6A62', fontWeight: active ? '700' : '400' }}>{TAB_LABEL[t]}</Text>
            </Pressable>
          )
        })}
      </View>

      {tab === 'produtos' ? <ProdutosTab onToast={showToast} /> : tab === 'categorias' ? <CategoriasTab onToast={showToast} /> : <AdicionaisTab onToast={showToast} />}

      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
    </Screen>
  )
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="rounded-full px-2 py-1" style={{ borderWidth: 1, borderColor: active ? '#567D4F' : '#DDD9CC' }}>
      <Text className="text-[11px]" style={{ color: active ? '#567D4F' : '#B8B5AB' }}>{label}</Text>
    </Pressable>
  )
}

function ProdutosTab({ onToast }: { onToast: (m: string) => void }) {
  const qc = useQueryClient()
  const { restauranteId } = useRestaurante()
  const { data: produtos = [], isLoading, isError, refetch } = useProdutos(restauranteId)
  const { data: categorias = [] } = useCategorias(restauranteId)
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [editing, setEditing] = useState<Produto | null>(null)
  const [creating, setCreating] = useState(false)

  const currentCat = activeCat ?? categorias[0]?.id ?? null
  const byCat = useMemo(() => produtos.filter((p) => p.categoria_id === currentCat), [produtos, currentCat])

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Produto> }) => {
      const { error } = await supabase.from('produtos').update(input.patch).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos', restauranteId] }),
  })
  const remove = useMutation({
    mutationFn: async (p: Produto) => {
      const { error } = await supabase.from('produtos').delete().eq('id', p.id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produtos', restauranteId] }); onToast('Produto removido') },
    onError: (e: any) => onToast(e?.message || 'Erro ao remover'),
  })

  return (
    <View className="flex-1">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs text-text-mid">Cadastro de produtos</Text>
        <Pressable onPress={() => setCreating(true)} className="rounded-lg bg-ink px-3 py-2"><Text className="font-sans-bold text-xs text-bg">+ Novo</Text></Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 flex-grow-0" contentContainerStyle={{ gap: 16 }}>
        {categorias.length === 0 ? <Text className="py-2 text-xs text-muted">Crie uma categoria primeiro</Text> : null}
        {categorias.map((c) => {
          const active = currentCat === c.id
          return (
            <Pressable key={c.id} onPress={() => setActiveCat(c.id)} className="py-2" style={{ borderBottomWidth: 2, borderBottomColor: active ? '#2A2A26' : 'transparent' }}>
              <Text className="text-sm" style={{ color: active ? '#2A2A26' : '#B8B5AB', fontWeight: active ? '700' : '400' }}>{c.emoji ? `${c.emoji} ` : ''}{c.nome}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {isLoading ? (
        <View className="py-16 items-center"><Spinner color="#9B4A3C" /></View>
      ) : isError ? (
        <EmptyState icon="⚠️" title="Erro ao carregar" action={<Pressable onPress={() => refetch()}><Text className="text-sm text-accent underline">Tentar novamente</Text></Pressable>} />
      ) : byCat.length === 0 ? (
        <EmptyState icon="🍽️" title="Sem produtos nesta categoria" />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="gap-2">
            {byCat.map((p) => (
              <View key={p.id} className="flex-row items-start gap-3 rounded-xl border border-line bg-surface p-3">
                <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-line bg-bg">
                  {p.foto_url ? <Image source={{ uri: thumb(p.foto_url, 112) }} style={{ width: 56, height: 56 }} contentFit="cover" /> : <Text style={{ fontSize: 22 }}>🍽️</Text>}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-sans-bold text-sm text-ink" numberOfLines={1}>{p.nome}</Text>
                  <Text className="text-xs text-text-mid" numberOfLines={1}>{p.descricao || '—'}</Text>
                  <View className="mt-1 flex-row items-baseline gap-2">
                    {p.em_oferta && p.oferta_preco != null ? <Text className="text-xs text-muted line-through">{fmt.currency(p.preco)}</Text> : null}
                    <Text className="text-sm font-sans-bold text-accent">{fmt.currency(p.em_oferta && p.oferta_preco != null ? p.oferta_preco : p.preco)}</Text>
                  </View>
                  <View className="mt-2 flex-row flex-wrap" style={{ gap: 4 }}>
                    <Pill label={p.disponivel ? 'Disponível' : 'Indisponível'} active={p.disponivel} onPress={() => update.mutate({ id: p.id, patch: { disponivel: !p.disponivel } })} />
                    <Pill label="Esgotado" active={p.esgotado} onPress={() => update.mutate({ id: p.id, patch: { esgotado: !p.esgotado } })} />
                    <Pill label="Novidade" active={p.novidade} onPress={() => update.mutate({ id: p.id, patch: { novidade: !p.novidade } })} />
                    <Pill label="Oferta" active={p.em_oferta} onPress={() => update.mutate({ id: p.id, patch: { em_oferta: !p.em_oferta, ...(p.em_oferta ? { oferta_preco: null } : {}) } })} />
                  </View>
                </View>
                <View className="items-end gap-1">
                  <Pressable onPress={() => setEditing(p)} className="rounded-lg border border-line px-2 py-1"><Text className="text-xs text-text-mid">Editar</Text></Pressable>
                  <Pressable onPress={() => Alert.alert('Remover', `Remover "${p.nome}"?`, [{ text: 'Cancelar' }, { text: 'Remover', style: 'destructive', onPress: () => remove.mutate(p) }])} className="rounded-lg border border-line px-2 py-1"><Text className="text-xs text-accent">Excluir</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {creating || editing ? (
        <ProdutoForm
          initial={editing}
          defaultCategoriaId={currentCat}
          categorias={categorias}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={() => { setEditing(null); setCreating(false); qc.invalidateQueries({ queryKey: ['produtos', restauranteId] }); onToast('Produto salvo') }}
        />
      ) : null}
    </View>
  )
}

function CategoriasTab({ onToast }: { onToast: (m: string) => void }) {
  const { restauranteId } = useRestaurante()
  const { data: categorias = [], isLoading, isError, refetch, upsert, remove } = useCategoriasAdmin(restauranteId)
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [creating, setCreating] = useState(false)

  const moveOrdem = async (cat: Categoria, dir: -1 | 1) => {
    const sorted = [...categorias].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
    const idx = sorted.findIndex((c) => c.id === cat.id)
    const swap = sorted[idx + dir]
    if (!swap) return
    try {
      await upsert.mutateAsync({ id: cat.id, nome: cat.nome, emoji: cat.emoji, ordem: swap.ordem, ativa: cat.ativa })
      await upsert.mutateAsync({ id: swap.id, nome: swap.nome, emoji: swap.emoji, ordem: cat.ordem, ativa: swap.ativa })
    } catch (e: any) {
      onToast(e?.message || 'Erro ao reordenar.')
    }
  }

  return (
    <View className="flex-1">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs text-text-mid">Categorias do restaurante</Text>
        <Pressable onPress={() => setCreating(true)} className="rounded-lg bg-ink px-3 py-2"><Text className="font-sans-bold text-xs text-bg">+ Nova</Text></Pressable>
      </View>

      {isLoading ? (
        <View className="py-16 items-center"><Spinner color="#9B4A3C" /></View>
      ) : isError ? (
        <EmptyState icon="⚠️" title="Erro ao carregar" action={<Pressable onPress={() => refetch()}><Text className="text-sm text-accent underline">Tentar novamente</Text></Pressable>} />
      ) : categorias.length === 0 ? (
        <EmptyState icon="🏷️" title="Sem categorias" description="Crie sua primeira categoria." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="gap-2">
            {categorias.map((c, i) => (
              <View key={c.id} className="flex-row items-center gap-3 rounded-xl border border-line bg-surface p-3">
                <View>
                  <Pressable onPress={() => moveOrdem(c, -1)} disabled={i === 0} className="h-7 w-7 items-center justify-center rounded-md border border-line"><Text style={{ color: i === 0 ? '#B8B5AB' : '#2A2A26' }}>▲</Text></Pressable>
                  <Pressable onPress={() => moveOrdem(c, 1)} disabled={i === categorias.length - 1} className="mt-1 h-7 w-7 items-center justify-center rounded-md border border-line"><Text style={{ color: i === categorias.length - 1 ? '#B8B5AB' : '#2A2A26' }}>▼</Text></Pressable>
                </View>
                <View className="h-10 w-10 items-center justify-center rounded-lg border border-line bg-bg"><Text style={{ fontSize: 18 }}>{c.emoji ?? '🏷️'}</Text></View>
                <View className="min-w-0 flex-1">
                  <Text className="font-sans-bold text-sm text-ink" numberOfLines={1}>{c.nome}</Text>
                  <Text className="text-xs text-text-mid">Ordem {c.ordem}</Text>
                </View>
                <Pressable onPress={() => upsert.mutate({ id: c.id, nome: c.nome, emoji: c.emoji, ordem: c.ordem, ativa: !c.ativa })} className="rounded-full px-2 py-1" style={{ borderWidth: 1, borderColor: c.ativa ? '#567D4F' : '#B8B5AB' }}>
                  <Text className="text-xs" style={{ color: c.ativa ? '#567D4F' : '#B8B5AB' }}>{c.ativa ? 'Ativa' : 'Inativa'}</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(c)} className="rounded-xl border border-line px-2 py-2"><Text className="text-xs text-text-mid">Editar</Text></Pressable>
                <Pressable
                  onPress={() => Alert.alert('Excluir', `Excluir "${c.nome}"?`, [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: async () => {
                    try { await remove.mutateAsync(c.id); onToast('Categoria excluída') } catch (e: any) { onToast(/foreign/.test(e?.message ?? '') ? 'Há produtos vinculados a esta categoria.' : (e?.message || 'Erro ao excluir')) }
                  } }])}
                  className="rounded-xl border border-line px-2 py-2"
                >
                  <Text className="text-xs text-accent">Excluir</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {creating || editing ? (
        <CategoriaForm
          initial={editing}
          nextOrdem={Math.max(0, ...categorias.map((c) => c.ordem)) + 1}
          busy={upsert.isPending}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSubmit={async (d) => {
            try { await upsert.mutateAsync({ id: editing?.id, ...d }); setEditing(null); setCreating(false); onToast('Categoria salva') } catch (e: any) { onToast(e?.message || 'Erro ao salvar') }
          }}
        />
      ) : null}
    </View>
  )
}

function CategoriaForm({ initial, nextOrdem, busy, onClose, onSubmit }: { initial: Categoria | null; nextOrdem: number; busy: boolean; onClose: () => void; onSubmit: (d: { nome: string; emoji: string | null; ordem: number; ativa: boolean }) => void }) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '')
  const [ordem, setOrdem] = useState((initial?.ordem ?? nextOrdem).toString())
  const [ativa, setAtiva] = useState(initial?.ativa ?? true)
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !busy && onClose()}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => !busy && onClose()}>
        <Pressable onPress={() => {}} className="bg-bg px-6 pb-8 pt-6" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <Text className="mb-5 font-serif text-xl text-ink">{initial ? 'Editar categoria' : 'Nova categoria'}</Text>
          <View className="flex-row gap-3">
            <View style={{ width: 72 }}>
              <Text className="mb-1 text-xs text-text-mid">Emoji</Text>
              <TextInput value={emoji} onChangeText={setEmoji} placeholder="🍽️" placeholderTextColor="#B8B5AB" className="border-b border-line py-3 text-center text-2xl" />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-xs text-text-mid">Nome</Text>
              <TextInput value={nome} onChangeText={setNome} placeholder="Bebidas" placeholderTextColor="#B8B5AB" className="border-b border-line py-3 text-base text-ink" />
            </View>
          </View>
          <View className="mt-4">
            <Text className="mb-1 text-xs text-text-mid">Ordem</Text>
            <TextInput value={ordem} onChangeText={(t) => setOrdem(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" className="border-b border-line py-3 text-base text-ink" />
          </View>
          <View className="mt-5 flex-row items-center justify-between">
            <Text className="flex-1 pr-3 text-sm text-ink">Categoria ativa (visível no cardápio)</Text>
            <Switch value={ativa} onValueChange={setAtiva} trackColor={{ true: '#4A5240', false: '#DDD9CC' }} />
          </View>
          <View className="mt-6 flex-row gap-2">
            <Pressable onPress={onClose} disabled={busy} className="flex-1 items-center justify-center rounded-xl border border-line" style={{ minHeight: 48 }}><Text className="text-sm text-text-mid">Cancelar</Text></Pressable>
            <View style={{ flex: 2 }}>
              <Button label="Salvar" onPress={() => onSubmit({ nome: nome.trim(), emoji: emoji.trim() || null, ordem: parseInt(ordem || '0', 10) || 0, ativa })} loading={busy} disabled={!nome.trim()} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function AdicionaisTab({ onToast }: { onToast: (m: string) => void }) {
  const { restauranteId } = useRestaurante()
  const { data: grupos = [], isLoading, isError, refetch, salvarGrupo, patchGrupo, removeGrupo, contarVinculados } = useAdicionais(restauranteId)
  const [editing, setEditing] = useState<GrupoAdicional | null>(null)
  const [creating, setCreating] = useState(false)

  const excluir = (g: GrupoAdicional) => {
    contarVinculados(g.id).then((n) => {
      Alert.alert(
        'Excluir grupo',
        n > 0 ? `Este grupo será removido de ${n} produto(s). Excluir "${g.nome}"?` : `Excluir "${g.nome}"?`,
        [
          { text: 'Cancelar' },
          { text: 'Excluir', style: 'destructive', onPress: async () => { try { await removeGrupo.mutateAsync(g.id); onToast('Grupo excluído') } catch (e: any) { onToast(e?.message || 'Erro ao excluir') } } },
        ],
      )
    })
  }

  return (
    <View className="flex-1">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs text-text-mid">Grupos reutilizáveis de adicionais</Text>
        <Pressable testID="adicional-novo" onPress={() => setCreating(true)} className="rounded-lg bg-ink px-3 py-2"><Text className="font-sans-bold text-xs text-bg">+ Novo grupo</Text></Pressable>
      </View>

      {isLoading ? (
        <View className="py-16 items-center"><Spinner color="#9B4A3C" /></View>
      ) : isError ? (
        <EmptyState icon="⚠️" title="Erro ao carregar" action={<Pressable onPress={() => refetch()}><Text className="text-sm text-accent underline">Tentar novamente</Text></Pressable>} />
      ) : grupos.length === 0 ? (
        <EmptyState icon="🧩" title="Nenhum grupo de adicionais" description="Crie grupos (ex.: Ponto da carne, Adicionais) e vincule-os aos produtos." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="gap-2">
            {grupos.map((g) => (
              <View key={g.id} className="rounded-xl border border-line bg-surface p-3">
                <View className="flex-row items-start justify-between">
                  <View className="min-w-0 flex-1 pr-2">
                    <Text className="font-sans-bold text-sm text-ink" numberOfLines={1}>{g.nome}</Text>
                    <Text className="text-xs text-text-mid">{resumoRegra(g)}</Text>
                  </View>
                  <Pressable onPress={() => patchGrupo.mutate({ id: g.id, patch: { ativo: !g.ativo } })} className="rounded-full px-2 py-1" style={{ borderWidth: 1, borderColor: g.ativo ? '#567D4F' : '#B8B5AB' }}>
                    <Text className="text-xs" style={{ color: g.ativo ? '#567D4F' : '#B8B5AB' }}>{g.ativo ? 'Ativo' : 'Inativo'}</Text>
                  </Pressable>
                </View>
                {(g.adicionais ?? []).length > 0 ? (
                  <View className="mt-2 flex-row flex-wrap" style={{ gap: 4 }}>
                    {(g.adicionais ?? []).map((a) => (
                      <View key={a.id} className="rounded-full border border-line px-2 py-0.5" style={{ opacity: a.disponivel ? 1 : 0.5 }}>
                        <Text className="text-[11px] text-text-mid">{a.nome} · {a.preco > 0 ? fmt.currency(a.preco) : 'grátis'}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <View className="mt-3 flex-row gap-2">
                  <Pressable onPress={() => setEditing(g)} className="flex-1 items-center rounded-lg border border-line py-2"><Text className="text-xs text-text-mid">Editar</Text></Pressable>
                  <Pressable onPress={() => excluir(g)} className="flex-1 items-center rounded-lg border border-line py-2"><Text className="text-xs text-accent">Excluir</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {creating || editing ? (
        <GrupoForm
          initial={editing}
          busy={salvarGrupo.isPending}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSubmit={async (input) => {
            try { await salvarGrupo.mutateAsync(input); setEditing(null); setCreating(false); onToast('Grupo salvo') } catch (e: any) { onToast(e?.message || 'Erro ao salvar') }
          }}
        />
      ) : null}
    </View>
  )
}
