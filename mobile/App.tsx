import React, { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview'

const APP_URL = 'https://safe-node.app'
const ALLOWED_HOSTS = new Set(['safe-node.app', 'www.safe-node.app', 'safe-node-99hv-backend.vercel.app'])

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

export default function App() {
  const webViewRef = useRef<WebView>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [lastKnownUrl, setLastKnownUrl] = useState(APP_URL)

  const appSource = useMemo(() => ({ uri: APP_URL }), [])

  const handleReload = useCallback(() => {
    setHasLoadError(false)
    setIsLoading(true)
    webViewRef.current?.reload()
  }, [])

  const handleOpenInBrowser = useCallback(async () => {
    await Linking.openURL(lastKnownUrl || APP_URL)
  }, [lastKnownUrl])

  const handleShouldStart = useCallback((request: WebViewNavigation) => {
    if (isAllowedUrl(request.url)) {
      setLastKnownUrl(request.url)
      return true
    }

    Linking.openURL(request.url).catch(() => {
      // Let the in-app error UI handle unexpected failures.
    })
    return false
  }, [])

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data)
      if (payload?.type === 'open-external' && typeof payload.url === 'string') {
        Linking.openURL(payload.url).catch(() => {
          // Non-fatal; the web app still remains usable.
        })
      }
    } catch {
      // Ignore non-JSON bridge messages.
    }
  }, [])

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#07110d" />
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={appSource}
          originWhitelist={['https://*']}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          onMessage={handleMessage}
          onLoadStart={() => {
            setIsLoading(true)
            setHasLoadError(false)
          }}
          onLoadEnd={() => {
            setIsLoading(false)
          }}
          onError={() => {
            setIsLoading(false)
            setHasLoadError(true)
          }}
          onHttpError={() => {
            setIsLoading(false)
            setHasLoadError(true)
          }}
          onShouldStartLoadWithRequest={handleShouldStart}
          renderLoading={() => (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#31d0aa" />
              <Text style={styles.overlayTitle}>Launching Safenode</Text>
              <Text style={styles.overlayBody}>Establishing a secure session.</Text>
            </View>
          )}
          startInLoadingState
        />

        {(isLoading || hasLoadError) && (
          <View style={styles.overlay}>
            {hasLoadError ? (
              <>
                <Text style={styles.overlayTitle}>Unable to open Safenode</Text>
                <Text style={styles.overlayBody}>
                  Check your network connection or open Safenode in the browser while we finish the native shell.
                </Text>
                <View style={styles.actions}>
                  <Pressable style={styles.primaryButton} onPress={handleReload}>
                    <Text style={styles.primaryButtonText}>Retry</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={handleOpenInBrowser}>
                    <Text style={styles.secondaryButtonText}>Open in browser</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color="#31d0aa" />
                <Text style={styles.overlayTitle}>Launching Safenode</Text>
                <Text style={styles.overlayBody}>Establishing a secure session.</Text>
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07110d'
  },
  container: {
    flex: 1,
    backgroundColor: '#07110d'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07110d',
    paddingHorizontal: 32
  },
  overlayTitle: {
    marginTop: 18,
    color: '#f4f7f5',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center'
  },
  overlayBody: {
    marginTop: 10,
    color: '#94a39b',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  actions: {
    width: '100%',
    marginTop: 24,
    gap: 12
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#31d0aa'
  },
  primaryButtonText: {
    color: '#04100c',
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#204235',
    backgroundColor: '#0d1613'
  },
  secondaryButtonText: {
    color: '#d8e1dc',
    fontSize: 16,
    fontWeight: '600'
  }
})
