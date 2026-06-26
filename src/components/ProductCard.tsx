import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { fmt } from '@/lib/formatters'
import { precoEfetivo } from '@/lib/calcComanda'
import type { Produto } from '@/types'

function Badge({ label, outline }: { label: string; outline?: boolean }) {
  return (
    <View className={`rounded px-1.5 py-0.5 ${outline ? 'border border-accent' : 'bg-accent'}`}>
      <Text className={`text-[10px] font-sans-bold uppercase ${outline ? 'text-accent' : 'text-on-accent'}`}>{label}</Text>
    </View>
  )
}

export function ProductCard({ produto, onOpen, isLast }: { produto: Produto; onOpen: () => void; isLast?: boolean }) {
  const esgotado = produto.esgotado
  const oferta = !esgotado && produto.em_oferta && produto.oferta_preco != null && produto.oferta_preco < produto.preco

  return (
    <Pressable
      onPress={onOpen}
      className="flex-row items-start gap-4 py-4"
      style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#DDD9CC', opacity: esgotado ? 0.6 : 1 }}
    >
      <View className="min-w-0 flex-1">
        {esgotado || produto.novidade || produto.em_oferta ? (
          <View className="mb-1 flex-row gap-1.5">
            {esgotado ? <Badge label="Esgotado" /> : null}
            {produto.novidade ? <Badge label="Novo" /> : null}
            {produto.em_oferta ? <Badge label="Oferta" outline /> : null}
          </View>
        ) : null}
        <View className="mb-0.5 flex-row items-baseline justify-between gap-3">
          <Text
            className={`text-base ${esgotado ? 'line-through text-accent' : 'text-ink'}`}
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {produto.nome}
          </Text>
          <View className="flex-row items-baseline gap-2">
            {oferta ? <Text className="text-xs text-muted line-through">{fmt.currency(produto.preco)}</Text> : null}
            <Text className={`text-base font-sans-bold ${esgotado ? 'text-muted line-through' : 'text-price'}`}>
              {fmt.currency(precoEfetivo(produto))}
            </Text>
          </View>
        </View>
        {produto.descricao ? (
          <Text className="text-xs text-text-mid" numberOfLines={1}>{produto.descricao}</Text>
        ) : null}
      </View>

      {produto.foto_url ? (
        <Image source={{ uri: produto.foto_url }} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: '#F2F0E8' }} contentFit="cover" />
      ) : null}

      <View className="h-9 w-9 items-center justify-center self-center rounded-xl border border-line">
        <Text className="text-ink">›</Text>
      </View>
    </Pressable>
  )
}
