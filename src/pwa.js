// Install, offline and update, the honest way. The worker precaches everything,
// so after one visit the games run with no internet, computer players included.
import React from 'react'

const base = import.meta.env.BASE_URL
let deferred = null
const listeners = new Set()
const emit = () => listeners.forEach(f => f())

export function startPWA() {
  if (!('serviceWorker' in navigator) || location.hostname === 'localhost') return
  if (window.self !== window.top) return                      // an embedded copy never installs
  navigator.serviceWorker.register(base + 'sw.js', { scope: base }).then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing
      w && w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) { window.__wtUpdate = w; emit() }
      })
    })
  }).catch(() => {})
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (window.__wtReloading) location.reload() })
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; emit() })
  window.addEventListener('appinstalled', () => { deferred = null; emit() })
  window.addEventListener('online', emit); window.addEventListener('offline', emit)
}

export function usePWA() {
  const [, tick] = React.useState(0)
  React.useEffect(() => { const f = () => tick(n => n + 1); listeners.add(f); return () => listeners.delete(f) }, [])
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return {
    online: navigator.onLine,
    standalone,
    canPrompt: !!deferred,
    ios,
    update: !!window.__wtUpdate,
    install: async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; emit() },
    applyUpdate: () => { window.__wtReloading = true; window.__wtUpdate && window.__wtUpdate.postMessage('skip-waiting') },
  }
}
