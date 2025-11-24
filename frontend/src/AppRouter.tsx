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
        
        {/* Main App - handles landing/auth/vault routing internally */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter

