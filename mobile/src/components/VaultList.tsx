import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { VaultEntry } from '@shared/types';

interface EntryCardProps {
  entry: VaultEntry;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry }) => {
  const hasAttachments = (entry.attachments?.length ?? 0) > 0;
  const breachCount = entry.breachCount ?? 0;
  const compromised = breachCount > 0;
  const warning = compromised || (entry.password?.length ?? 0) < 12;

  return (
    <TouchableOpacity className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm active:opacity-80">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
          {entry.name}
        </Text>
        {warning && (
          <View className="bg-amber-100 px-2 py-1 rounded-full">
            <Text className="text-[11px] font-semibold text-amber-600">
              {compromised ? 'Compromised' : 'Weak'}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-slate-500" numberOfLines={1}>{entry.username}</Text>
      {entry.url && (
        <Text className="text-xs text-slate-400 mt-1" numberOfLines={1}>
          {entry.url}
        </Text>
      )}
      <View className="flex-row items-center gap-3 mt-3">
        <View className="flex-row items-center gap-2">
          <FontAwesome5 name="key" size={12} color="#64748b" />
          <Text className="text-xs text-slate-500">
            {entry.password ? `${entry.password.length} chars` : 'No password'}
          </Text>
        </View>
        {hasAttachments && (
          <View className="flex-row items-center gap-1">
            <FontAwesome5 name="paperclip" size={12} color="#64748b" />
            <Text className="text-xs text-slate-500">
              {entry.attachments?.length} file{entry.attachments!.length === 1 ? '' : 's'}
            </Text>
          </View>
        )}
        {entry.tags && entry.tags.length > 0 && (
          <View className="flex-row items-center gap-1">
            <FontAwesome5 name="tag" size={12} color="#64748b" />
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {entry.tags.join(', ')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const VaultList = {
  EntryCard
};

export default VaultList;

