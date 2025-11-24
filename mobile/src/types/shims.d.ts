// Minimal ambient declarations so TS tooling works before native deps are installed
declare module 'react-native';

declare module '@expo/vector-icons' {
  export const FontAwesome5: any;
}

declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module 'expo-device' {
  export const isDevice: boolean;
}

declare module 'expo-local-authentication' {
  export function hasHardwareAsync(): Promise<boolean>;
  export function isEnrolledAsync(): Promise<boolean>;
  export function authenticateAsync(options: { promptMessage: string; fallbackLabel?: string }): Promise<{ success: boolean; error?: string }>;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  export default AsyncStorage;
}

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected?: boolean | null;
    [key: string]: unknown;
  }

  const NetInfo: {
    addEventListener: (listener: (state: NetInfoState) => void) => () => void;
  };

  export default NetInfo;
}

declare module '@react-navigation/native-stack' {
  export type NativeStackScreenProps<ParamList, RouteName extends keyof ParamList> = {
    navigation: any;
    route: { key: string; name: RouteName; params: ParamList[RouteName] };
  };
  export function createNativeStackNavigator<T>(): any;
}

declare module '@tanstack/react-query' {
  export const useQuery: any;
  export const useQueryClient: any;
  export class QueryClient {}
  export const QueryClientProvider: any;
}

declare module '@react-navigation/native' {
  export const DefaultTheme: any;
  export const NavigationContainer: any;
}

declare module 'expo-status-bar' {
  export const StatusBar: any;
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaProvider: any;
}

declare module 'nativewind' {
  export const TailwindProvider: any;
}

declare module 'expo-constants' {
  const Constants: any;
  export default Constants;
}

declare module 'expo-linking' {
  export const Linking: {
    createURL(path?: string): string;
    parse(url: string): { path?: string; queryParams?: Record<string, string> };
    addEventListener(listener: (event: { url: string }) => void): { remove: () => void };
    removeEventListener(listener: (event: { url: string }) => void): void;
    getInitialURL(): Promise<string | null>;
    canOpenURL(url: string): Promise<boolean>;
    openURL(url: string): Promise<void>;
  };
  export * from 'expo-linking';
}

