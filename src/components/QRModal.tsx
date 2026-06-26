import { Modal, Pressable, Share, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import type { Mesa } from '@/types'

const CLIENT_URL = (process.env.EXPO_PUBLIC_CLIENT_URL ?? 'https://getorder.vercel.app').replace(/\/$/, '')

export function QRModal({ mesa, onClose }: { mesa: Mesa; onClose: () => void }) {
  const url = `${CLIENT_URL}/mesa/${mesa.id}`
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose}>
        <Pressable onPress={() => {}} className="w-full items-center rounded-xl bg-bg p-6" style={{ maxWidth: 360 }}>
          <Text className="mb-1 font-serif text-xl text-ink">{mesa.nome}</Text>
          <Text className="mb-4 text-xs text-text-mid">Escaneie para abrir a comanda</Text>
          <View className="rounded-xl p-4" style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD9CC' }}>
            <QRCode value={url} size={220} />
          </View>
          <Text className="mt-4 text-center text-xs text-text-mid">{url}</Text>
          <View className="mt-6 w-full flex-row gap-2">
            <Pressable onPress={onClose} className="flex-1 items-center justify-center rounded-xl border border-line" style={{ minHeight: 48 }}>
              <Text className="text-sm text-text-mid">Fechar</Text>
            </Pressable>
            <Pressable onPress={() => Share.share({ message: url })} className="items-center justify-center rounded-xl bg-accent" style={{ flex: 2, minHeight: 48 }}>
              <Text className="font-sans-bold text-sm text-on-accent">Compartilhar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
