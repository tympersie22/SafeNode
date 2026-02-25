/**
 * App Router
 * Main routing configuration for SafeNode
 */

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import PricingPage from './pages/marketing/Pricing'
import SecurityPage from './pages/marketing/Security'
import DownloadsPage from './pages/marketing/Downloads'
import ContactPage from './pages/marketing/Contact'
import BlogPage from './pages/marketing/Blog'
import BlogPostPage from './pages/marketing/BlogPost'
import CareersPage from './pages/marketing/Careers'
import GettingStartedPage from './pages/docs/GettingStarted'
import TeamsPage from './pages/docs/Teams'
import { SecurityPage as DocsSecurityPage } from './pages/docs/Security'
import BillingPage from './pages/docs/Billing'
import { SettingsPage } from './pages/settings/index'
import { SubscribePage } from './pages/billing/Subscribe'
import { BillingSuccessPage } from './pages/billing/BillingSuccess'
import { BillingCancelPage } from './pages/billing/BillingCancel'
import { ForgotPasswordPage } from './pages/auth/ForgotPassword'
import { ResetPasswordPage } from './pages/auth/ResetPassword'
import { PrivacyPolicyPage } from './pages/marketing/PrivacyPolicy'
import { TermsOfServicePage } from './pages/marketing/TermsOfService'

/**
 * Router wrapper that handles marketing pages separately from the main app
 * The main App component handles its own internal routing (home/auth/vault)
 */
export const AppRouter: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
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

          {/* Auth Pages (public) */}
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

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
      </BrowserRouter>
    </AuthProvider>
  )
}

export default AppRouter
