import { useState } from 'react'
import { Platform, Pressable, ScrollView, Text, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import type { PeriodoKey } from '@/lib/periodo'

const OPCOES: { key: PeriodoKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: 'mes', label: 'Mês' },
  { key: 'custom', label: 'Personalizado' },
]

type Props = {
  periodoKey: PeriodoKey
  onSelect: (key: PeriodoKey) => void
  customInicio: string
  customFim: string
  onCustom: (campo: 'inicio' | 'fim', valor: string) => void
}

// Date local → 'yyyy-mm-dd' (sem deslocamento de fuso, compõe os campos locais).
function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 'yyyy-mm-dd' → Date local (meia-noite); fallback p/ hoje.
function fromYmd(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`)
  return new Date()
}

function rotuloData(s: string, placeholder: string): string {
  if (!s) return placeholder
  return fromYmd(s).toLocaleDateString('pt-BR')
}

export default function PeriodoSelector({ periodoKey, onSelect, customInicio, customFim, onCustom }: Props) {
  const [pickerAberto, setPickerAberto] = useState<'inicio' | 'fim' | null>(null)

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {OPCOES.map((o) => {
          const active = periodoKey === o.key
          return (
            <Pressable
              key={o.key}
              onPress={() => onSelect(o.key)}
              className="rounded-xl px-4 py-2"
              style={{
                backgroundColor: active ? '#2A2A26' : 'transparent',
                borderWidth: 1,
                borderColor: active ? '#2A2A26' : '#DDD9CC',
              }}
            >
              <Text
                className="text-sm"
                style={{ color: active ? '#FAF9F5' : '#6B6A62', fontWeight: active ? '700' : '400' }}
              >
                {o.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {periodoKey === 'custom' ? (
        <View className="mt-3 flex-row items-center gap-2">
          <Pressable
            onPress={() => setPickerAberto('inicio')}
            className="flex-1 justify-center rounded-xl border border-line bg-surface px-3"
            style={{ minHeight: 44 }}
          >
            <Text className="text-sm" style={{ color: customInicio ? '#2A2A26' : '#B8B5AB' }}>
              {rotuloData(customInicio, 'Início')}
            </Text>
          </Pressable>
          <Text className="text-xs text-text-mid">até</Text>
          <Pressable
            onPress={() => setPickerAberto('fim')}
            className="flex-1 justify-center rounded-xl border border-line bg-surface px-3"
            style={{ minHeight: 44 }}
          >
            <Text className="text-sm" style={{ color: customFim ? '#2A2A26' : '#B8B5AB' }}>
              {rotuloData(customFim, 'Fim')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {pickerAberto ? (
        <DateTimePicker
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          value={fromYmd(pickerAberto === 'inicio' ? customInicio : customFim)}
          maximumDate={pickerAberto === 'inicio' && customFim ? fromYmd(customFim) : undefined}
          minimumDate={pickerAberto === 'fim' && customInicio ? fromYmd(customInicio) : undefined}
          onChange={(event, date) => {
            // Android dispara um único evento (set/dismissed); iOS pode disparar contínuo.
            if (Platform.OS === 'android') setPickerAberto(null)
            if (event.type === 'dismissed' || !date) {
              if (Platform.OS === 'ios') setPickerAberto(null)
              return
            }
            onCustom(pickerAberto, toYmd(date))
            if (Platform.OS === 'ios') setPickerAberto(null)
          }}
        />
      ) : null}
    </View>
  )
}
