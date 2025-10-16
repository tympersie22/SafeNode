import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useVault } from '../hooks/useVault';

type Props = NativeStackScreenProps<RootStackParamList, 'Unlock'>;

const UnlockScreen = ({ navigation }: Props) => {
  const {
    masterPassword,
    setMasterPassword,
    unlockVault,
    isUnlocking,
    unlockError,
    biometricsAvailable,
    biometricsEnabled,
    unlockWithBiometrics,
    enableBiometrics,
    disableBiometrics
  } = useVault();
  const [rememberDevice, setRememberDevice] = useState(true);

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      className="flex-1 bg-white px-6 justify-center"
    >
      <View className="items-center mb-10">
        <View className="w-16 h-16 rounded-2xl bg-slate-900/90 items-center justify-center">
          <FontAwesome5 name="shield-alt" size={26} color="#fff" />
        </View>
        <Text className="text-2xl font-semibold text-slate-900 mt-4">
          Unlock SafeNode
        </Text>
        <Text className="text-slate-500 text-sm mt-2 text-center">
          Enter your master password to decrypt the vault stored on this device.
        </Text>
      </View>

      <View className="space-y-3">
        <Text className="text-xs font-medium text-slate-500 uppercase">Master password</Text>
        <TextInput
          secureTextEntry
          value={masterPassword}
          onChangeText={setMasterPassword}
          placeholder="••••••••"
          placeholderTextColor="#94a3b8"
          className="border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-900"
        />
      </View>

      {unlockError && (
        <Text className="text-sm text-red-600 mt-3">{unlockError}</Text>
      )}

      <View className="flex-row items-center justify-between mt-4">
        <View className="flex-row items-center gap-2">
          <Switch
            value={rememberDevice}
            onValueChange={setRememberDevice}
            thumbColor={rememberDevice ? '#1e293b' : '#fff'}
            trackColor={{ true: '#1e293b', false: '#cbd5f5' }}
          />
          <Text className="text-sm text-slate-600">Remember on this device</Text>
        </View>
        {biometricsAvailable && (
          <TouchableOpacity
            onPress={biometricsEnabled ? disableBiometrics : enableBiometrics}
          >
            <Text className="text-sm font-semibold text-slate-700">
              {biometricsEnabled ? 'Disable biometrics' : 'Enable biometrics'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={async () => {
          const success = await unlockVault({ remember: rememberDevice });
          if (success) {
            navigation.replace('Vault');
          }
        }}
        disabled={isUnlocking || masterPassword.length === 0}
        className="bg-slate-900 rounded-xl py-4 items-center mt-6"
      >
        <Text className="text-white text-base font-semibold">
          {isUnlocking ? 'Decrypting…' : 'Unlock vault'}
        </Text>
      </TouchableOpacity>

      {biometricsAvailable && (
        <TouchableOpacity
          onPress={async () => {
            const success = await unlockWithBiometrics();
            if (success) {
              navigation.replace('Vault');
            }
          }}
          className="border border-slate-300 rounded-xl py-4 items-center mt-4"
          disabled={!biometricsEnabled}
        >
          <Text className={`text-base font-semibold ${biometricsEnabled ? 'text-slate-800' : 'text-slate-400'}`}>
            {biometricsEnabled ? 'Use Face ID / Touch ID' : 'Enable biometrics to use Face ID / Touch ID'}
          </Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
};

export default UnlockScreen;

