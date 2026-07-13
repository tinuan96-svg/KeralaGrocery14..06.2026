'use client';

import React from 'react';
import { AssistantProvider } from './AssistantContext';
import AssistantAvatar from './AssistantAvatar';
import AssistantBubble from './AssistantBubble';
import AssistantChat from './AssistantChat';

/**
 * Premium AI Assistant (Kichu)
 *
 * Features:
 * - Animated Kathakali Mascot
 * - Expressive Speech Bubbles
 * - Real-time Shopping Context (Cart, Wallet, Tracking)
 * - Glassmorphism Chat Interface
 * - Voice Input Support
 */
export default function AIAssistant() {
  return (
    <AssistantProvider>
      <div className="fixed bottom-24 left-6 z-[100] flex flex-col items-start lg:block hidden-gpu">
        <AssistantBubble />
        <AssistantAvatar />
        <AssistantChat />
      </div>

      {/* Mobile view - ensure safe areas and no overlap */}
      <div className="lg:hidden fixed bottom-24 left-4 z-[100] safe-area-inset-bottom">
        <AssistantBubble />
        <AssistantAvatar />
        <AssistantChat />
      </div>
    </AssistantProvider>
  );
}
