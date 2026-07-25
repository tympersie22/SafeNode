import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safenode.mobile',
  appName: 'Safenode',
  webDir: 'dist',
  server: {
    // Match the WebAuthn relying-party domain while serving bundled assets locally.
    hostname: 'safe-node.app',
    androidScheme: 'https',
    iosScheme: 'capacitor'
  },
  plugins: {
    // Hidden by initNativeShell() once the app shell mounts (avoids a white flash).
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0f172a',
      showSpinner: false,
      splashImmersive: true,
      splashFullScreen: true
    },
    Keyboard: {
      // Keep the web view still; CSS handles insets.
      resize: 'native'
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000'
    }
  }
};

export default config;
