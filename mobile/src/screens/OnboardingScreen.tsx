import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View className="flex-1 bg-slate-950 px-6 py-10 justify-between">
      <View className="mt-20">
        <Text className="text-white/80 text-xs uppercase tracking-[4px]">SafeNode</Text>
        <Text className="text-white text-4xl font-semibold mt-4">
          Your vault. Anywhere.
        </Text>
        <Text className="text-slate-300 text-base mt-3">
          Unlock your passwords, secure notes, and attachments on the go with zero-knowledge encryption.
        </Text>
      </View>

      <View className="space-y-4">
        <TouchableOpacity
          onPress={() => navigation.replace('Unlock')}
          className="bg-white rounded-full py-4 items-center"
        >
          <Text className="text-slate-950 text-base font-semibold">Unlock vault</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.replace('Unlock')}
          className="border border-white/40 rounded-full py-4 items-center"
        >
          <Text className="text-white text-base font-semibold">Create account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OnboardingScreen;

