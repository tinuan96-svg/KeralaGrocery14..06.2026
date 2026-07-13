'use client';

import React, { useState, useEffect } from 'react';
import KichuAvatar from './KichuAvatar';
import KichuSpeechBubble from './KichuSpeechBubble';
import AssistantChat from './AssistantChat';
import { AssistantProvider, useAssistant } from './AssistantContext';

function KichuAssistantContent() {
  const { isOpen, setIsOpen, emotion, setEmotion, bubbleText, setBubbleText } = useAssistant();
  const [hasGreeted, setHasGreeted] = useState(false);

  // Initial Greeting Logic
  useEffect(() => {
    if (!hasGreeted) {
      const timer = setTimeout(() => {
        setBubbleText("🙏 Namaskaram! I'm Kichu. Need help shopping?");
        setEmotion('waving');
        setHasGreeted(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasGreeted, setBubbleText, setEmotion]);

  const handleAvatarClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setEmotion('happy');
      setBubbleText("🙏 Namaskaram! How can I help today?");
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end pointer-events-none sm:right-8">
      <div className="pointer-events-auto">
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
