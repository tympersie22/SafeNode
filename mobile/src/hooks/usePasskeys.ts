import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'expo-linking';

type WorkflowType = 'register' | 'authenticate';

interface PendingWorkflow {
  type: WorkflowType;
  payload: any;
  createdAt: number;
}

const WORKFLOW_KEY = 'safenode_passkey_workflow';

const storeWorkflow = async (workflow: PendingWorkflow | null) => {
  if (!workflow) {
    await AsyncStorage.removeItem(WORKFLOW_KEY);
    return;
  }
  await AsyncStorage.setItem(WORKFLOW_KEY, JSON.stringify(workflow));
};

const stageWorkflow = async (type: WorkflowType, payload: any) => {
  const workflow: PendingWorkflow = {
    type,
    payload,
    createdAt: Date.now()
  };
  await storeWorkflow(workflow);
  return workflow;
};

export const usePasskeys = () => {
  const [pendingWorkflow, setPendingWorkflow] = useState<PendingWorkflow | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(WORKFLOW_KEY)
      .then(stored => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as PendingWorkflow;
        setPendingWorkflow(parsed);
      })
      .catch(err => console.warn('Failed to load passkey workflow', err));
  }, []);

  const showFollowUpAlert = useCallback((title: string) => {
    Alert.alert(
      title,
      Platform.select({
        ios: 'Open SafeNode on desktop Safari (macOS 13+) or Edge/Chrome to finish using your biometric authenticator.',
        android: 'Open SafeNode on Chrome (M115+) on this device or desktop to finish passkey enrollment.',
        default: 'Open SafeNode in a WebAuthn-capable browser to continue the passkey flow.'
      }),
      [
        {
          text: 'Learn more',
          onPress: () => Linking.openURL('https://passkeys.dev/')
        },
        { text: 'OK' }
      ]
    );
  }, []);

  const beginRegistration = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/passkeys/register/options', {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error('Failed to request passkey registration options');
      }
      const payload = await res.json();
      const workflow = await stageWorkflow('register', payload);
      setPendingWorkflow(workflow);
      showFollowUpAlert('Passkey registration staged');
    } catch (err: any) {
      Alert.alert('Passkey error', err?.message || 'Unable to start passkey registration.');
    }
  }, [showFollowUpAlert]);

  const beginAuthentication = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/passkeys/authenticate/options', {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error('Failed to request passkey authentication options');
      }
      const payload = await res.json();
      const workflow = await stageWorkflow('authenticate', payload);
      setPendingWorkflow(workflow);
      showFollowUpAlert('Passkey authentication staged');
    } catch (err: any) {
      Alert.alert('Passkey error', err?.message || 'Unable to start passkey authentication.');
    }
  }, [showFollowUpAlert]);

  const clearWorkflow = useCallback(async () => {
    await storeWorkflow(null);
    setPendingWorkflow(null);
  }, []);

  return {
    pendingWorkflow,
    beginRegistration,
    beginAuthentication,
    clearWorkflow
  };
};

