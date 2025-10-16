import React from 'react'
import { motion } from 'framer-motion'
import Button from '../ui/Button'

const Platforms: React.FC = () => {
  const platforms = [
    {
      name: "Web App",
      description: "Use SafeNode in your browser. Works offline, installs like a native app.",
      icon: "🌐",
      status: "Available now"
    },
    {
      name: "Desktop App", 
      description: "Native apps for Mac, Windows, and Linux. Built with Tauri for speed and security.",
      icon: "💻",
      status: "Coming soon"
    },
    {
      name: "Browser Extension",
      description: "Auto-fill passwords and generate new ones without leaving your browser.",
      icon: "🔌", 
      status: "In development"
    }
  ]

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Available everywhere
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            SafeNode works on all your devices. Start with the web app, 
            and we'll add more platforms as we grow.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((platform, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="card card-hover card-pressable"
            >
              <div className="card-body text-center">
                <div className="text-4xl mb-3">{platform.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{platform.name}</h3>
                <p className="text-slate-600 text-sm mb-4">{platform.description}</p>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                  platform.status === 'Available now' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {platform.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Platforms
