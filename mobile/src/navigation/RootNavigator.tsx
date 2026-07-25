import { NavigationContainer, DarkTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { HomeScreen } from '../screens/HomeScreen'
import { VaultScreen } from '../screens/VaultScreen'
import { TeamsScreen } from '../screens/TeamsScreen'
import { RecoveryScreen } from '../screens/RecoveryScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { TeamWorkspaceScreen } from '../screens/TeamWorkspaceScreen'
import { colors, typography } from '../theme/tokens'

type Tabs = { Home: undefined; Vault: undefined; Teams: undefined; Recovery: undefined; Settings: undefined }
export type TeamStackParams = { TeamDirectory: undefined; TeamWorkspace: { teamId: string; teamName: string } }
const Tab = createBottomTabNavigator<Tabs>()
const TeamStackNavigator = createNativeStackNavigator<TeamStackParams>()
const icons: Record<keyof Tabs, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'grid', inactive: 'grid-outline' },
  Vault: { active: 'lock-closed', inactive: 'lock-closed-outline' },
  Teams: { active: 'people', inactive: 'people-outline' },
  Recovery: { active: 'help-buoy', inactive: 'help-buoy-outline' },
  Settings: { active: 'options', inactive: 'options-outline' },
}

function TeamStack() {
  return (
    <TeamStackNavigator.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.ink },
      headerTintColor: colors.text,
      headerTitleStyle: { fontFamily: typography.strong, fontSize: 15 },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.ink },
    }}>
      <TeamStackNavigator.Screen name="TeamDirectory" component={TeamsScreen} options={{ headerShown: false }} />
      <TeamStackNavigator.Screen name="TeamWorkspace" component={TeamWorkspaceScreen} options={({ route }) => ({ title: route.params.teamName })} />
    </TeamStackNavigator.Navigator>
  )
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.ink, card: colors.inkRaised, border: colors.line, primary: colors.signal, text: colors.text } }}>
      <Tab.Navigator screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: { position: 'absolute', height: 84, paddingTop: 10, paddingBottom: 16, backgroundColor: '#081512F5', borderTopColor: colors.line },
        tabBarActiveTintColor: colors.signal,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: typography.strong, fontSize: 9, marginTop: 2 },
        tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? icons[route.name].active : icons[route.name].inactive} color={color} size={size} />,
      })}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Vault" component={VaultScreen} />
        <Tab.Screen name="Teams" component={TeamStack} />
        <Tab.Screen name="Recovery" component={RecoveryScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
