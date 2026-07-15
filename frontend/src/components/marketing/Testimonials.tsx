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
    quote: "Finally, an identity and secret platform I actually trust with recovery and team access.",
    author: "Sarah Martinez",
    role: "Product Manager",
    rating: 5
  },
  {
    quote: "Our whole family uses it. Recovery is clearer, sharing is safer, and it works everywhere.",
    author: "Michael Brown",
    role: "Small Business Owner",
    rating: 5
  }
];

export const Testimonials: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-20 px-4 bg-secondary-50/60 dark:bg-[#0F1A17]/55">
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
            Loved by Thousands
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join security-conscious users protecting their digital lives.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={index}
              className="card card-hover p-8"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Quote Icon */}
              <Quote className="w-8 h-8 text-secondary-300 dark:text-secondary-500 mb-4" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-700 dark:text-gray-200 mb-6 text-lg">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {testimonial.author}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {testimonial.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
