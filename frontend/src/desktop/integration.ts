export const isDesktopBuild = (): boolean => import.meta.env.VITE_DESKTOP_BUILD === 'true'

export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false
  return isDesktopBuild() || '__TAURI_INTERNALS__' in window
}

export const openSafenodeInBrowser = async (): Promise<void> => {
  if (!isTauri()) {
    window.location.assign('https://safe-node.app/auth')
    return
  }

  const { openUrl } = await import('@tauri-apps/plugin-opener')
  await openUrl('https://safe-node.app/auth')
}

export const enhancedCopyToClipboard = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text)
}

if (typeof document !== 'undefined' && isDesktopBuild()) {
  document.body.classList.add('desktop-app')
}
