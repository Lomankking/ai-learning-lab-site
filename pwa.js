let installPrompt = null

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  installPrompt = event
})

window.addEventListener('appinstalled', () => {
  installPrompt = null
})

document.addEventListener('click', async event => {
  if (!event.target.closest?.('[data-action="install"]')) return
  if (installPrompt) {
    const prompt = installPrompt
    installPrompt = null
    await prompt.prompt()
    return
  }
  const hint = document.getElementById('install-hint')
  if (hint) hint.hidden = false
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
