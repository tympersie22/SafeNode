/**
 * Downloads Page - Completely Rebuilt
 * Clean, professional downloads with official brand logos
 * Auto-detects user's OS and provides one-click download
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Download, Globe2, MonitorDown, Puzzle, ShieldCheck, Smartphone } from 'lucide-react';
import Footer from '../../components/marketing/Footer';
import MarketingHeader from '../../components/marketing/MarketingHeader';
import { RELEASE_VERSION } from '../../config/release';

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
  Firefox: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <path d="M22.418 7.936c-.468-1.187-1.27-2.195-2.248-2.945a9.97 9.97 0 0 0-1.502-.944l-.082-.04c-.145-.068-.334-.154-.487-.217.258.312.55.873.566 1.291l-.003.001c-2.233-1.493-5.45-1.715-8.005-.417C7.154 6.443 5.1 9.824 5.33 13.49c-.423-.393-.8-1.122-.877-1.589a8.426 8.426 0 0 0-.43 2.614c0 4.687 3.87 8.485 8.645 8.485 4.774 0 8.644-3.798 8.644-8.485 0-.27-.014-.54-.04-.804l.002-.001c.65-.867 1.01-2.013 1.01-3.274 0-.886-.177-1.722-.496-2.5zM12.65 21.194c-3.646 0-6.602-2.9-6.602-6.476 0-1.596.589-3.058 1.565-4.187.604.547 1.15.875 1.867 1.099-.79-.962-1.25-2.186-1.216-3.42.027-.998.314-1.912.798-2.69 2.378-1.984 5.79-1.86 7.99-.254.19.137.373.287.547.448-.133-.019-.282-.005-.424.025-.754.158-1.108.852-1.058 1.712.026.457.173.92.433 1.35-.578-.38-1.412-.559-2.2-.244-1.048.418-1.644 1.537-1.54 2.723.11 1.233 1.008 2.232 2.155 2.436.483.087.98.03 1.445-.138-.307.617-.854 1.212-1.49 1.654a4.906 4.906 0 0 1-2.289.845c1.18.662 2.567.873 3.915.565-.98 1.754-2.88 2.952-5.055 2.952z"/>
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

const androidDownloadEnabled = import.meta.env.VITE_ANDROID_DOWNLOAD_ENABLED === 'true';
const androidDownloadUrl = import.meta.env.VITE_ANDROID_DOWNLOAD_URL
  || 'https://github.com/tympersie22/SafeNode/releases/latest/download/SafeNode-Android.apk';

const DOWNLOADS = {
  desktop: [
    {
      name: 'macOS',
      os: 'macos',
      logo: BrandLogos.Apple,
      url: 'https://github.com/tympersie22/SafeNode/releases/latest/download/SafeNode-macOS.dmg',
      size: 'Apple Silicon DMG',
      version: RELEASE_VERSION,
    },
    {
      name: 'Windows',
      os: 'windows',
      logo: BrandLogos.Windows,
      url: 'https://github.com/tympersie22/SafeNode/releases/latest/download/SafeNode-Windows.exe',
      size: 'NSIS installer',
      version: RELEASE_VERSION,
    },
    {
      name: 'Linux',
      os: 'linux',
      logo: BrandLogos.Linux,
      url: 'https://github.com/tympersie22/SafeNode/releases/latest',
      size: 'Release assets',
      version: RELEASE_VERSION,
    },
  ],
  mobile: [
    {
      name: 'iOS',
      os: 'ios',
      logo: BrandLogos.Apple,
      url: '',
      badge: 'Coming soon',
      version: 'Unavailable',
    },
    {
      name: 'Android',
      os: 'android',
      logo: BrandLogos.Android,
      url: androidDownloadEnabled ? androidDownloadUrl : '',
      badge: androidDownloadEnabled ? 'Verified APK' : 'Verification in progress',
      version: androidDownloadEnabled ? RELEASE_VERSION : 'Unavailable',
    },
  ],
  browser: [
    {
      name: 'Chrome',
      logo: BrandLogos.Chrome,
      url: 'https://github.com/tympersie22/SafeNode/releases/latest/download/safenode-extension-chrome.zip',
      cta: 'Download ZIP',
      version: RELEASE_VERSION,
    },
    {
      name: 'Firefox',
      logo: BrandLogos.Firefox,
      url: 'https://github.com/tympersie22/SafeNode/releases/latest/download/safenode-extension-firefox.zip',
      cta: 'Download ZIP',
      version: RELEASE_VERSION,
    },
    {
      name: 'Safari',
      logo: BrandLogos.Apple,
      url: 'https://github.com/tympersie22/SafeNode/releases/latest/download/safenode-extension-safari.zip',
      cta: 'Download ZIP',
      version: RELEASE_VERSION,
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
      const mobileMatch = DOWNLOADS.mobile.find((d) => d.os === userOS);
      if (mobileMatch) return mobileMatch;
    }

    const desktopMatch = DOWNLOADS.desktop.find((d) => d.os === userOS);
    if (desktopMatch?.url) return desktopMatch;
    return DOWNLOADS.desktop[0];
  };

  const primaryDownload = getPrimaryDownload();
  const primaryAvailable = Boolean(primaryDownload.url);

  return (
    <div className="sn-page min-h-screen">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[var(--sn-line)]">
        <div className="sn-hero-grid" aria-hidden="true" />
        <div className="sn-marketing-container relative grid min-h-[650px] items-center gap-14 py-20 lg:grid-cols-[1fr_0.82fr] lg:py-28">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <p className="sn-eyebrow flex items-center gap-3"><Smartphone className="h-4 w-4" /> Mobile comes first</p>
            <h1 className="sn-display mt-7 max-w-4xl">Your secure identity should travel with you.</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--sn-muted)]">
              Put passkeys, recovery access, and encrypted records on the device you already carry. Start on Android today; iOS is in preparation.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {primaryAvailable ? (
                <a href={primaryDownload.url} className="sn-solid-button min-h-12 px-6">
                  <Download className="h-4 w-4" /> Download for {primaryDownload.name}
                </a>
              ) : (
                <span className="sn-outline-button min-h-12 cursor-not-allowed px-6 text-[var(--sn-muted)]">
                  {primaryDownload.name} coming soon
                </span>
              )}
              <Link to="/auth" className="sn-outline-button min-h-12 px-6">Use the web app</Link>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--sn-muted)]">
              Detected platform: {userOS || 'unknown'} / Release {primaryDownload.version}
            </p>
          </motion.div>

          <div className="relative mx-auto w-full max-w-[430px] bg-[var(--sn-ink)] p-5 text-white sm:p-8">
            <div className="flex items-center justify-between border-b border-white/15 pb-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">SafeNode mobile</span>
              <span className="flex items-center gap-2 text-xs text-[var(--sn-accent-soft)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--sn-accent-soft)]" /> Protected</span>
            </div>
            <div className="py-9">
              <div className="flex h-16 w-16 items-center justify-center border border-white/15 bg-white/[0.04]">
                <ShieldCheck className="h-7 w-7 text-[var(--sn-accent-soft)]" />
              </div>
              <h2 className="mt-7 font-serif text-4xl font-medium tracking-[-0.04em]">Identity vault</h2>
              <p className="mt-3 max-w-xs leading-7 text-white/50">Passkey access and recovery posture, available without lowering the cryptographic boundary.</p>
            </div>
            <div className="grid grid-cols-3 border-t border-white/15 pt-5 text-center">
              {['Passkey', 'Recovery', 'Secrets'].map((label) => <span key={label} className="border-l border-white/15 text-xs text-white/45 first:border-l-0">{label}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="sn-section border-b border-[var(--sn-line)]" id="mobile-downloads">
        <div className="sn-marketing-container">
          <div className="grid gap-8 border-b border-[var(--sn-line)] pb-12 lg:grid-cols-[0.7fr_1.3fr]">
            <p className="sn-eyebrow">Mobile apps</p>
            <h2 className="sn-display max-w-4xl">Begin on the device that already holds your passkeys.</h2>
          </div>
          <div className="grid lg:grid-cols-2">
            {DOWNLOADS.mobile.map((platform) => {
              const LogoComponent = platform.logo;
              const available = Boolean(platform.url);
              return (
                <article key={platform.name} className="border-b border-[var(--sn-line)] px-0 py-10 lg:border-r lg:px-10 lg:first:pl-0 lg:last:border-r-0">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex h-12 w-12 items-center justify-center border border-[var(--sn-line)] text-[var(--sn-ink)] dark:text-white"><span className="h-6 w-6"><LogoComponent /></span></div>
                    <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${available ? 'text-[var(--sn-accent)]' : 'text-[var(--sn-muted)]'}`}>{available ? 'Available' : 'In preparation'}</span>
                  </div>
                  <h3 className="mt-8 font-serif text-4xl font-medium tracking-[-0.04em] text-[var(--sn-ink)] dark:text-white">SafeNode for {platform.name}</h3>
                  <p className="mt-4 max-w-lg leading-7 text-[var(--sn-muted)]">
                    {platform.name === 'Android'
                      ? androidDownloadEnabled
                        ? 'Install the verified APK to access passkeys, recovery controls, and your encrypted vault on Android.'
                        : 'The Android build is undergoing signing and passkey verification before downloads reopen.'
                      : 'The iOS release is not available yet. We will publish a verified App Store build when it is ready.'}
                  </p>
                  <div className="mt-8">
                    {available ? (
                      <a href={platform.url} className="sn-solid-button"><Download className="h-4 w-4" /> Download verified APK</a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center border border-[var(--sn-line)] px-4 text-sm font-semibold text-[var(--sn-muted)]">
                        {platform.name === 'Android' ? 'Verification in progress' : 'Not available yet'}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="sn-section border-b border-[var(--sn-line)]">
        <div className="sn-marketing-container grid gap-16 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-3"><MonitorDown className="h-5 w-5 text-[var(--sn-accent)]" /><h2 className="text-2xl font-semibold text-[var(--sn-ink)] dark:text-white">Desktop apps</h2></div>
            <div className="mt-7 border-t border-[var(--sn-line)]">
              {DOWNLOADS.desktop.map((platform) => {
                const LogoComponent = platform.logo;
                return (
                  <a key={platform.name} href={platform.url} className="grid grid-cols-[40px_1fr_auto] items-center gap-4 border-b border-[var(--sn-line)] py-5 text-[var(--sn-ink)] transition-colors hover:text-[var(--sn-accent)] dark:text-white">
                    <span className="h-5 w-5"><LogoComponent /></span>
                    <span><span className="block text-sm font-semibold">{platform.name}</span><span className="mt-1 block text-xs text-[var(--sn-muted)]">{platform.size} / {platform.version}</span></span>
                    <Download className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3"><Puzzle className="h-5 w-5 text-[var(--sn-accent)]" /><h2 className="text-2xl font-semibold text-[var(--sn-ink)] dark:text-white">Browser extensions</h2></div>
            <div className="mt-7 border-t border-[var(--sn-line)]">
              {DOWNLOADS.browser.map((platform) => {
                const LogoComponent = platform.logo;
                return (
                  <a key={platform.name} href={platform.url} className="grid grid-cols-[40px_1fr_auto] items-center gap-4 border-b border-[var(--sn-line)] py-5 text-[var(--sn-ink)] transition-colors hover:text-[var(--sn-accent)] dark:text-white">
                    <span className="h-5 w-5"><LogoComponent /></span>
                    <span><span className="block text-sm font-semibold">{platform.name}</span><span className="mt-1 block text-xs text-[var(--sn-muted)]">Manual ZIP install / {platform.version}</span></span>
                    <Download className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--sn-ink)] py-20 text-white">
        <div className="sn-marketing-container grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="sn-eyebrow text-[var(--sn-accent-soft)]">No installation required</p>
            <h2 className="sn-display mt-6 max-w-4xl text-white">Open SafeNode in a modern browser.</h2>
            <div className="mt-7 flex flex-wrap gap-6 text-sm text-white/50">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--sn-accent-soft)]" /> Encrypted vault sync</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--sn-accent-soft)]" /> Device-aware access</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--sn-accent-soft)]" /> Passkey-first sign-in</span>
            </div>
          </div>
          <Link to="/auth" className="sn-light-button"><Globe2 className="h-4 w-4" /> Open web app <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DownloadsNewPage;
