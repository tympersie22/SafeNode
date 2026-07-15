/**
 * App Router
 * Main routing configuration for SafeNode
 */

import React, { Suspense, lazy } from 'react'
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Spinner } from './components/ui/Spinner'

const App = lazy(() => import('./App'))
const PricingPage = lazy(() => import('./pages/marketing/Pricing'))
const SecurityPage = lazy(() => import('./pages/marketing/Security'))
const DownloadsPage = lazy(() => import('./pages/marketing/Downloads'))
const ContactPage = lazy(() => import('./pages/marketing/Contact'))
const BlogPage = lazy(() => import('./pages/marketing/Blog'))
const BlogPostPage = lazy(() => import('./pages/marketing/BlogPost'))
const CareersPage = lazy(() => import('./pages/marketing/Careers'))
const GettingStartedPage = lazy(() => import('./pages/docs/GettingStarted'))
const TeamsPage = lazy(() => import('./pages/docs/Teams'))
const DocsSecurityPage = lazy(() => import('./pages/docs/Security').then(({ SecurityPage }) => ({ default: SecurityPage })))
const BillingPage = lazy(() => import('./pages/docs/Billing'))
const BillingSuccessPage = lazy(() => import('./pages/billing/BillingSuccess').then(({ BillingSuccessPage }) => ({ default: BillingSuccessPage })))
const BillingCancelPage = lazy(() => import('./pages/billing/BillingCancel').then(({ BillingCancelPage }) => ({ default: BillingCancelPage })))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPassword').then(({ ForgotPasswordPage }) => ({ default: ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPassword').then(({ ResetPasswordPage }) => ({ default: ResetPasswordPage })))
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmail'))
const SuccessorClaimPage = lazy(() => import('./pages/auth/SuccessorClaim'))
const PrivacyPolicyPage = lazy(() => import('./pages/marketing/PrivacyPolicy').then(({ PrivacyPolicyPage }) => ({ default: PrivacyPolicyPage })))
const TermsOfServicePage = lazy(() => import('./pages/marketing/TermsOfService').then(({ TermsOfServicePage }) => ({ default: TermsOfServicePage })))
const RefundPolicyPage = lazy(() => import('./pages/marketing/RefundPolicy').then(({ RefundPolicyPage }) => ({ default: RefundPolicyPage })))

const RouteFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading page">
    <Spinner size="lg" />
  </div>
)

/**
 * Router wrapper that handles marketing pages separately from the main app
 * The main App component handles its own internal routing (home/auth/vault)
 */
export const AppRouter: React.FC = () => {
  const RouterComponent =
    typeof window !== 'undefined' &&
    ('__TAURI__' in window || !/^https?:$/.test(window.location.protocol))
      ? HashRouter
      : BrowserRouter

  return (
    <AuthProvider>
      <RouterComponent>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          {/* Marketing Pages - accessible without authentication */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/careers" element={<CareersPage />} />
          
          {/* Legal Pages */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/refunds" element={<RefundPolicyPage />} />

          {/* Auth Pages (public) */}
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/verify" element={<VerifyEmailPage />} />
          <Route path="/auth/successor" element={<SuccessorClaimPage />} />

          {/* Billing Result Pages */}
          <Route path="/billing/success" element={<BillingSuccessPage />} />
          <Route path="/billing/cancel" element={<BillingCancelPage />} />

          {/* Documentation Pages */}
          <Route path="/docs/getting-started" element={<GettingStartedPage />} />
          <Route path="/docs/teams" element={<TeamsPage />} />
          <Route path="/docs/security" element={<DocsSecurityPage />} />
          <Route path="/docs/billing" element={<BillingPage />} />
          
          {/* Settings Pages - require authentication (handled by App component) */}
          <Route path="/settings" element={<App />} />
          <Route path="/settings/*" element={<App />} />
          
          {/* Billing Pages - require authentication (handled by App component) */}
          <Route path="/billing" element={<App />} />
          <Route path="/billing/*" element={<App />} />
          
          {/* SSO Callback Routes */}
          <Route path="/auth/sso/callback" element={<App />} />
          <Route path="/auth/sso/error" element={<App />} />
          
          {/* Main App - handles home/auth/vault routing internally */}
          <Route path="/*" element={<App />} />
          </Routes>
        </Suspense>
      </RouterComponent>
    </AuthProvider>
  )
}

export default AppRouter
