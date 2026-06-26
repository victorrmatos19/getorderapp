import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Role, UsuarioEquipe } from '@/types'

// Gestão de equipe (garçom/cozinha). A escrita é 100% server-side (service_role)
// no repo web; o app só fala com esses endpoints via apiFetch (Bearer). O
// restaurante_id e o role efetivo são derivados do token no servidor — nunca aqui.

export type CriarUsuarioInput = { nome: string; email: string; password: string; role: Role }

export type PatchUsuario =
  | { id: string; action: 'update_nome'; nome: string }
  | { id: string; action: 'change_role'; role: Role }
  | { id: string; action: 'reset_password'; password: string }
  | { id: string; action: 'deactivate' }
  | { id: string; action: 'reactivate' }

export function useUsuarios() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['usuarios'] })

  const list = useQuery({
    queryKey: ['usuarios'],
    queryFn: () =>
      apiFetch('/api/admin/usuarios').then((j) => (j.usuarios ?? []) as UsuarioEquipe[]),
  })

  const criar = useMutation({
    mutationFn: (input: CriarUsuarioInput) =>
      apiFetch('/api/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })

  const patch = useMutation({
    mutationFn: ({ id, ...body }: PatchUsuario) =>
      apiFetch(`/api/admin/usuarios/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  })

  return { list, criar, patch }
}

// Senha forte (~14 chars) sem caracteres ambíguos. Feature-detect do crypto
// (RN não tem `crypto` global garantido): usa getRandomValues quando existe,
// senão cai em Math.random — aceitável, é senha INICIAL que o usuário troca.
// Garante ao menos 1 maiúscula, 1 minúscula, 1 dígito e 1 símbolo.
export function gerarSenhaForte(len = 14) {
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%&*'
  const all = lower + upper + digits + symbols

  const g = (globalThis as any).crypto?.getRandomValues?.bind((globalThis as any).crypto)
  const randByte = (): number => {
    if (g) {
      const a = new Uint8Array(1)
      g(a)
      return a[0]
    }
    return Math.floor(Math.random() * 256)
  }
  const pick = (set: string) => set[randByte() % set.length]

  const out: string[] = [pick(lower), pick(upper), pick(digits), pick(symbols)]
  while (out.length < Math.max(len, 8)) out.push(pick(all))

  // embaralha (Fisher–Yates) para os caracteres garantidos não ficarem no começo
  for (let i = out.length - 1; i > 0; i--) {
    const j = randByte() % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join('')
}
