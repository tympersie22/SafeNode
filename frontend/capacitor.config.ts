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
  }
};

export default config;
