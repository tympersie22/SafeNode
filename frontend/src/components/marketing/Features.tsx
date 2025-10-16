import React from 'react'
import { motion } from 'framer-motion'

const Features: React.FC = () => {
  const features = [
    {
      title: "End-to-end encryption",
      description: "Your passwords are encrypted locally before they ever leave your device. We use AES-256-GCM encryption with Argon2id key derivation.",
      icon: "🔒"
    },
    {
      title: "Zero-knowledge architecture", 
      description: "We cancancan'tapos;tapos;t see your passwords. Your master password never leaves your device, and your encrypted data is stored with us.",
      icon: "🛡️"
    },
    {
      title: "Open source",
      description: "Full transparency. You can audit our code, contribute features, or even run your own instance if you prefer.",
      icon: "📖"
    },
    {
      title: "Works offline",
      description: "Your vault works without internet. Sync when you want to, not when we want you to.",
      icon: "📱"
    },
    {
      title: "No subscription",
      description: "Free forever. No premium tiers, no feature gates, no monthly fees. Just a password manager that works.",
      icon: "💰"
    },
    {
      title: "Cross-platform",
      description: "Web, desktop, and browser extension. Your passwords follow you everywhere, securely.",
      icon: "🌐"
    }
  ]

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Why SafeNode?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            We built SafeNode because existing password managers either compromise on privacy or usability. 
            We don't think you should have to choose.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="card card-hover card-pressable"
            >
              <div className="card-body">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
