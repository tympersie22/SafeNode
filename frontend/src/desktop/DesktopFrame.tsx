import { useEffect, type ReactNode } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { isDesktopBuild } from './integration'

export function DesktopFrame({ children }: { children: ReactNode }) {
  const desktop = isDesktopBuild()

  useEffect(() => {
    if (!desktop) return
    let active = true
    let unlisten: (() => void) | undefined
    void import('@tauri-apps/api/event')
      .then(({ listen }) => listen('safenode:lock-requested', () => {
        window.dispatchEvent(new Event('safenode:desktop-lock'))
      }))
      .then((dispose) => {
        if (active) unlisten = dispose
        else dispose()
      })

    return () => {
      active = false
      unlisten?.()
    }
  }, [desktop])

  if (!desktop) return <>{children}</>

  return (
    <div className="sn-desktop-shell">
      <header className="sn-desktop-titlebar" data-tauri-drag-region>
        <div className="sn-desktop-titlebar-brand" data-tauri-drag-region>
          <span className="sn-desktop-mark"><LockKeyhole aria-hidden="true" /></span>
          <span>SAFENODE</span>
        </div>
        <div className="sn-desktop-trust" data-tauri-drag-region>
          <ShieldCheck aria-hidden="true" />
          <span>ZERO-KNOWLEDGE DESKTOP</span>
        </div>
      </header>
      <div className="sn-desktop-viewport">{children}</div>
    </div>
  )
}
