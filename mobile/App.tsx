import 'react-native-gesture-handler'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './src/auth/AuthContext'
import { AuthScreen } from './src/screens/AuthScreen'
import { LockScreen } from './src/screens/LockScreen'
import { RootNavigator } from './src/navigation/RootNavigator'
import { VaultProvider } from './src/vault/VaultContext'
import { colors } from './src/theme/tokens'

function AppContent() {
  const { user, booting, appLocked } = useAuth()
  if (booting) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.signal} /></View>
  if (!user) return <AuthScreen />
  return appLocked ? <LockScreen /> : <RootNavigator />
}

export default function App() {
  const [fontsReady] = useFonts({
    Manrope_400Regular: require('@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf'),
    Manrope_500Medium: require('@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'),
    Manrope_600SemiBold: require('@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf'),
    Manrope_700Bold: require('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
    IBMPlexMono_500Medium: require('@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf'),
  })
  if (!fontsReady) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.signal} /></View>
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="light" backgroundColor={colors.ink} />
        <AuthProvider><VaultProvider><AppContent /></VaultProvider></AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
})
