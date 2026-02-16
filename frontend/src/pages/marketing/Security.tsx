/**
 * Security Page - Rebuilt
 * Concise, scannable security overview
 * 40% less copy than original
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Key, Eye, AlertTriangle, FileCheck, Fingerprint, Database } from 'lucide-react';
import Logo from '../../components/Logo';
import Footer from '../../components/marketing/Footer';

const SecurityPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Lock,
      title: 'AES-256-GCM Encryption',
      description: 'Bank-level encryption. Your data is encrypted on your device before leaving it.'
    },
    {
      icon: Shield,
      title: 'Zero-Knowledge',
      description: 'We can\'t access your passwords. You hold the only key.'
    },
    {
      icon: Key,
      title: 'Argon2id Hashing',
      description: 'Memory-hard algorithm makes brute-force attacks impossible.'
    },
    {
      icon: Eye,
      title: 'Open Source',
      description: 'Audited by security experts. Verify our security yourself.'
    },
    {
      icon: Fingerprint,
      title: 'Biometric Auth',
      description: 'Face ID, Touch ID, Windows Hello. Fast and secure.'
    },
    {
      icon: AlertTriangle,
      title: 'Breach Monitoring',
      description: 'Instant alerts if your credentials appear in data breaches.'
    },
    {
      icon: FileCheck,
      title: 'Regular Audits',
      description: 'Penetration testing and security audits by third parties.'
    },
    {
      icon: Database,
      title: 'Local-First',
      description: 'Data encrypted on your device. Server only sees encrypted blobs.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Logo variant="nav" />
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">
                SafeNode
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/pricing" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium">
                Pricing
              </Link>
              <Link to="/downloads" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium">
                Download
              </Link>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-400 hover:from-secondary-600 hover:to-secondary-500 text-white text-sm font-medium rounded-lg transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Security You Can Trust
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Military-grade encryption. Zero-knowledge architecture. Your passwords are protected by the same technology banks and governments use.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Security Features Grid */}
      <section className="py-16 px-4 bg-white dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Built for Security
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Every feature designed with security-first principles
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-12 text-center">
            How It Works
          </h2>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  You Create a Master Password
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Your master password never leaves your device. It's hashed using Argon2id and used to derive your encryption key.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Data Encrypted Locally
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Every password is encrypted with AES-256-GCM on your device before syncing. We only see encrypted data.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-secondary-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Synced Securely
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Encrypted vault syncs across your devices. Only you can decrypt it with your master password.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
            Technical Details
          </h2>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8">
            <dl className="space-y-6">
              <div>
                <dt className="text-sm font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wide mb-1">
                  Encryption Algorithm
                </dt>
                <dd className="text-lg text-slate-900 dark:text-slate-100">
                  AES-256-GCM with unique IV per entry
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wide mb-1">
                  Key Derivation
                </dt>
                <dd className="text-lg text-slate-900 dark:text-slate-100">
                  Argon2id (memory-hard, GPU-resistant)
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wide mb-1">
                  Authentication
                </dt>
                <dd className="text-lg text-slate-900 dark:text-slate-100">
                  JWT with refresh tokens, optional TOTP 2FA
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wide mb-1">
                  Transport Security
                </dt>
                <dd className="text-lg text-slate-900 dark:text-slate-100">
                  TLS 1.3, HSTS, certificate pinning
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wide mb-1">
                  Audits
                </dt>
                <dd className="text-lg text-slate-900 dark:text-slate-100">
                  Quarterly penetration tests, open-source codebase
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Ready to Secure Your Passwords?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Join thousands who trust SafeNode with their digital security.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-3 bg-gradient-to-r from-secondary-500 to-secondary-400 hover:from-secondary-600 hover:to-secondary-500 text-white font-semibold rounded-lg transition-all shadow-lg"
            >
              Get Started Free
            </button>
            <Link
              to="/pricing"
              className="px-8 py-3 border-2 border-secondary-500 text-secondary-600 dark:text-secondary-400 font-semibold rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-900/20 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SecurityPage;
