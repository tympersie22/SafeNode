import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TailwindProvider } from 'nativewind';

import OnboardingScreen from './screens/OnboardingScreen';
import UnlockScreen from './screens/UnlockScreen';
import VaultScreen from './screens/VaultScreen';
import { theme } from './styles/theme';

export type RootStackParamList = {
  Onboarding: undefined;
  Unlock: undefined;
  Vault: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const queryClient = new QueryClient();

const App = () => {
  return (
    <TailwindProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer theme={theme.navigationTheme}>
            <StatusBar style="dark" />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'fade'
              }}
            >
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="Unlock" component={UnlockScreen} />
              <Stack.Screen name="Vault" component={VaultScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </TailwindProvider>
  );
};

export default App;

