import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 10_000,
      retry: 1,
    },
  },
})

async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK !== 'true') {
    // Remove a mock worker left over from an earlier frontend demo.
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.filter((registration) => registration.active?.scriptURL.endsWith('/mockServiceWorker.js')).map((registration) => registration.unregister()))
      } catch {
        // Service workers may be unavailable on a plain HTTP development host.
      }
    }
    return
  }
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    })
    console.info('[langwars] mock backend online')
  } catch (error) {
    console.error('[langwars] mock backend failed to start; API calls will go to the network', error)
  }
}

const root = createRoot(document.getElementById('root')!)

enableMocking().then(() => {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
})
