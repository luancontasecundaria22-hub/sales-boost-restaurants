// Facebook SDK for JavaScript — carregado de forma assíncrona e graciosa.
//
// A Meta pede o SDK presente no site para liberar Login/Graph API do app.
// O App ID do Facebook é PÚBLICO (vai no SDK do browser por design), então
// fica numa env VITE_ — sem ela, o SDK simplesmente não carrega e nada quebra.
// A versão é fixada na mesma usada pelas edge functions de Instagram (v21.0).
const APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined
const FB_VERSION = (import.meta.env.VITE_FACEBOOK_API_VERSION as string | undefined) ?? 'v21.0'

interface FBSdk {
  init: (opts: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void
  AppEvents?: { logPageView: () => void }
}
declare global {
  interface Window {
    FB?: FBSdk
    fbAsyncInit?: () => void
  }
}

// Injeta o SDK uma única vez. Idempotente (checa o id do script).
export function initFacebookSdk(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (!APP_ID) return // App ID não configurado → SDK desligado (nada quebra)
  if (document.getElementById('facebook-jssdk')) return

  window.fbAsyncInit = function () {
    window.FB?.init({ appId: APP_ID, cookie: true, xfbml: true, version: FB_VERSION })
    window.FB?.AppEvents?.logPageView()
  }

  const first = document.getElementsByTagName('script')[0]
  const js = document.createElement('script')
  js.id = 'facebook-jssdk'
  js.async = true
  js.defer = true
  js.src = 'https://connect.facebook.net/en_US/sdk.js'
  first?.parentNode?.insertBefore(js, first)
}

initFacebookSdk()
