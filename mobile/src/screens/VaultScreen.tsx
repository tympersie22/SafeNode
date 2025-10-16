import React from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useVault } from '../hooks/useVault';
import VaultList from '../components/VaultList';
import { usePasskeys } from '../hooks/usePasskeys';
import type { VaultEntry } from '@shared/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Vault'>;

const VaultScreen = ({ navigation }: Props) => {
  const {
    entries,
    isSyncing,
    syncError,
    refetchVault,
    lockVault,
    status
  } = useVault();
  const { pendingWorkflow, beginRegistration, beginAuthentication, clearWorkflow } = usePasskeys();

  const renderEntry = ({ item }: { item: VaultEntry }) => (
    <VaultList.EntryCard entry={item} />
  );

  return (
    <View className="flex-1 bg-slate-50">
      <View className="px-6 pt-14 pb-6 bg-white border-b border-slate-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs uppercase text-slate-500 tracking-[3px]">SafeNode Vault</Text>
            <Text className="text-2xl font-semibold text-slate-900 mt-1">All items</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              lockVault();
              navigation.replace('Unlock');
            }}
            className="w-10 h-10 rounded-full border border-slate-200 items-center justify-center"
          >
            <FontAwesome5 name="lock" size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View className="mt-4 space-y-1">
          {syncError ? (
            <Text className="text-sm text-red-600">Sync error: {syncError}</Text>
          ) : (
            <Text className="text-sm text-slate-500">
              {isSyncing ? 'Syncing with cloud…' : `Stored entries: ${entries.length}`}
            </Text>
          )}
          <Text className="text-xs text-slate-500">
            {status.isOnline ? 'Online' : 'Offline – viewing cached vault'}
          </Text>
          {status.pendingOperations.length > 0 && (
            <Text className="text-xs text-amber-600">
              {status.pendingOperations.length} pending update
              {status.pendingOperations.length === 1 ? '' : 's'} queued for sync
            </Text>
          )}
        </View>

        <View className="flex-row flex-wrap gap-2 mt-6">
          <TouchableOpacity
            onPress={beginRegistration}
            className="bg-slate-900 px-4 py-2 rounded-xl"
          >
            <Text className="text-white text-sm font-semibold">Prepare passkey</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={beginAuthentication}
            className="border border-slate-300 px-4 py-2 rounded-xl"
          >
            <Text className="text-slate-800 text-sm font-semibold">Stage sign-in</Text>
          </TouchableOpacity>
          {pendingWorkflow && (
            <TouchableOpacity onPress={clearWorkflow} className="px-4 py-2 rounded-xl border border-slate-200">
              <Text className="text-slate-600 text-sm font-semibold">Clear staged flow</Text>
            </TouchableOpacity>
          )}
        </View>
        {pendingWorkflow && (
          <Text className="text-xs text-slate-500 mt-2">
            Pending passkey flow: {pendingWorkflow.type} · staged {new Date(pendingWorkflow.createdAt).toLocaleString()}
          </Text>
        )}
      </View>

      <FlatList<VaultEntry>
        data={entries}
        keyExtractor={(item: VaultEntry) => item.id}
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={refetchVault} />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={renderEntry}
        ListEmptyComponent={
          <View className="mt-20 items-center">
            <FontAwesome5 name="cloud" size={32} color="#94a3b8" />
            <Text className="text-slate-500 text-sm mt-3">
              No entries yet. Use the desktop app to add credentials and they&apos;ll sync here.
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default VaultScreen;

