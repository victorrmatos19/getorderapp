// Config dinâmica por cima do app.json (auditoria itens 5–6).
//
// `usesCleartextTraffic` (HTTP sem TLS, Android) é útil SÓ em dev — Supabase local na
// LAN (http://192.168.x.x:54321). No binário de PRODUÇÃO ele não pode existir.
// O EAS define EAS_BUILD_PROFILE no build; local (`expo run`/prebuild) fica indefinido → dev.
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE ?? 'development'
  const isProd = profile === 'production'

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ...(isProd
        ? []
        : [['expo-build-properties', { android: { usesCleartextTraffic: true } }]]),
    ],
  }
}
