import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import * as Haptics from 'expo-haptics'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { ApiError, clearToken, loadToken, saveToken } from '../api/client'
import { getCurrentUser } from '../api/resources'
import { signInWithPasskey, signUpWithPasskey, type AuthUser } from '../api/passkeys'

interface AuthContextValue {
  user: AuthUser | null
  booting: boolean
  appLocked: boolean
  localLockEnabled: boolean
  signIn(email: string): Promise<void>
  signUp(email: string, displayName: string): Promise<void>
  signOut(): Promise<void>
  refresh(): Promise<void>
  unlockApp(): Promise<boolean>
  setLocalLockEnabled(enabled: boolean): Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const LOCAL_LOCK_KEY = 'safenode.local-lock.enabled'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [booting, setBooting] = useState(true)
  const [appLocked, setAppLocked] = useState(false)
  const [localLockEnabled, setLocalLockState] = useState(false)

  const refresh = useCallback(async () => {
    const profile = await getCurrentUser()
    setUser(profile)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [token, lockPreference] = await Promise.all([loadToken(), SecureStore.getItemAsync(LOCAL_LOCK_KEY)])
        const shouldLock = lockPreference === 'true'
        if (active) setLocalLockState(shouldLock)
        if (!token) return
        const profile = await getCurrentUser()
        if (active) {
          setUser(profile)
          setAppLocked(shouldLock)
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await clearToken()
      } finally {
        if (active) setBooting(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (localLockEnabled && user && (state === 'inactive' || state === 'background')) setAppLocked(true)
    })
    return () => subscription.remove()
  }, [localLockEnabled, user])

  const signIn = useCallback(async (email: string) => {
    const result = await signInWithPasskey(email)
    await saveToken(result.token)
    setUser(result.user)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [])

  const signUp = useCallback(async (email: string, displayName: string) => {
    const result = await signUpWithPasskey(email, displayName)
    await saveToken(result.token)
    setUser(result.user)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [])

  const signOut = useCallback(async () => {
    await clearToken()
    setUser(null)
    setAppLocked(false)
  }, [])

  const unlockApp = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Safenode',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false,
    })
    if (result.success) setAppLocked(false)
    return result.success
  }, [])

  const setLocalLockEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ])
      if (!hardware || !enrolled) return false
      const verified = await unlockApp()
      if (!verified) return false
    }
    await SecureStore.setItemAsync(LOCAL_LOCK_KEY, String(enabled))
    setLocalLockState(enabled)
    if (!enabled) setAppLocked(false)
    return true
  }, [unlockApp])

  const value = useMemo(() => ({ user, booting, appLocked, localLockEnabled, signIn, signUp, signOut, refresh, unlockApp, setLocalLockEnabled }), [user, booting, appLocked, localLockEnabled, signIn, signUp, signOut, refresh, unlockApp, setLocalLockEnabled])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
