/**
 * Pricing Page - Completely Rebuilt
 * Clean, professional pricing with real Stripe integration
 * 50% less copy, 100% more clarity
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Logo from '../../components/Logo';
import Footer from '../../components/marketing/Footer';
import { Spinner } from '../../components/ui/Spinner';
import { showToast } from '../../components/ui/Toast';
import { createCheckoutSession } from '../../services/billingService';
import { getCurrentUser } from '../../services/authService';
import { PRICING_PLANS, type PricingPlan, getCheckoutTarget, getPlanMonthlyPrice } from '../../config/pricingPlans';

export const PricingNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, checkoutTarget?: { provider: 'paddle' | 'stripe'; value: string } | null) => {
    if (planId === 'free') {
      navigate('/auth?mode=signup');
      return;
    }

    if (!checkoutTarget) {
      showToast.error('Checkout is not configured for this plan yet.');
      return;
    }

    try {
      setLoading(planId);

      // Check if user is logged in
      const user = await getCurrentUser();
      if (!user) {
        // Redirect to signup with plan pre-selected
        navigate(`/auth?mode=signup&plan=${planId}`);
        return;
      }

      // Create Stripe checkout session
      const { url } = await createCheckoutSession(checkoutTarget.value);

      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url;
      } else {
        showToast.error('Failed to start checkout');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      showToast.error(error.message || 'Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  const getPrice = (plan: PricingPlan) => getPlanMonthlyPrice(plan, billingCycle);

  const getSavings = (plan: PricingPlan) => {
    if (typeof plan.price !== 'object' || billingCycle === 'monthly') return null;

    const monthlyCost = plan.price.monthly * 12;
    const annualCost = plan.price.annual;
    const savings = ((monthlyCost - annualCost) / monthlyCost * 100).toFixed(0);

    return `Save ${savings}%`;
  };

  return (
    <div className="min-h-screen bg-transparent text-gray-900 dark:text-gray-100">
      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-[#1E2E29] bg-white/80 dark:bg-[#0F1A17]/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="nav" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">SafeNode</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-secondary-700 dark:hover:text-secondary-300 text-sm font-medium">
              Home
            </Link>
            <Link to="/auth" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
            Simple Pricing For Identity And Secret Control
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Start free. Upgrade when you need more devices, recovery controls, and team workspaces.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1 bg-gray-100 dark:bg-[#13211D] rounded-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-[#0F1A17] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-full font-medium transition ${
                billingCycle === 'annual'
                  ? 'bg-white dark:bg-[#0F1A17] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Annual
              <span className="ml-2 text-green-600 text-sm font-semibold">Save 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_PLANS.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.id;
            const checkoutTarget = getCheckoutTarget(plan, billingCycle);
            const savings = getSavings(plan);

            return (
              <motion.div
                key={plan.id}
                className={`card relative p-8 ${
                  plan.highlight
                    ? 'border-secondary-400 shadow-safenode-lg scale-105'
                    : ''
                }`}
                whileHover={{ y: -4 }}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-safenode text-white text-sm font-semibold rounded-full shadow-safenode-md">
                    {plan.tagline}
                  </div>
                )}

                <div className="mb-6">
                  <Icon className={`w-10 h-10 mb-4 ${plan.highlight ? 'text-secondary-600 dark:text-secondary-300' : 'text-gray-600 dark:text-gray-300'}`} />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                  {!plan.highlight && <p className="text-sm text-gray-600 dark:text-gray-300">{plan.tagline}</p>}
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{getPrice(plan)}</span>
                    {plan.price !== 0 && (
                      <span className="text-gray-600 dark:text-gray-300">/mo</span>
                    )}
                  </div>
                  {savings && (
                    <p className="text-sm text-green-600 font-semibold mt-1">{savings}</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id, checkoutTarget)}
                  disabled={isLoading}
                  className={`btn w-full ${
                    plan.highlight
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                >
                  {isLoading && <Spinner size="sm" color={plan.highlight ? 'white' : 'primary'} />}
                  {plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white/70 dark:bg-[#0F1A17]/55">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Can I switch plans anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes. Upgrade or downgrade anytime. Changes apply immediately.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes. All paid plans include a 14-day free trial. No credit card required.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                We accept all major credit cards via Stripe. Secure and encrypted.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes. Cancel anytime. No questions asked. Your data stays yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-secondary-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join teams and individuals protecting access, recovery, and critical secrets with SafeNode.
          </p>
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="btn btn-primary btn-lg"
          >
            Start Free Today
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingNewPage;
