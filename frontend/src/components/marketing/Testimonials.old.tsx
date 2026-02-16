/**
 * Testimonials Section
 * Social proof with real user testimonials
 */

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface Testimonial {
  quote: string
  author: string
  role: string
  company?: string
  avatar: string
}

const testimonials: Testimonial[] = [
  {
    quote: "I was paranoid about password managers. SafeNode proved my data is actually in *my* control.",
    author: "Alice Chen",
    role: "Security Engineer",
    avatar: "👩‍💻"
  },
  {
    quote: "I switched from 1Password. The zero-knowledge architecture makes me sleep at night.",
    author: "Marcus W.",
    role: "Freelancer",
    avatar: "👨‍💼"
  },
  {
    quote: "Our family uses it for shared credentials. We trust SafeNode completely.",
    author: "Jennifer P.",
    role: "Parent",
    avatar: "👩"
  }
]

export const Testimonials: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Trusted by Security-Conscious Users
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Real people protecting their digital lives
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={prefersReducedMotion ? {} : { y: -4 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-safenode-primary/10 flex items-center justify-center text-2xl">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {testimonial.role}
                    {testimonial.company && ` at ${testimonial.company}`}
                  </div>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">
                "{testimonial.quote}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
