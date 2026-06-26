import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Header } from '@/components/ui/Header'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Toast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { useUsuarios, gerarSenhaForte } from '@/lib/hooks/useUsuarios'
import type { Role, UsuarioEquipe } from '@/types'

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  garcom: 'Garçom',
  cozinha: 'Cozinha',
}

const GERENCIAVEL = (r: Role) => r === 'garcom' || r === 'cozinha'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Equipe() {
  const { email: myEmail, signOut } = useRestaurante()
  const { list, criar, patch } = useUsuarios()
  const { data: usuarios = [], isLoading, isError, error, refetch } = list

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<UsuarioEquipe | null>(null)
  const [senhaDe, setSenhaDe] = useState<UsuarioEquipe | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '' })

  const showToast = (message: string) => setToast({ visible: true, message })

  const handleCriar = (d: CriarData) => {
    criar.mutate(d, {
      onSuccess: () => { setCreating(false); showToast('Usuário criado') },
      onError: (e: any) => showToast(e?.message || 'Erro ao criar usuário'),
    })
  }

  const handleEditarNome = (nome: string) => {
    if (!editing) return
    patch.mutate(
      { id: editing.id, action: 'update_nome', nome },
      {
        onSuccess: () => { setEditing(null); showToast('Nome atualizado') },
        onError: (e: any) => showToast(e?.message || 'Erro ao salvar'),
      },
    )
  }

  const handleTrocarFuncao = (u: UsuarioEquipe, role: Role) => {
    if (role === u.role) return
    patch.mutate(
      { id: u.id, action: 'change_role', role },
      {
        onSuccess: () => showToast(`Função alterada para ${ROLE_LABEL[role]}`),
        onError: (e: any) => showToast(e?.message || 'Erro ao trocar função'),
      },
    )
  }

  const handleSenha = (password: string) => {
    if (!senhaDe) return
    patch.mutate(
      { id: senhaDe.id, action: 'reset_password', password },
      {
        onSuccess: () => { setSenhaDe(null); showToast('Senha redefinida') },
        onError: (e: any) => showToast(e?.message || 'Erro ao redefinir senha'),
      },
    )
  }

  const confirmToggleAtivo = (u: UsuarioEquipe) => {
    const desativar = u.ativo
    Alert.alert(
      desativar ? 'Desativar usuário' : 'Reativar usuário',
      desativar
        ? `${u.nome || u.email} não poderá mais entrar no sistema.`
        : `${u.nome || u.email} poderá entrar novamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: desativar ? 'Desativar' : 'Reativar',
          style: desativar ? 'destructive' : 'default',
          onPress: () =>
            patch.mutate(
              { id: u.id, action: desativar ? 'deactivate' : 'reactivate' },
              {
                onSuccess: () => showToast(desativar ? 'Usuário desativado' : 'Usuário reativado'),
                onError: (e: any) => showToast(e?.message || 'Erro ao atualizar'),
              },
            ),
        },
      ],
    )
  }

  const novoBtn = (
    <Pressable onPress={() => setCreating(true)} className="rounded-lg bg-ink px-3" style={{ minHeight: 48, justifyContent: 'center' }}>
      <Text className="font-sans-bold text-xs text-bg">+ Novo</Text>
    </Pressable>
  )

  return (
    <Screen className="px-5">
      <Header title="Equipe" subtitle="Admin" right={novoBtn} onSair={() => signOut()} />

      {isLoading ? (
        <View className="py-16 items-center"><Spinner color="#9B4A3C" /></View>
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Erro ao carregar"
          description={(error as any)?.message || 'Não foi possível carregar a equipe.'}
          action={
            <Pressable onPress={() => refetch()}>
              <Text className="text-sm text-accent underline">Tentar novamente</Text>
            </Pressable>
          }
        />
      ) : usuarios.length === 0 ? (
        <EmptyState icon="👥" title="Nenhum usuário" description="Crie o primeiro garçom ou cozinha." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="gap-2">
            {usuarios.map((u) => {
              const ehVoce = !!myEmail && u.email === myEmail
              const editavel = GERENCIAVEL(u.role) && !ehVoce
              return (
                <View key={u.id} className="rounded-xl border border-line bg-surface p-4" style={{ opacity: u.ativo ? 1 : 0.6 }}>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans-bold text-sm text-ink" numberOfLines={1} style={u.ativo ? undefined : { textDecorationLine: 'line-through' }}>
                        {u.nome || u.email || '—'}
                      </Text>
                      {u.email ? (
                        <Text className="text-xs text-text-mid" numberOfLines={1}>{u.email}</Text>
                      ) : null}
                    </View>
                    <View className="shrink-0 items-end gap-1">
                      <View className="rounded-full px-2 py-0.5" style={{ borderWidth: 1, borderColor: '#DDD9CC' }}>
                        <Text className="text-xs text-text-mid">{ehVoce ? 'Você' : ROLE_LABEL[u.role]}</Text>
                      </View>
                      <View className="rounded-full px-2 py-0.5" style={{ borderWidth: 1, borderColor: u.ativo ? '#567D4F' : '#B8B5AB' }}>
                        <Text className="text-xs" style={{ color: u.ativo ? '#567D4F' : '#B8B5AB' }}>{u.ativo ? 'Ativo' : 'Inativo'}</Text>
                      </View>
                    </View>
                  </View>

                  {editavel ? (
                    <View className="mt-3 gap-2">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs font-sans-bold uppercase text-text-mid">Função</Text>
                        {(['garcom', 'cozinha'] as Role[]).map((r) => {
                          const active = u.role === r
                          return (
                            <Pressable
                              key={r}
                              onPress={() => handleTrocarFuncao(u, r)}
                              disabled={patch.isPending}
                              className="rounded-full px-3 py-1"
                              style={{ backgroundColor: active ? '#2A2A26' : 'transparent', borderWidth: 1, borderColor: active ? '#2A2A26' : '#DDD9CC' }}
                            >
                              <Text className="text-xs" style={{ color: active ? '#FAF9F5' : '#6B6A62', fontWeight: active ? '700' : '400' }}>{ROLE_LABEL[r]}</Text>
                            </Pressable>
                          )
                        })}
                      </View>
                      <View className="flex-row gap-2">
                        <Pressable onPress={() => setEditing(u)} className="rounded-xl border border-line px-3 py-2">
                          <Text className="text-xs text-text-mid">Editar nome</Text>
                        </Pressable>
                        <Pressable onPress={() => setSenhaDe(u)} className="rounded-xl border border-line px-3 py-2">
                          <Text className="text-xs text-text-mid">Resetar senha</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => confirmToggleAtivo(u)}
                          className="ml-auto rounded-xl px-3 py-2"
                          style={{ borderWidth: 1, borderColor: u.ativo ? '#9B4A3C' : '#567D4F' }}
                        >
                          <Text className="text-xs" style={{ color: u.ativo ? '#9B4A3C' : '#567D4F' }}>{u.ativo ? 'Desativar' : 'Reativar'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        </ScrollView>
      )}

      {creating ? (
        <CriarForm busy={criar.isPending} onClose={() => setCreating(false)} onSubmit={handleCriar} />
      ) : null}

      {editing ? (
        <EditarNomeForm usuario={editing} busy={patch.isPending} onClose={() => setEditing(null)} onSubmit={handleEditarNome} />
      ) : null}

      {senhaDe ? (
        <SenhaForm usuario={senhaDe} busy={patch.isPending} onClose={() => setSenhaDe(null)} onSubmit={handleSenha} />
      ) : null}

      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
    </Screen>
  )
}

// ── Bottom-sheet base (padrão MesaForm/ProdutoForm) ─────────────────
function Sheet({ title, busy, onClose, children }: { title: string; busy: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => !busy && onClose()}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => !busy && onClose()}>
          <Pressable onPress={() => {}} className="bg-bg px-6 pb-8 pt-6" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
            <Text className="mb-5 font-serif text-xl text-ink">{title}</Text>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function SenhaInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View className="flex-row items-center gap-2">
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="••••••••"
        placeholderTextColor="#B8B5AB"
        autoCapitalize="none"
        autoCorrect={false}
        className="flex-1 border-b border-line py-3 text-base text-ink"
      />
      <Pressable onPress={() => onChange(gerarSenhaForte())} className="shrink-0 rounded-xl border border-line px-3 py-2">
        <Text className="text-xs text-accent">Gerar</Text>
      </Pressable>
    </View>
  )
}

function Acoes({ busy, podeSalvar, onClose, onSubmit, label = 'Salvar' }: { busy: boolean; podeSalvar: boolean; onClose: () => void; onSubmit: () => void; label?: string }) {
  return (
    <View className="mt-6 flex-row gap-2">
      <Pressable onPress={() => !busy && onClose()} disabled={busy} className="flex-1 items-center justify-center rounded-xl border border-line" style={{ minHeight: 48 }}>
        <Text className="text-sm text-text-mid">Cancelar</Text>
      </Pressable>
      <View style={{ flex: 2 }}>
        <Button label={label} onPress={onSubmit} loading={busy} disabled={!podeSalvar} />
      </View>
    </View>
  )
}

// ── Criar usuário ───────────────────────────────────────────────────
type CriarData = { nome: string; email: string; password: string; role: Role }

function CriarForm({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (d: CriarData) => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('garcom')
  const [erro, setErro] = useState('')

  const podeSalvar = nome.trim().length > 0 && EMAIL_RE.test(email.trim()) && password.length >= 8

  const submit = () => {
    const n = nome.trim()
    const e = email.trim()
    if (!n) return setErro('Informe o nome.')
    if (!EMAIL_RE.test(e)) return setErro('E-mail inválido.')
    if (password.length < 8) return setErro('A senha precisa de ao menos 8 caracteres.')
    if (role !== 'garcom' && role !== 'cozinha') return setErro('Função inválida.')
    setErro('')
    onSubmit({ nome: n, email: e, password, role })
  }

  return (
    <Sheet title="Novo usuário" busy={busy} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="mb-1 text-xs text-text-mid">Nome</Text>
        <TextInput value={nome} onChangeText={setNome} placeholder="Ex.: Ana Paula" placeholderTextColor="#B8B5AB" className="mb-4 border-b border-line py-3 text-base text-ink" />

        <Text className="mb-1 text-xs text-text-mid">E-mail</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="garcom@restaurante.com" placeholderTextColor="#B8B5AB" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" className="mb-4 border-b border-line py-3 text-base text-ink" />

        <Text className="mb-1 text-xs text-text-mid">Função</Text>
        <View className="mb-4 flex-row gap-2">
          {(['garcom', 'cozinha'] as Role[]).map((r) => {
            const active = role === r
            return (
              <Pressable key={r} onPress={() => setRole(r)} className="flex-1 items-center rounded-xl py-2" style={{ backgroundColor: active ? '#2A2A26' : 'transparent', borderWidth: 1, borderColor: active ? '#2A2A26' : '#DDD9CC' }}>
                <Text className="text-sm" style={{ color: active ? '#FAF9F5' : '#6B6A62', fontWeight: active ? '700' : '400' }}>{ROLE_LABEL[r]}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text className="mb-1 text-xs text-text-mid">Senha inicial (mín. 8)</Text>
        <SenhaInput value={password} onChange={setPassword} />

        {erro ? <Text className="mt-3 text-xs text-accent">{erro}</Text> : null}

        <Acoes busy={busy} podeSalvar={podeSalvar} onClose={onClose} onSubmit={submit} label="Criar" />
      </ScrollView>
    </Sheet>
  )
}

// ── Editar nome ─────────────────────────────────────────────────────
function EditarNomeForm({ usuario, busy, onClose, onSubmit }: { usuario: UsuarioEquipe; busy: boolean; onClose: () => void; onSubmit: (nome: string) => void }) {
  const [nome, setNome] = useState(usuario.nome ?? '')
  const podeSalvar = nome.trim().length > 0
  return (
    <Sheet title="Editar nome" busy={busy} onClose={onClose}>
      <Text className="mb-4 text-sm text-text-mid">{usuario.email}</Text>
      <Text className="mb-1 text-xs text-text-mid">Nome</Text>
      <TextInput value={nome} onChangeText={setNome} placeholder="Ex.: Ana Paula" placeholderTextColor="#B8B5AB" className="border-b border-line py-3 text-base text-ink" />
      <Acoes busy={busy} podeSalvar={podeSalvar} onClose={onClose} onSubmit={() => onSubmit(nome.trim())} />
    </Sheet>
  )
}

// ── Resetar senha ───────────────────────────────────────────────────
function SenhaForm({ usuario, busy, onClose, onSubmit }: { usuario: UsuarioEquipe; busy: boolean; onClose: () => void; onSubmit: (password: string) => void }) {
  const [password, setPassword] = useState('')
  return (
    <Sheet title="Resetar senha" busy={busy} onClose={onClose}>
      <Text className="mb-4 text-sm text-text-mid">
        Nova senha para <Text className="text-ink">{usuario.nome || usuario.email}</Text>.
      </Text>
      <Text className="mb-1 text-xs text-text-mid">Nova senha (mín. 8)</Text>
      <SenhaInput value={password} onChange={setPassword} />
      <Acoes busy={busy} podeSalvar={password.length >= 8} onClose={onClose} onSubmit={() => onSubmit(password)} label="Redefinir" />
    </Sheet>
  )
}
