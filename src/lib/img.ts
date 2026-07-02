// Miniaturas via Supabase Image Transformation (plano Pro): troca /object/public/ por
// /render/image/public/ com width/quality — evita baixar a foto em resolução original
// para caixas de 56–64px (auditoria item 8).
//
// ⚠️ O Supabase LOCAL (CLI) não sobe o imgproxy → em 127.0.0.1/localhost mantém a URL
// original (upload/exibição local continuam funcionando). `width` deve ser ~2× o box
// (retina). URLs que não são do Storage público passam intactas (ex.: file:// de preview).
export function thumb(url: string, width: number): string {
  if (!url.includes('/storage/v1/object/public/')) return url
  if (/127\.0\.0\.1|localhost/.test(url)) return url
  return (
    url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${width}&quality=75`
  )
}
