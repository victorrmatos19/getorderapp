import { Pressable, Switch, Text, View } from 'react-native'
import { Spinner } from '@/components/ui/Spinner'
import { resumoRegra } from '@/lib/adicionaisRegra'
import { useAdicionais } from '@/lib/hooks/useAdicionais'
import { useProdutoGrupos } from '@/lib/hooks/useProdutoGrupos'

// Seção do ProdutoForm: vincula grupos de adicionais ao produto (junção produtos_grupos).
// Hooks SEMPRE chamados (sem retorno antecipado antes deles); a query de vínculos é
// `enabled` só quando há produtoId (produto já salvo).
export function ProdutoGruposSection({
  produtoId,
  restauranteId,
}: {
  produtoId: string | null | undefined
  restauranteId: string | null | undefined
}) {
  const gruposQ = useAdicionais(restauranteId)
  const vincQ = useProdutoGrupos(produtoId, restauranteId)

  const grupos = gruposQ.data ?? []
  const vinculos = vincQ.data ?? []
  const ordemDe = new Map(vinculos.map((v) => [v.grupo_id, v.ordem]))

  if (!produtoId) {
    return (
      <Wrap>
        <Text className="text-xs text-muted">Salve o produto primeiro para vincular grupos de adicionais.</Text>
      </Wrap>
    )
  }

  if (gruposQ.isLoading || vincQ.isLoading) {
    return <Wrap><View className="py-4 items-center"><Spinner color="#9B4A3C" /></View></Wrap>
  }
  if (gruposQ.isError) {
    return (
      <Wrap>
        <Pressable onPress={() => gruposQ.refetch()}><Text className="text-sm text-accent underline">Erro ao carregar — tentar novamente</Text></Pressable>
      </Wrap>
    )
  }
  if (grupos.length === 0) {
    return (
      <Wrap>
        <Text className="text-xs text-muted">Nenhum grupo de adicionais criado. Crie um na aba “Adicionais” do cardápio.</Text>
      </Wrap>
    )
  }

  const preview = vinculos
    .filter((v) => v.grupo)
    .sort((a, b) => a.ordem - b.ordem)
    .map((v) => `${v.grupo!.nome} (${resumoRegra(v.grupo!)})`)

  return (
    <Wrap>
      {preview.length > 0 ? (
        <View className="mb-3 rounded-lg bg-bg p-2">
          <Text className="text-xs text-text-mid">Este produto terá: <Text className="text-ink">{preview.join(', ')}</Text></Text>
        </View>
      ) : null}

      <View className="gap-1">
        {grupos.map((g) => {
          const vinc = ordemDe.has(g.id)
          return (
            <View key={g.id} className="flex-row items-center justify-between py-1.5">
              <View className="min-w-0 flex-1 pr-3">
                <Text className="text-sm text-ink" numberOfLines={1}>{g.nome}</Text>
                <Text className="text-[11px] text-muted">{resumoRegra(g)}{g.ativo ? '' : ' · inativo'}</Text>
              </View>
              <Switch
                testID={`grupo-link-${g.id}`}
                value={vinc}
                onValueChange={(v) => {
                  if (v) vincQ.vincular.mutate({ grupoId: g.id, ordem: vinculos.length })
                  else vincQ.desvincular.mutate(g.id)
                }}
                trackColor={{ true: '#4A5240', false: '#DDD9CC' }}
              />
            </View>
          )
        })}
      </View>
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <View className="mt-5 rounded-xl border border-line bg-surface p-4">
      <Text className="mb-2 text-xs font-sans-bold uppercase text-text-mid">Adicionais e opções</Text>
      {children}
    </View>
  )
}
