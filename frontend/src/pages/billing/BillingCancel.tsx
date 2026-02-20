/**
 * Billing Cancel Page
 * Shown when user cancels Stripe checkout
 */

import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react'

export const BillingCancelPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Cancel Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6"
        >
          <XCircle className="w-12 h-12 text-gray-400" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-gray-900 mb-3"
        >
          Checkout Cancelled
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-gray-600 mb-2"
        >
          Your account has not been charged.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-gray-500 mb-8"
        >
          You can try again anytime, or continue using SafeNode Free.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          <button
            onClick={() => navigate('/pricing')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-950 hover:bg-gray-800 text-white font-semibold rounded-xl transition min-h-[44px]"
          >
            <CreditCard className="w-5 h-5" />
            View Plans
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl transition min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Vault
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default BillingCancelPage
