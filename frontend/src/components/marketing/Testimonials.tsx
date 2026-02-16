/**
 * Testimonials Section - Downloads Page Style
 * Clean, modern social proof
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: "Switched from 1Password. Zero-knowledge architecture is unbeatable.",
    author: "Alex Chen",
    role: "Security Engineer",
    rating: 5
  },
  {
    quote: "Finally, a password manager I actually trust with my data.",
    author: "Sarah Martinez",
    role: "Product Manager",
    rating: 5
  },
  {
    quote: "Our whole family uses it. Simple, secure, works everywhere.",
    author: "Michael Brown",
    role: "Small Business Owner",
    rating: 5
  }
];

export const Testimonials: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-20 px-4 bg-slate-50 dark:bg-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Loved by Thousands
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Join security-conscious users protecting their digital lives.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 hover:shadow-lg transition-shadow"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Quote Icon */}
              <Quote className="w-8 h-8 text-secondary-500 mb-4" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-secondary-500 text-secondary-500" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-slate-700 dark:text-slate-300 mb-6 text-lg">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {testimonial.author}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {testimonial.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Badge */}
        <motion.div
          className="text-center mt-12"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-slate-600 dark:text-slate-400">
            ⭐️ ⭐️ ⭐️ ⭐️ ⭐️ Rated 4.9/5 by thousands of users
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
