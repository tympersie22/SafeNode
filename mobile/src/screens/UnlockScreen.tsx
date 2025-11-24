/**
 * Unlock Screen
 * Mobile unlock screen with enhanced biometric animation
 */

import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../App'
import { useVault } from '../hooks/useVault'
import * as LocalAuthentication from 'expo-local-authentication'

type Props = NativeStackScreenProps<RootStackParamList, 'Unlock'>

const { width } = Dimensions.get('window')

const UnlockScreen = ({ navigation }: Props) => {
  const {
    masterPassword,
    setMasterPassword,
    unlockVault,
    unlockWithBiometrics,
    enableBiometrics,
    isUnlocking,
    unlockError,
    biometricsAvailable,
    biometricsEnabled
  } = useVault()

  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Animation values
  const fadeAnim = new Animated.Value(0)
  const slideAnim = new Animated.Value(50)
  const lockScaleAnim = new Animated.Value(1)
  const lockRotateAnim = new Animated.Value(0)

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true
      })
    ]).start()

    // Auto-trigger biometrics if enabled
    if (biometricsEnabled && biometricsAvailable) {
      const timer = setTimeout(() => {
        handleBiometricUnlock()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  // Animate lock icon on unlock attempt
  useEffect(() => {
    if (isUnlocking) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(lockScaleAnim, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true
          }),
          Animated.timing(lockScaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true
          })
        ]),
        Animated.sequence([
          Animated.timing(lockRotateAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(lockRotateAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true
          })
        ])
      ]).start()
    }
  }, [isUnlocking])

  const handleUnlock = async () => {
    const success = await unlockVault({ remember: true })
    if (success) {
      navigation.replace('Vault')
    }
  }

  const handleBiometricUnlock = async () => {
    const success = await unlockWithBiometrics()
    if (success) {
      // Success animation
      Animated.parallel([
        Animated.timing(lockScaleAnim, {
          toValue: 1.5,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => {
        navigation.replace('Vault')
      })
    }
  }

  const lockRotation = lockRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg']
  })

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Lock Icon with Animation */}
        <Animated.View
          style={[
            styles.lockContainer,
            {
              transform: [
                { scale: lockScaleAnim },
                { rotate: lockRotation }
              ]
            }
          ]}
        >
          <View style={styles.lockIconWrapper}>
            <FontAwesome5
              name="lock"
              size={48}
              color="#3b82f6"
              style={styles.lockIcon}
            />
            {biometricsEnabled && biometricsAvailable && (
              <View style={styles.biometricBadge}>
                <FontAwesome5 name="fingerprint" size={16} color="#10b981" />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Unlock SafeNode</Text>
        <Text style={styles.subtitle}>Enter your master password to access your vault</Text>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
            <FontAwesome5 name="key" size={18} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Master Password"
              placeholderTextColor="#94a3b8"
              value={masterPassword}
              onChangeText={setMasterPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onSubmitEditing={handleUnlock}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {masterPassword.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <FontAwesome5
                  name={showPassword ? 'eye-slash' : 'eye'}
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            )}
          </View>

          {unlockError && (
            <View style={styles.errorContainer}>
              <FontAwesome5 name="exclamation-circle" size={14} color="#ef4444" />
              <Text style={styles.errorText}>{unlockError}</Text>
            </View>
          )}
        </View>

        {/* Unlock Button */}
        <TouchableOpacity
          style={[styles.unlockButton, isUnlocking && styles.unlockButtonDisabled]}
          onPress={handleUnlock}
          disabled={isUnlocking || !masterPassword}
        >
          {isUnlocking ? (
            <Text style={styles.unlockButtonText}>Unlocking...</Text>
          ) : (
            <>
              <FontAwesome5 name="unlock" size={16} color="#ffffff" />
              <Text style={styles.unlockButtonText}>Unlock Vault</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Biometric Unlock */}
        {biometricsAvailable && (
          <View style={styles.biometricSection}>
            {biometricsEnabled ? (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricUnlock}
                disabled={isUnlocking}
              >
                <FontAwesome5 name="fingerprint" size={24} color="#10b981" />
                <Text style={styles.biometricButtonText}>
                  Unlock with Biometrics
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.enableBiometricButton}
                onPress={enableBiometrics}
              >
                <FontAwesome5 name="fingerprint" size={20} color="#3b82f6" />
                <Text style={styles.enableBiometricText}>Enable Biometric Unlock</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Offline Indicator */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Secure • Private • Encrypted</Text>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    width: width - 48,
    maxWidth: 400,
    alignItems: 'center'
  },
  lockContainer: {
    marginBottom: 32
  },
  lockIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3b82f6',
    position: 'relative'
  },
  lockIcon: {
    transform: [{ scale: 1.2 }]
  },
  biometricBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  inputWrapperFocused: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a'
  },
  eyeButton: {
    padding: 4
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444'
  },
  unlockButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  unlockButtonDisabled: {
    opacity: 0.6
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  biometricSection: {
    width: '100%',
    marginTop: 8
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },
  biometricButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981'
  },
  enableBiometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12
  },
  enableBiometricText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6'
  },
  footer: {
    marginTop: 32
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center'
  }
})

export default UnlockScreen
