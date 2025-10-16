import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { VaultEntry } from '@shared/types';

interface VaultResponse {
  entries: VaultEntry[];
  version: number;
}

type PendingVaultUpdate = {
  id: string;
  action: 'UPSERT' | 'DELETE';
  payload: {
    encryptedVault: string;
    iv: string;
    version: number;
    entryId?: string;
  };
  createdAt: number;
};

const SECURE_KEY = 'safenode_master_password';
const CACHE_KEY = 'safenode_cached_vault';
const PENDING_KEY = 'safenode_pending_ops';

const syncPendingOperation = async (operation: PendingVaultUpdate) => {
  const baseUrl = 'http://localhost:3001';
  if (operation.action === 'DELETE') {
    const entryId = operation.payload.entryId;
    const endpoint = entryId ? `/api/vault/entry/${encodeURIComponent(entryId)}` : '/api/vault/entry';
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.payload)
    });
    if (!res.ok) {
      throw new Error('Failed to delete vault entry');
    }
    return;
  }

  const res = await fetch(`${baseUrl}/api/vault`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation.payload)
  });
  if (!res.ok) {
    throw new Error('Failed to sync vault update');
  }
};

const fetchVault = async (): Promise<VaultResponse> => {
  try {
    const res = await fetch('http://localhost:3001/api/vault', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      throw new Error('Failed to fetch vault');
    }
    const json = await res.json();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(json));
    return json;
  } catch (error) {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as VaultResponse;
    }
    throw error;
  }
};

