/**
 * App Router
 * Main routing configuration for SafeNode
 */

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import { PricingPage } from './pages/marketing/Pricing'
import { SecurityPage } from './pages/marketing/Security'
import DownloadsPage from './pages/marketing/Downloads'
import { ContactPage } from './pages/marketing/Contact'
import GettingStartedPage from './pages/docs/GettingStarted'
import TeamsPage from './pages/docs/Teams'
import { SecurityPage as DocsSecurityPage } from './pages/docs/Security'
import BillingPage from './pages/docs/Billing'
import { SettingsPage } from './pages/settings/index'
import { SubscribePage } from './pages/billing/Subscribe'

/**
 * Router wrapper that handles marketing pages separately from the main app
 * The main App component handles its own internal routing (landing/auth/vault)
 */
export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Marketing Pages - accessible without authentication */}
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        
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
        
        {/* Main App - handles landing/auth/vault routing internally */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter

