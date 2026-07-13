'use client';

import { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import FloatingCartButton from '@/components/layout/FloatingCartButton';
import CookieBanner from '@/components/layout/CookieBanner';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import KichuAssistant from '@/components/assistant/KichuAssistant';
import { StickyMiniCart } from '@/components/layout/CartEnhancements';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      <AnnouncementBar />
      {/*
       * Bottom padding = mobile nav height (var --nav-height) + safe-area-inset-bottom + breathing room.
       * lg:pb-0 removes it on desktop where the bottom nav is hidden.
       * overflow-x-hidden prevents any inner component from causing horizontal scroll on small phones.
       */}
      <main
        className="flex-1 w-full min-w-0 lg:pb-0"
        style={{ paddingBottom: 'calc(var(--nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <Footer />
      <FloatingCartButton />
      <KichuAssistant />
      <StickyMiniCart />
      <MobileNav />
      <CookieBanner />
    </div>
  );
}
