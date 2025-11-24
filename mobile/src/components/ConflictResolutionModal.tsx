/**
 * Conflict Resolution Modal
 * UI component for resolving vault sync conflicts
 */

import React, { useState } from 'react'
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import type { VaultEntry } from '@shared/types'

export interface ConflictData {
  localEntry: VaultEntry
  serverEntry: VaultEntry
  conflictType: 'both_modified' | 'deleted_locally' | 'deleted_server'
}

interface ConflictResolutionModalProps {
  visible: boolean
  conflicts: ConflictData[]
  onResolve: (resolutions: Array<{ conflictId: string; resolution: 'local' | 'server' | 'merge' | 'both' }>) => void
  onCancel: () => void
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  visible,
  conflicts,
  onResolve,
  onCancel
}) => {
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'server' | 'merge' | 'both'>>({})

  if (conflicts.length === 0) {
    return null
  }

  const handleResolve = (conflictId: string, resolution: 'local' | 'server' | 'merge' | 'both') => {
    setResolutions(prev => ({ ...prev, [conflictId]: resolution }))
  }

  const handleApplyAll = () => {
    if (conflicts.length === 0) return

    const allResolutions = conflicts.map(conflict => ({
      conflictId: conflict.localEntry.id,
      resolution: resolutions[conflict.localEntry.id] || 'merge'
    }))

    onResolve(allResolutions)
    setResolutions({})
  }

  const handleCancel = () => {
    Alert.alert(
      'Cancel Conflict Resolution?',
      'You can resolve conflicts later. Your local changes will be preserved.',
      [
        { text: 'Continue Resolving', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            setResolutions({})
            onCancel()
          }
        }
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <FontAwesome5 name="exclamation-triangle" size={24} color="#f59e0b" />
            <View style={styles.headerText}>
              <Text style={styles.title}>Sync Conflicts Detected</Text>
              <Text style={styles.subtitle}>
                {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} found. Choose how to resolve each.
              </Text>
              {Object.keys(resolutions).length > 0 && (
                <Text style={styles.progressText}>
                  {Object.keys(resolutions).length} of {conflicts.length} resolved
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Conflicts List */}
        <ScrollView style={styles.conflictsList} contentContainerStyle={styles.conflictsContent}>
          {conflicts.map((conflict, index) => {
            const conflictId = conflict.localEntry.id
            const selectedResolution = resolutions[conflictId] || 'merge'

            return (
              <View key={conflictId} style={styles.conflictCard}>
                <View style={styles.conflictHeader}>
                  <Text style={styles.conflictTitle}>{conflict.localEntry.name || 'Untitled Entry'}</Text>
                  <Text style={styles.conflictType}>
                    {conflict.conflictType === 'both_modified' ? 'Both Modified' :
                     conflict.conflictType === 'deleted_locally' ? 'Deleted Locally' :
                     'Deleted on Server'}
                  </Text>
                </View>

                {/* Side-by-Side Comparison */}
                <View style={styles.comparisonContainer}>
                  {/* Local Version */}
                  <View style={[
                    styles.versionCard,
                    selectedResolution === 'local' && styles.versionCardSelected
                  ]}>
                    <View style={styles.versionHeader}>
                      <FontAwesome5 name="mobile-alt" size={16} color="#3b82f6" />
                      <Text style={styles.versionLabel}>Local (This Device)</Text>
                    </View>
                    <Text style={styles.versionDate}>
                      {conflict.localEntry.passwordUpdatedAt 
                        ? new Date(conflict.localEntry.passwordUpdatedAt).toLocaleString()
                        : 'Recently modified'}
                    </Text>
                    
                    {/* Entry Details */}
                    <View style={styles.entryDetails}>
                      {conflict.localEntry.name && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Name:</Text>
                          <Text style={[
                            styles.detailValue,
                            conflict.localEntry.name !== conflict.serverEntry.name && styles.detailChanged
                          ]}>
                            {conflict.localEntry.name}
                          </Text>
                        </View>
                      )}
                      {conflict.localEntry.username && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Username:</Text>
                          <Text style={[
                            styles.detailValue,
                            conflict.localEntry.username !== conflict.serverEntry.username && styles.detailChanged
                          ]}>
                            {conflict.localEntry.username}
                          </Text>
                        </View>
                      )}
                      {conflict.localEntry.url && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>URL:</Text>
                          <Text style={[
                            styles.detailValue,
                            conflict.localEntry.url !== conflict.serverEntry.url && styles.detailChanged
                          ]} numberOfLines={1}>
                            {conflict.localEntry.url}
                          </Text>
                        </View>
                      )}
                      {conflict.localEntry.notes && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Notes:</Text>
                          <Text style={[
                            styles.detailValue,
                            conflict.localEntry.notes !== conflict.serverEntry.notes && styles.detailChanged
                          ]} numberOfLines={2}>
                            {conflict.localEntry.notes}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Server Version */}
                  <View style={[
                    styles.versionCard,
                    styles.serverVersion,
                    selectedResolution === 'server' && styles.versionCardSelected
                  ]}>
                    <View style={styles.versionHeader}>
                      <FontAwesome5 name="cloud" size={16} color="#10b981" />
                      <Text style={styles.versionLabel}>Server (Cloud)</Text>
                    </View>
                    <Text style={styles.versionDate}>
                      {conflict.serverEntry.passwordUpdatedAt 
                        ? new Date(conflict.serverEntry.passwordUpdatedAt).toLocaleString()
                        : 'Recently modified'}
                    </Text>
                    
                    {/* Entry Details */}
                    <View style={styles.entryDetails}>
                      {conflict.serverEntry.name && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Name:</Text>
                          <Text style={[
                            styles.detailValue,
                            conflict.serverEntry.name !== conflict.localEntry.name && styles.detailChanged
                          ]}>
                            {conflict.serverEntry.name}
                          </Text>
                        </View>
                      )}
                      {conflict.serverEntry.username && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Username:</Text>
                          <Text style={[
                            styles.detailValue,
                            conflict.serverEntry.username !== conflict.localEntry.username && styles.detailChanged
                          ]}>
                            {conflict.serverEntry.username}
                          </Text>
                        </View>
                      )}
                      {conflict.serverEntry.url && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>URL:</Text>
                          <Text style={[
                            styles.detailValue,
                            conflict.serverEntry.url !== conflict.localEntry.url && styles.detailChanged
                          ]} numberOfLines={1}>
                            {conflict.serverEntry.url}
                          </Text>
                        </View>
                      )}
                      {conflict.serverEntry.notes && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Notes:</Text>
                          <Text style={[
                            styles.detailValue,
                            conflict.serverEntry.notes !== conflict.localEntry.notes && styles.detailChanged
                          ]} numberOfLines={2}>
                            {conflict.serverEntry.notes}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Resolution Options */}
                <View style={styles.resolutionOptions}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      selectedResolution === 'local' && styles.optionButtonSelected
                    ]}
                    onPress={() => handleResolve(conflictId, 'local')}
                  >
                    <FontAwesome5
                      name={selectedResolution === 'local' ? 'check-circle' : 'circle'}
                      size={16}
                      color={selectedResolution === 'local' ? '#3b82f6' : '#94a3b8'}
                    />
                    <Text style={[
                      styles.optionText,
                      selectedResolution === 'local' && styles.optionTextSelected
                    ]}>
                      Keep Local
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      selectedResolution === 'server' && styles.optionButtonSelected
                    ]}
                    onPress={() => handleResolve(conflictId, 'server')}
                  >
                    <FontAwesome5
                      name={selectedResolution === 'server' ? 'check-circle' : 'circle'}
                      size={16}
                      color={selectedResolution === 'server' ? '#10b981' : '#94a3b8'}
                    />
                    <Text style={[
                      styles.optionText,
                      selectedResolution === 'server' && styles.optionTextSelected
                    ]}>
                      Keep Server
                    </Text>
                  </TouchableOpacity>

                  {conflict.conflictType === 'both_modified' && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          selectedResolution === 'merge' && styles.optionButtonSelected
                        ]}
                        onPress={() => handleResolve(conflictId, 'merge')}
                      >
                        <FontAwesome5
                          name={selectedResolution === 'merge' ? 'check-circle' : 'circle'}
                          size={16}
                          color={selectedResolution === 'merge' ? '#8b5cf6' : '#94a3b8'}
                        />
                        <Text style={[
                          styles.optionText,
                          selectedResolution === 'merge' && styles.optionTextSelected
                        ]}>
                          Merge Both
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.optionButton,
                          selectedResolution === 'both' && styles.optionButtonSelected
                        ]}
                        onPress={() => handleResolve(conflictId, 'both')}
                      >
                        <FontAwesome5
                          name={selectedResolution === 'both' ? 'check-circle' : 'circle'}
                          size={16}
                          color={selectedResolution === 'both' ? '#ec4899' : '#94a3b8'}
                        />
                        <Text style={[
                          styles.optionText,
                          selectedResolution === 'both' && styles.optionTextSelected
                        ]}>
                          Keep Both
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )
          })}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Resolve Later</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.resolveButton,
              Object.keys(resolutions).length === 0 && styles.resolveButtonDisabled
            ]}
            onPress={handleApplyAll}
            disabled={conflicts.length === 0 || Object.keys(resolutions).length === 0}
          >
            <Text style={styles.resolveButtonText}>
              {Object.keys(resolutions).length > 0 
                ? `Resolve ${Object.keys(resolutions).length} Selected`
                : `Resolve All (${conflicts.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerText: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4
  },
  progressText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 6
  },
  conflictsList: {
    flex: 1
  },
  conflictsContent: {
    padding: 16
  },
  conflictCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1
  },
  conflictType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  versionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  versionCardSelected: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    backgroundColor: '#eff6ff'
  },
  serverVersion: {
    borderColor: '#10b981',
    borderWidth: 1
  },
  entryDetails: {
    marginTop: 8,
    gap: 6
  },
  detailRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap'
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: 12,
    color: '#0f172a',
    flex: 1
  },
  detailChanged: {
    color: '#f59e0b',
    fontWeight: '600',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  versionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1
  },
  versionDate: {
    fontSize: 11,
    color: '#64748b'
  },
  versionContent: {
    fontSize: 13,
    color: '#475569'
  },
  resolutionOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap'
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  optionButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b'
  },
  optionTextSelected: {
    color: '#1e40af',
    fontWeight: '600'
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b'
  },
  resolveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center'
  },
  resolveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff'
  },
  resolveButtonDisabled: {
    opacity: 0.5
  }
})

export default ConflictResolutionModal

