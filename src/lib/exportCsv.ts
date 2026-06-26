// Exportação CSV no nativo — mesma lógica de escape/separador da web (';' + BOM
// UTF-8 para acentos abrirem certo no Excel). Grava num arquivo de cache e abre o
// share sheet do SO. Assinatura assíncrona; o chamador trata erro (Toast).
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

type Celula = string | number | null | undefined

function escapar(v: Celula): string {
  const s = v === null || v === undefined ? '' : String(v)
  if (/[";\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function baixarCsv(
  nomeArquivo: string,
  cabecalho: Celula[],
  linhas: Celula[][],
): Promise<void> {
  const sep = ';'
  const corpo = [cabecalho, ...linhas].map((row) => row.map(escapar).join(sep)).join('\r\n')
  const nome = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  const uri = FileSystem.cacheDirectory + nome
  await FileSystem.writeAsStringAsync(uri, '﻿' + corpo, { encoding: FileSystem.EncodingType.UTF8 })
  if (!(await Sharing.isAvailableAsync())) {
    // Sem share sheet (ex.: simulador sem destinos) — sinaliza para o chamador
    // dar feedback (Toast) em vez de "exportar" silenciosamente sem nada abrir.
    throw new Error('Compartilhamento indisponível neste dispositivo.')
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  })
}
