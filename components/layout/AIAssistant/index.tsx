'use client';

import React from 'react';
import { AssistantProvider } from './AssistantContext';
import AssistantCharacter from './character/AssistantCharacter';
import AssistantBubble from './AssistantBubble';
import AssistantChat from './AssistantChat';

/**
 * Premium Standalone AI Mascot (Kichu)
 *
 * Redesigned to be a "Miniature Person" standing freely on the site.
 * No circles, no clipping, just pure animation.
 */
export default function AIAssistant() {
  return (
    <AssistantProvider>
      <div
        className="fixed bottom-12 right-6 z-[100] flex flex-col items-end pointer-events-none sm:right-10"
        style={{ pointerEvents: 'auto' }}
      >
        <AssistantBubble />

        <div className="relative group">
          <AssistantCharacter />
        </div>

        <AssistantChat />
      </div>
    </AssistantProvider>
  );
}
