/**
 * Native shell polish for the Capacitor iOS/Android app.
 *
 * No-ops on the web build (safe-node.app) — every call is gated behind
 * Capacitor.isNativePlatform(), and the plugin calls are wrapped in try/catch.
 * The plugins are statically imported so Vite bundles them; on web they simply
 * go unused. Requires the plugins to be installed (they are, in package.json):
 * `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`.
 */

import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export async function initNativeShell(): Promise<void> {
  if (!isNativePlatform()) return

  const platform = Capacitor.getPlatform()
  const prefersDark = Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  // Status bar: draw the web view under the bar and match content colour.
  // In Capacitor, Style.Dark = light text (for dark backgrounds), Style.Light = dark text.
  try {
    await StatusBar.setOverlaysWebView({ overlay: true })
    await StatusBar.setStyle({ style: prefersDark ? Style.Dark : Style.Light })
  } catch {
    /* status bar is best-effort */
  }

  // Keyboard: native resize so the web view isn't shoved around; CSS handles insets.
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native })
  } catch {
    /* keyboard is best-effort (also unsupported on some platforms) */
  }
  void platform

  // Splash screen: hide once the app shell has mounted to avoid a white flash.
  try {
    await SplashScreen.hide()
  } catch {
    /* splash is best-effort */
  }
}
