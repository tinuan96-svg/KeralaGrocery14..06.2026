'use client';

import React, { useState, useEffect } from 'react';
import KichuAvatar from './KichuAvatar';
import KichuSpeechBubble from './KichuSpeechBubble';
import AssistantChat from './AssistantChat';
import { AssistantProvider, useAssistant } from './AssistantContext';

function KichuAssistantContent() {
  const { isOpen, setIsOpen, emotion, setEmotion, bubbleText, setBubbleText } = useAssistant();
  const { cart, cartCount } = useCartData();
  const lastCartCount = useRef(cartCount);

  // 1. Smart Upselling Logic (Watch Cart)
  useEffect(() => {
    if (cartCount > lastCartCount.current) {
      const lastAdded = cart[cart.length - 1];
      if (lastAdded?.name.toLowerCase().includes('rice')) {
        setBubbleText("Excellent choice! 🥥 Need some Pappadam or Coconut Oil to go with that rice?");
        setEmotion('happy');
      } else if (lastAdded?.name.toLowerCase().includes('tea')) {
        setBubbleText("Tea time! ☕ How about some Banana Chips or Biscuits?");
        setEmotion('happy');
      }
    }
    lastCartCount.current = cartCount;
  }, [cart, cartCount, setBubbleText, setEmotion]);

  const handleAvatarClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setEmotion('happy');
      setBubbleText("🙏 Namaskaram! How can I help today?");
    }
  };

  return (
    <div className="fixed bottom-[calc(var(--nav-height,60px)+12px)] left-4 z-[100] flex flex-col items-start pointer-events-none sm:left-8 sm:bottom-8">
      <div className="pointer-events-auto flex flex-col items-start">
        <KichuSpeechBubble text={bubbleText} onClose={() => setBubbleText(null)} />
        <KichuAvatar
          emotion={emotion}
          isOpen={isOpen}
          onClick={handleAvatarClick}
        />
      </div>
      <AssistantChat />
    </div>
  );
}

export default function KichuAssistant() {
  return (
    <AssistantProvider>
      <KichuAssistantContent />
    </AssistantProvider>
  );
}