export const useVault = () => {
  const [masterPassword, setMasterPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<PendingVaultUpdate[]>([]);
  const pendingRef = useRef<PendingVaultUpdate[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(Boolean(state.isConnected));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    pendingRef.current = pendingOperations;
  }, [pendingOperations]);

  useEffect(() => {
    (async () => {
      const storedPassword = await SecureStore.getItemAsync(SECURE_KEY);
      if (storedPassword) {
        setBiometricsEnabled(true);
      }

      if (Device.isDevice && Platform.OS !== 'web') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricsAvailable(hasHardware && enrolled);
      } else {
        setBiometricsAvailable(false);
      }

      const storedOps = await AsyncStorage.getItem(PENDING_KEY);
      if (storedOps) {
        try {
          const parsed = JSON.parse(storedOps) as PendingVaultUpdate[];
          setPendingOperations(parsed);
        } catch (error) {
          console.warn('Failed to parse pending operations', error);
          await AsyncStorage.removeItem(PENDING_KEY);
        }
      }
    })();
  }, []);

  const queryResult = useQuery(['vault'], fetchVault, {
    enabled: isUnlocked,
    staleTime: 30_000,
    cacheTime: 60_000
  });

  const data = (queryResult.data as VaultResponse | undefined) ?? undefined;
  const { isFetching: isSyncing, refetch, error } = queryResult;

  const flushPendingOperations = useCallback(async (ops?: PendingVaultUpdate[]) => {
    if (!isUnlocked || !isOnline) return;
    const queue = ops ?? pendingRef.current;
    if (queue.length === 0) return;

    const remaining: PendingVaultUpdate[] = [];
    for (const operation of queue) {
      try {
        await syncPendingOperation(operation);
      } catch (err) {
        console.warn('Failed to process pending operation', err);
        remaining.push(operation);
      }
    }

    if (remaining.length !== queue.length) {
      setPendingOperations(remaining);
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
    }
  }, [isOnline, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;
    if (!isOnline) return;
    if (pendingOperations.length === 0) return;
    flushPendingOperations();
  }, [flushPendingOperations, isOnline, isUnlocked, pendingOperations.length]);

  const queueVaultUpdate = useCallback(
    async (operation: Omit<PendingVaultUpdate, 'id' | 'createdAt'>) => {
      const queued: PendingVaultUpdate = {
        ...operation,
        id: `${operation.action}-${Date.now()}`,
        createdAt: Date.now()
      };
      setPendingOperations((prev: PendingVaultUpdate[]) => {
        const next = [...prev, queued];
        AsyncStorage.setItem(PENDING_KEY, JSON.stringify(next)).catch((err: unknown) =>
          console.warn('Failed to persist pending operations', err)
        );
        return next;
      });
      if (isUnlocked && isOnline) {
        await flushPendingOperations([queued]);
      }
    },
    [flushPendingOperations, isOnline, isUnlocked]
  );

  const unlockVault = useCallback(async (options?: { remember?: boolean }) => {
    setIsUnlocking(true);
    setUnlockError(null);

    try {
      if (!masterPassword) {
        throw new Error('Enter your master password');
      }

      if (masterPassword !== 'demo-password') {
        throw new Error('Incorrect master password');
      }

      const shouldStore = options?.remember || biometricsEnabled;
      if (shouldStore) {
        await SecureStore.setItemAsync(SECURE_KEY, masterPassword);
        setBiometricsEnabled(true);
      }

      setIsUnlocked(true);
      await refetch();
      return true;
    } catch (err: any) {
      setUnlockError(err?.message || 'Failed to unlock vault');
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, [biometricsEnabled, masterPassword, refetch]);

  const unlockWithBiometrics = useCallback(async () => {
    try {
      if (!biometricsEnabled) {
        Alert.alert('Enable biometrics first', 'Unlock with your password and enable biometrics to continue.');
        return false;
      }
      const storedPassword = await SecureStore.getItemAsync(SECURE_KEY);
      if (!storedPassword) {
        Alert.alert('Missing credential', 'Unlock once with your master password to store a secure credential.');
        setBiometricsEnabled(false);
        return false;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SafeNode',
        fallbackLabel: 'Use master password'
      });

      if (!authResult.success) {
        if (authResult.error) {
          setUnlockError(authResult.error);
        }
        return false;
      }

      setMasterPassword(storedPassword);
      setIsUnlocked(true);
      await refetch();
      return true;
    } catch (err: any) {
      setUnlockError(err?.message || 'Biometric authentication failed');
      return false;
    }
  }, [biometricsEnabled, refetch]);

  const enableBiometrics = useCallback(async () => {
    if (!masterPassword) {
      Alert.alert('Unlock required', 'Enter your master password first to enable biometrics.');
      return false;
    }
    if (!biometricsAvailable) {
      Alert.alert('Biometrics unavailable', 'Biometric hardware or enrollment not detected on this device.');
      return false;
    }
    try {
      await SecureStore.setItemAsync(SECURE_KEY, masterPassword);
      setBiometricsEnabled(true);
      Alert.alert('Biometrics enabled', 'You can now unlock SafeNode with Face ID / Touch ID.');
      return true;
    } catch (err: any) {
      Alert.alert('Biometrics error', err?.message || 'Unable to enable biometrics.');
      return false;
    }
  }, [biometricsAvailable, masterPassword]);

  const disableBiometrics = useCallback(async () => {
    await SecureStore.deleteItemAsync(SECURE_KEY);
    setBiometricsEnabled(false);
    Alert.alert('Biometrics disabled', 'You will need to use your master password to unlock.');
  }, []);

  const refetchVault = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const lockVault = useCallback(() => {
    setIsUnlocked(false);
    setMasterPassword('');
    queryClient.removeQueries(['vault']);
  }, [queryClient]);

  const entries = data?.entries ?? [];

  const status = useMemo(
    () => ({
      isOnline,
      pendingOperations,
      biometricsAvailable,
      biometricsEnabled
    }),
    [biometricsAvailable, biometricsEnabled, isOnline, pendingOperations]
  );

  return {
    masterPassword,
    setMasterPassword,
    unlockVault,
    unlockWithBiometrics,
    enableBiometrics,
    disableBiometrics,
    isUnlocking,
    unlockError,
    biometricsAvailable,
    biometricsEnabled,
    isUnlocked,
    entries,
    isSyncing,
    syncError: error instanceof Error ? error.message : null,
    refetchVault,
    lockVault,
    queueVaultUpdate,
    status
  };
};

