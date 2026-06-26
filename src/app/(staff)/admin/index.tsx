import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRestaurante } from '@/providers/RestauranteProvider'
import { Screen } from '@/components/ui/Screen'
import { Header } from '@/components/ui/Header'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Toast } from '@/components/ui/Toast'
import { construirPeriodo, type PeriodoKey } from '@/lib/periodo'
import { deriveTheme } from '@/lib/theme'
import { fmt } from '@/lib/formatters'
import { baixarCsv } from '@/lib/exportCsv'
import {
  useDashboard, computeResumo, computeTendencia, computeProdutos,
  computeMix, computeHeatmap, computeQualidade,
} from '@/lib/hooks/useDashboard'
import AoVivoHoje from '@/components/dashboard/AoVivoHoje'
import PeriodoSelector from '@/components/dashboard/PeriodoSelector'
import ResumoCards from '@/components/dashboard/ResumoCards'
import TendenciaChart from '@/components/dashboard/TendenciaChart'
import ProdutosRanking from '@/components/dashboard/ProdutosRanking'
import MixPagamento from '@/components/dashboard/MixPagamento'
import HeatmapPico from '@/components/dashboard/HeatmapPico'
import QualidadeGiro from '@/components/dashboard/QualidadeGiro'

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="rounded-xl border border-line bg-surface p-4">
      <Text className="mb-3 text-sm font-sans-bold text-ink">{titulo}</Text>
      {children}
    </View>
  )
}

export default function Painel() {
  const { restauranteId, restaurante, signOut } = useRestaurante()

  const [periodoKey, setPeriodoKey] = useState<PeriodoKey>('7d')
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim] = useState('')
  const [toast, setToast] = useState({ visible: false, message: '' })

  const periodo = useMemo(
    () => construirPeriodo(periodoKey, { customInicio, customFim }),
    [periodoKey, customInicio, customFim],
  )

  const corPrimaria = useMemo(
    () => deriveTheme(restaurante?.cor_primaria, restaurante?.cor_accent, restaurante?.cor_preco)['--primary'],
    [restaurante?.cor_primaria, restaurante?.cor_accent, restaurante?.cor_preco],
  )

  const { data, isLoading, isError, error, refetch } = useDashboard(restauranteId, periodo)
  const resumo = useMemo(() => (data ? computeResumo(data) : null), [data])
  const tendencia = useMemo(() => (data ? computeTendencia(data.fechadasAtual, periodo) : []), [data, periodo])
  const produtos = useMemo(() => (data ? computeProdutos(data.itensFechadas) : null), [data])
  const mix = useMemo(() => (data ? computeMix(data.fechadasAtual) : null), [data])
  const heatmap = useMemo(() => (data ? computeHeatmap(data.itensPeriodo) : null), [data])
  const qualidade = useMemo(() => (data ? computeQualidade(data) : null), [data])

  const exportar = async () => {
    if (!data) return
    const linhas = data.fechadasAtual.map((c) => {
      const tempoMin = c.fechado_em && c.criado_em
        ? Math.round((new Date(c.fechado_em).getTime() - new Date(c.criado_em).getTime()) / 60000)
        : ''
      return [
        c.fechado_em ? fmt.date(c.fechado_em) : '',
        c.fechado_em ? fmt.time(c.fechado_em) : '',
        c.mesa?.nome ?? '',
        fmt.money(c.total ?? 0),
        fmt.money(c.taxa_servico_valor ?? 0),
        c.forma_pagamento ?? '',
        c.numero_pessoas ?? '',
        tempoMin,
      ]
    })
    try {
      await baixarCsv(
        `dashboard_${periodo.key}_${periodo.inicio.toISOString().slice(0, 10)}`,
        ['Data', 'Hora', 'Mesa', 'Total', 'Taxa', 'Pagamento', 'Pessoas', 'Tempo de mesa (min)'],
        linhas,
      )
    } catch (e: any) {
      setToast({ visible: true, message: e?.message || 'Falha ao exportar CSV' })
    }
  }

  const exportBtn = (
    <Pressable
      onPress={exportar}
      disabled={!data || isLoading}
      className="flex-row items-center gap-1.5 rounded-lg border border-line px-3"
      style={{ minHeight: 48, justifyContent: 'center' }}
    >
      <Text className="text-xs font-sans-bold" style={{ color: data ? '#2A2A26' : '#B8B5AB' }}>
        ↓ Exportar
      </Text>
    </Pressable>
  )

  return (
    <Screen className="px-5">
      <Header title="Painel" subtitle="Admin" onSair={() => signOut()} right={exportBtn} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28, gap: 24 }}>
        <AoVivoHoje restauranteId={restauranteId} />

        <View className="gap-3">
          <PeriodoSelector
            periodoKey={periodoKey}
            onSelect={setPeriodoKey}
            customInicio={customInicio}
            customFim={customFim}
            onCustom={(campo, valor) => (campo === 'inicio' ? setCustomInicio(valor) : setCustomFim(valor))}
          />

          {isLoading ? (
            <View className="items-center py-16"><Spinner color="#9B4A3C" /></View>
          ) : null}
          {isError ? (
            <EmptyState
              icon="⚠️"
              title="Erro ao carregar"
              description={(error as any)?.message}
              action={
                <Pressable onPress={() => refetch()}>
                  <Text className="text-sm text-accent underline">Tentar novamente</Text>
                </Pressable>
              }
            />
          ) : null}
          {resumo && !isLoading && !isError ? <ResumoCards resumo={resumo} /> : null}
        </View>

        {data && !isLoading && !isError ? (
          <>
            <Bloco titulo="Tendência de faturamento">
              <TendenciaChart data={tendencia} corPrimaria={corPrimaria} />
            </Bloco>
            <Bloco titulo="Desempenho de produtos">
              {produtos ? <ProdutosRanking produtos={produtos.produtos} adicionais={produtos.adicionais} /> : null}
            </Bloco>
            <Bloco titulo="Mix operacional">
              {mix ? <MixPagamento mix={mix} /> : null}
            </Bloco>
            <Bloco titulo="Pico — dia × hora">
              {heatmap ? <HeatmapPico matriz={heatmap.matriz} max={heatmap.max} corPrimaria={corPrimaria} /> : null}
            </Bloco>
            <Bloco titulo="Qualidade / giro">
              {qualidade ? <QualidadeGiro q={qualidade} /> : null}
            </Bloco>
          </>
        ) : null}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
    </Screen>
  )
}
