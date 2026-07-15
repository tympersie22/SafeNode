/**
 * Pricing Page - Completely Rebuilt
 * Clean, professional pricing with real Stripe integration
 * 50% less copy, 100% more clarity
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import Footer from '../../components/marketing/Footer';
import MarketingHeader from '../../components/marketing/MarketingHeader';
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
    <div className="sn-page min-h-screen">
      {/* Navigation */}
      <MarketingHeader />

      <section className="sn-section border-b border-[var(--sn-line)]">
        <div className="sn-marketing-container grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
          <p className="sn-eyebrow mb-6">Plans and access</p>
          <h1 className="sn-display max-w-4xl">
            Simple Pricing For Identity And Secret Control
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--sn-muted)]">
            Start free. Upgrade when you need more devices, recovery controls, and team workspaces.
          </p>
          </div>

          <div className="inline-flex border border-[var(--sn-line)] p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 text-sm font-semibold transition ${
                billingCycle === 'monthly'
                  ? 'bg-[var(--sn-ink)] text-[var(--sn-canvas)]'
                  : 'text-[var(--sn-muted)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-3 text-sm font-semibold transition ${
                billingCycle === 'annual'
                  ? 'bg-[var(--sn-ink)] text-[var(--sn-canvas)]'
                  : 'text-[var(--sn-muted)]'
              }`}
            >
              Annual
              <span className="ml-2 text-[var(--sn-accent)] text-xs font-semibold">−17%</span>
            </button>
          </div>
        </div>
      </section>

      <section className="sn-section">
        <div className="sn-marketing-container grid border-l border-t border-[var(--sn-line)] md:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.id;
            const checkoutTarget = getCheckoutTarget(plan, billingCycle);
            const savings = getSavings(plan);

            return (
              <motion.article
                key={plan.id}
                className={`relative flex min-h-[620px] flex-col border-b border-r border-[var(--sn-line)] p-7 ${plan.highlight ? 'bg-[var(--sn-accent-wash)]' : ''}`}
              >
                {plan.highlight && (
                  <div className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sn-accent)]">
                    Recommended / {plan.tagline}
                  </div>
                )}

                <div className="mb-6">
                  <Icon className="mb-5 h-7 w-7 text-[var(--sn-accent)]" />
                  <h3 className="text-2xl font-semibold text-[var(--sn-ink)] dark:text-white">{plan.name}</h3>
                  {!plan.highlight && <p className="mt-2 text-sm text-[var(--sn-muted)]">{plan.tagline}</p>}
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-5xl font-medium tracking-[-0.04em] text-[var(--sn-ink)] dark:text-white">{getPrice(plan)}</span>
                    {plan.price !== 0 && (
                      <span className="text-[var(--sn-muted)]">/mo</span>
                    )}
                  </div>
                  {savings && (
                    <p className="mt-1 text-sm font-semibold text-[var(--sn-accent)]">{savings}</p>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3 border-t border-[var(--sn-line)] pt-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm leading-6 text-[var(--sn-muted)]">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[var(--sn-accent)]" />
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
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="sn-section border-t border-[var(--sn-line)]">
        <div className="sn-marketing-container grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <h2 className="sn-display">
            Frequently Asked Questions
          </h2>
          <div className="grid sm:grid-cols-2">
            <div className="border-t border-[var(--sn-line)] py-6 sm:pr-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Can I switch plans anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes. Upgrade or downgrade anytime. Changes apply immediately.
              </p>
            </div>
            <div className="border-t border-[var(--sn-line)] py-6 sm:pl-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes. All paid plans include a 14-day free trial. No credit card required.
              </p>
            </div>
            <div className="border-t border-[var(--sn-line)] py-6 sm:pr-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                We accept all major credit cards via Stripe. Secure and encrypted.
              </p>
            </div>
            <div className="border-t border-[var(--sn-line)] py-6 sm:pl-8">
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

      <section className="bg-[var(--sn-ink)] py-20 text-white">
        <div className="sn-marketing-container grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
          <h2 className="sn-display text-white">
            Ready to get started?
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-white/55">
            Join teams and individuals protecting access, recovery, and critical secrets with SafeNode.
          </p>
          </div>
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="sn-light-button"
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
