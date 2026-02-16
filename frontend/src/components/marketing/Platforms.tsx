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
    description: 'Auto-fill passwords seamlessly'
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
    <section className="py-20 px-4 bg-white bg-gray-900">
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
            Works Everywhere
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access your passwords on every device. Synced automatically.
          </p>
        </motion.div>

        {/* Platforms Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PLATFORMS.map((platform, index) => (
            <motion.div
              key={platform.name}
              className="bg-gray-50 bg-gray-800 border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg hover:border-indigo-500 transition-all"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Icon */}
              <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <platform.icon className="w-8 h-8 text-indigo-600" />
              </div>

              {/* Name */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {platform.name}
              </h3>

              {/* Platforms */}
              <p className="text-sm text-gray-600 mb-3">
                {platform.platforms.join(' • ')}
              </p>

              {/* Description */}
              <p className="text-sm text-gray-500">
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
          <p className="text-gray-600 mb-4">
            Download for all your devices
          </p>
          <a
            href="/downloads"
            className="inline-block px-6 py-3 border-2 border-indigo-500 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-all"
          >
            View All Downloads
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Platforms;
