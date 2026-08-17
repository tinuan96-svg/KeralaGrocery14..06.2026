'use client';

import React, { useState, useEffect, useRef } from 'react';
import KichuAvatar from './KichuAvatar';
import KichuSpeechBubble from './KichuSpeechBubble';
import AssistantChat from './AssistantChat';
import { AssistantProvider, useAssistant } from './AssistantContext';
import { useCartData } from '@/lib/context/CartContext';

function KichuAssistantContent() {
  const { isOpen, setIsOpen, emotion, setEmotion, bubbleText, setBubbleText } = useAssistant();
  const { cart, cartCount } = useCartData();
  const lastCartCount = useRef(cartCount);
  const lastCartRef = useRef(cart);

  // 1. Smart Upselling Logic (Watch Cart)
  useEffect(() => {
    if (cartCount > lastCartCount.current) {
      // Find which item was added or quantity increased
      const justAdded = cart.find(item => {
        const prevItem = lastCartRef.current.find(p => p.id === item.id);
        return !prevItem || item.quantity > prevItem.quantity;
      });

      if (justAdded) {
        const name = justAdded.name.toLowerCase();
        if (name.includes('rice')) {
          setBubbleText("Excellent choice! 🥥 Need some Pappadam or Coconut Oil to go with that rice?");
          setEmotion('happy');
        } else if (name.includes('tea')) {
          setBubbleText("Tea time! ☕ How about some Banana Chips or Biscuits?");
          setEmotion('happy');
        } else if (name.includes('masala') || name.includes('curry')) {
          setBubbleText("Cooking something spicy? 🌶️ Need any extra coconut milk or ginger?");
          setEmotion('excited');
        } else if (name.includes('snack') || name.includes('chips')) {
          setBubbleText("Crunchy! 😋 These are favorites. Want to see more snacks?");
          setEmotion('happy');
        }
      }
    }
    lastCartCount.current = cartCount;
    lastCartRef.current = cart;
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
