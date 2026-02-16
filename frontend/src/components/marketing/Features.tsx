/**
 * Features Section - Modernized
 * Concise, scannable feature grid
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Shield, Lock, Key, Cloud, Smartphone, Users, Zap, Eye } from 'lucide-react';

const FEATURES = [
  {
    icon: Shield,
    title: 'Military-Grade Encryption',
    description: 'AES-256-GCM encryption. Your data is unreadable, even to us.',
  },
  {
    icon: Lock,
    title: 'Zero-Knowledge',
    description: 'We can\'t access your passwords. Only you hold the key.',
  },
  {
    icon: Key,
    title: 'Secure Sharing',
    description: 'Share passwords safely with team members or family.',
  },
  {
    icon: Cloud,
    title: 'Auto Sync',
    description: 'Seamless sync across all your devices. Always up to date.',
  },
  {
    icon: Smartphone,
    title: 'Biometric Unlock',
    description: 'Face ID, Touch ID, Windows Hello. Fast and secure.',
  },
  {
    icon: Users,
    title: 'Team Vaults',
    description: 'Shared vaults for teams with role-based access control.',
  },
  {
    icon: Zap,
    title: 'Breach Monitoring',
    description: 'Instant alerts if your credentials appear in data breaches.',
  },
  {
    icon: Eye,
    title: 'Open Source',
    description: 'Audited by security experts. Verify our security yourself.',
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
            Everything You Need
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enterprise security. Consumer simplicity. All in one place.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group relative bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-indigo-500 transition-all"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-indigo-600" />
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
