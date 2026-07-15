/**
 * Platforms Section - Downloads Page Style
 * Clean platform compatibility showcase
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Monitor, Smartphone, Globe, Laptop } from 'lucide-react';

const PLATFORMS = [
  {
    icon: Monitor,
    name: 'Desktop Apps',
    platforms: ['Windows', 'macOS', 'Linux'],
    description: 'Native apps with biometric unlock'
  },
  {
    icon: Smartphone,
    name: 'Mobile Apps',
    platforms: ['iOS', 'Android'],
    description: 'Face ID, Touch ID support'
  },
  {
    icon: Globe,
    name: 'Browser Extensions',
    platforms: ['Chrome', 'Firefox', 'Safari', 'Edge'],
    description: 'Autofill and trusted access flows'
  },
  {
    icon: Laptop,
    name: 'Web Access',
    platforms: ['Any Browser'],
    description: 'Access from anywhere'
  }
];

export const Platforms: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-20 px-4 bg-white/70 dark:bg-transparent">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Works Everywhere
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Access your identity vault, recovery tools, and trusted device flows on every platform.
          </p>
        </motion.div>

        {/* Platforms Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PLATFORMS.map((platform, index) => (
            <motion.div
              key={platform.name}
              className="card card-hover p-6 text-center"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Icon */}
              <div className="w-16 h-16 bg-secondary-50 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                <platform.icon className="w-8 h-8 text-secondary-700 dark:text-secondary-300" />
              </div>

              {/* Name */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {platform.name}
              </h3>

              {/* Platforms */}
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {platform.platforms.join(' • ')}
              </p>

              {/* Description */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {platform.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Download for all your devices
          </p>
          <a
            href="/downloads"
            className="btn btn-primary btn-lg"
          >
            View All Downloads
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Platforms;
