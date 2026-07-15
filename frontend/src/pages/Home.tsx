import React from 'react'
import Hero from '../components/marketing/Hero'
import Features from '../components/marketing/Features'
import SecurityWorkflow from '../components/marketing/SecurityWorkflow'
import Platforms from '../components/marketing/Platforms'
import CTASection from '../components/marketing/CTASection'
import Footer from '../components/marketing/Footer'
import MarketingHeader from '../components/marketing/MarketingHeader'

interface HomeProps {
  onEnterApp: (mode?: 'signup' | 'login') => void
}

const Home: React.FC<HomeProps> = ({ onEnterApp }) => (
  <div className="sn-page min-h-screen">
    <MarketingHeader onOpenVault={onEnterApp} />
    <main>
      <Hero onEnterApp={onEnterApp} />
      <Features />
      <SecurityWorkflow />
      <Platforms />
      <CTASection onEnterApp={onEnterApp} />
    </main>
    <Footer />
  </div>
)

export default Home
