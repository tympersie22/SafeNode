/**
 * Footer Component
 * Marketing page footer with links and info
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Logo from '../Logo'

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-900 dark:bg-black text-slate-400 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Logo variant="nav" />
              <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                <h3 className="text-xl font-bold text-white">SafeNode</h3>
              </Link>
            </div>
            <p className="text-slate-400 mb-4 max-w-md leading-relaxed">
              The zero-knowledge password manager built for the modern web. 
              Secure, private, and always in your control.
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Open Source</span>
              <span className="text-slate-600">•</span>
              <span>MIT License</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="/#features" className="hover:text-white transition-colors text-sm">Features</a></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors text-sm">Pricing</Link></li>
              <li><Link to="/security" className="hover:text-white transition-colors text-sm">Security</Link></li>
              <li><Link to="/downloads" className="hover:text-white transition-colors text-sm">Download</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="/#about" className="hover:text-white transition-colors text-sm">About</a></li>
              <li><a href="/#blog" className="hover:text-white transition-colors text-sm">Blog</a></li>
              <li><a href="/#careers" className="hover:text-white transition-colors text-sm">Careers</a></li>
              <li><Link to="/contact" className="hover:text-white transition-colors text-sm">Contact</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            &copy; {currentYear} SafeNode. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
