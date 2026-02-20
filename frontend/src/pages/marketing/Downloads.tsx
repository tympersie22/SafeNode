/**
 * Downloads Page - Completely Rebuilt
 * Clean, professional downloads with official brand logos
 * Auto-detects user's OS and provides one-click download
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download, Check } from 'lucide-react';
import Logo from '../../components/Logo';
import Footer from '../../components/marketing/Footer';

// Official Brand Logos (using Simple Icons CDN or inline SVG)
const BrandLogos = {
  Apple: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  ),
  Windows: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  ),
  Linux: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .72-.098.998-.195.27-.135.52-.267.704-.4.02-.008.04-.022.056-.04.015.036.039.073.065.107.052.067.115.135.184.198.276.355.656.598 1.04.598zm-4.137.993c-.134 0-.27.005-.401.02a1.008 1.008 0 00-.383.129c-.534.334-.535.871-.004 1.206.53.334 1.394.334 1.928 0 .535-.335.534-.872.004-1.206a1.143 1.143 0 00-.399-.13 2.23 2.23 0 00-.745-.02zm2.752.011a1.009 1.009 0 00-.402.13c-.535.334-.534.871-.004 1.205.53.335 1.394.335 1.929 0 .534-.334.534-.871-.004-1.206a1.013 1.013 0 00-.383-.128 2.23 2.23 0 00-.745-.021 2.226 2.226 0 00-.391.02zM10.11 17.81c-.03.07-.038.12-.044.16.008-.042.021-.086.044-.16z"/>
    </svg>
  ),
  Chrome: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728z"/>
    </svg>
  ),
  Android: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <path d="M17.523 15.341c-.808 0-1.463-.653-1.463-1.461s.655-1.461 1.463-1.461 1.463.653 1.463 1.461-.655 1.461-1.463 1.461zm-11.046 0c-.808 0-1.463-.653-1.463-1.461s.655-1.461 1.463-1.461 1.463.653 1.463 1.461-.655 1.461-1.463 1.461zm11.405-6.936l1.834-3.178a.298.298 0 0 0-.103-.41.295.295 0 0 0-.41.103l-1.858 3.217a14.158 14.158 0 0 0-5.345-1.036 14.163 14.163 0 0 0-5.346 1.036L5.796 5.92a.294.294 0 0 0-.41-.103.298.298 0 0 0-.103.41l1.834 3.178C2.797 11.074 0 14.868 0 19.264h24c0-4.396-2.797-8.19-7.118-9.859z"/>
    </svg>
  ),
};

const detectOS = (): 'android' | 'ios' | 'windows' | 'macos' | 'linux' | null => {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent || '';

  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Win/.test(ua)) return 'windows';
  if (/Mac/.test(ua)) return 'macos';
  if (/Linux/.test(ua) && !/Android/.test(ua)) return 'linux';

  return null;
};

const DOWNLOADS = {
  desktop: [
    {
      name: 'macOS',
      os: 'macos',
      logo: BrandLogos.Apple,
      url: 'https://github.com/safenode/releases/latest/SafeNode-macOS.dmg',
      size: '89 MB',
      version: '1.0.0',
    },
    {
      name: 'Windows',
      os: 'windows',
      logo: BrandLogos.Windows,
      url: 'https://github.com/safenode/releases/latest/SafeNode-Windows.exe',
      size: '75 MB',
      version: '1.0.0',
    },
    {
      name: 'Linux',
      os: 'linux',
      logo: BrandLogos.Linux,
      url: 'https://github.com/safenode/releases/latest/SafeNode-Linux.AppImage',
      size: '82 MB',
      version: '1.0.0',
    },
  ],
  mobile: [
    {
      name: 'iOS',
      os: 'ios',
      logo: BrandLogos.Apple,
      url: 'https://apps.apple.com/app/safenode',
      badge: 'App Store',
    },
    {
      name: 'Android',
      os: 'android',
      logo: BrandLogos.Android,
      url: 'https://play.google.com/store/apps/details?id=com.safenode',
      badge: 'Google Play',
    },
  ],
  browser: [
    {
      name: 'Chrome',
      logo: BrandLogos.Chrome,
      url: 'https://chrome.google.com/webstore/detail/safenode',
    },
  ],
};

export const DownloadsNewPage: React.FC = () => {
  const [userOS, setUserOS] = useState<string | null>(null);

  useEffect(() => {
    setUserOS(detectOS());
  }, []);

  const getPrimaryDownload = () => {
    if (!userOS) return DOWNLOADS.desktop[0]; // Default to macOS

    const isMobile = userOS === 'ios' || userOS === 'android';
    if (isMobile) {
      return DOWNLOADS.mobile.find((d) => d.os === userOS) || DOWNLOADS.mobile[0];
    }

    return DOWNLOADS.desktop.find((d) => d.os === userOS) || DOWNLOADS.desktop[0];
  };

  const primaryDownload = getPrimaryDownload();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="nav" />
            <span className="text-xl font-bold text-gray-900">SafeNode</span>
          </Link>
          <Link
            to="/auth"
            className="px-4 py-2 bg-gray-950 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero + Primary Download */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            Download SafeNode
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Secure your passwords on any device. Always encrypted.
          </p>

          {/* Primary Download Button */}
          <motion.a
            href={primaryDownload.url}
            className="inline-flex items-center gap-4 px-8 py-4 bg-gray-950 hover:bg-gray-800 text-white text-lg font-semibold rounded-xl transition shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-8 h-8 text-white">
              {primaryDownload.logo && <primaryDownload.logo />}
            </div>
            <span>Download for {primaryDownload.name}</span>
            <Download className="w-5 h-5" />
          </motion.a>

          {(primaryDownload as any).size && (
            <p className="mt-4 text-sm text-gray-500">
              Version {(primaryDownload as any).version} • {(primaryDownload as any).size}
            </p>
          )}
        </div>
      </section>

      {/* Platform Sections */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 space-y-16">
          {/* Desktop */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Desktop</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DOWNLOADS.desktop.map((platform) => {
                const LogoComponent = platform.logo;
                return (
                  <motion.a
                    key={platform.name}
                    href={platform.url}
                    className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition"
                    whileHover={{ y: -4 }}
                  >
                    <div className="w-12 h-12 text-gray-700 mb-4">
                      <LogoComponent />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{platform.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Version {platform.version} • {platform.size}
                    </p>
                    <div className="flex items-center gap-2 text-gray-900 font-medium">
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Mobile */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Mobile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {DOWNLOADS.mobile.map((platform) => {
                const LogoComponent = platform.logo;
                return (
                  <motion.a
                    key={platform.name}
                    href={platform.url}
                    className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition"
                    whileHover={{ y: -4 }}
                  >
                    <div className="w-12 h-12 text-gray-700 mb-4">
                      <LogoComponent />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{platform.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Download from {platform.badge}
                    </p>
                    <div className="flex items-center gap-2 text-gray-900 font-medium">
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Browser Extension */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Browser Extension</h2>
            <motion.a
              href={DOWNLOADS.browser[0].url}
              className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition max-w-md"
              whileHover={{ y: -4 }}
            >
              <div className="w-12 h-12 text-gray-700 mb-4">
                <BrandLogos.Chrome />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chrome Extension</h3>
              <p className="text-sm text-gray-600 mb-4">
                Auto-fill passwords on any website
              </p>
              <div className="flex items-center gap-2 text-gray-900 font-medium">
                <Download className="w-4 h-4" />
                <span>Add to Chrome</span>
              </div>
            </motion.a>
          </div>

          {/* Web App */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Web App</h2>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Download Needed</h3>
              <p className="text-gray-600 mb-6">
                Access SafeNode instantly in your browser. Works on any device.
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-950 hover:bg-gray-800 text-white font-semibold rounded-lg transition"
              >
                <Check className="w-5 h-5" />
                <span>Open Web App</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            Sync Across All Devices
          </h2>
          <div className="grid grid-cols-3 gap-8 text-sm text-gray-600">
            <div>
              <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p>Real-time sync</p>
            </div>
            <div>
              <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p>End-to-end encrypted</p>
            </div>
            <div>
              <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p>Offline access</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DownloadsNewPage;
