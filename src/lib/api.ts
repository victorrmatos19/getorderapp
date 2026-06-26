import { supabase } from '@/lib/supabase/client'

// Base da web API (endpoints server-side com service_role que vivem no repo web).
// Definida em .env (EXPO_PUBLIC_WEB_API_URL). Se ausente, lançamos só na chamada
// (não no import) para não derrubar o bundle por uma var faltando.
const BASE = process.env.EXPO_PUBLIC_WEB_API_URL

// Fetch autenticado por Bearer: pega o access_token da sessão Supabase e o envia
// no header Authorization. O endpoint deriva restaurante_id/role do token — o app
// NUNCA manda restaurante_id. Parse defensivo: resposta sem JSON não quebra a tela.
export async function apiFetch(path: string, init?: RequestInit) {
  if (!BASE) {
    throw new Error('EXPO_PUBLIC_WEB_API_URL ausente no .env')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sessão expirada, entre novamente.')
  }

  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  })

  const raw = await res.text()
  let json: any = {}
  try {
    json = raw ? JSON.parse(raw) : {}
  } catch {
    json = {}
  }

  if (!res.ok) throw new Error(json.error || `Erro ${res.status}`)
  return json
}
