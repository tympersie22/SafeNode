/**
 * Features Section - Modernized
 * Concise, scannable feature grid
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Shield, Lock, Key, Cloud, Smartphone, Users, Zap, Eye } from 'lucide-react';

const FEATURES = [
  {
    icon: Key,
    title: 'Passkey-First Sign-In',
    description: 'Sign in with passkeys and trusted devices instead of reusable passwords.',
  },
  {
    icon: Lock,
    title: 'Zero-Knowledge',
    description: 'Your encrypted vault remains unreadable to us, even while identity and recovery flows evolve.',
  },
  {
    icon: Shield,
    title: 'Recovery-Ready Security',
    description: 'Recovery material, successor access, and device controls are designed into the platform from the start.',
  },
  {
    icon: Cloud,
    title: 'Trusted Device Sync',
    description: 'Keep your identity state, encrypted records, and device posture aligned across sessions and hardware.',
  },
  {
    icon: Smartphone,
    title: 'Biometric Unlock',
    description: 'Use Face ID, Touch ID, or platform biometrics to unlock trusted devices quickly and safely.',
  },
  {
    icon: Users,
    title: 'Team Secret Workspaces',
    description: 'Give teams dedicated shared vaults for operational credentials, recovery material, and critical access.',
  },
  {
    icon: Zap,
    title: 'Security Posture',
    description: 'Track breach exposure, weak credentials, risky sessions, and device state from one control surface.',
  },
  {
    icon: Eye,
    title: 'Open-Core Assurance',
    description: 'The cryptographic core stays reviewable while operational controls, audit, and recovery flows stay hardened.',
  },
];

const Features: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="features" className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            One Platform For Modern Access
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Passkey-first identity, zero-knowledge vaults, recovery controls, and team secrets in one operating layer.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-400 transition-all"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-gray-950 transition-all duration-200">
                <feature.icon className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors duration-200" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
