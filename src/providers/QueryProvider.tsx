import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

// Espelha os defaults da web (staleTime 30s; sem refetch on focus; retry 1).
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
