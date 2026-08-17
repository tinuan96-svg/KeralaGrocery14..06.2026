'use client';

import { useAssistant } from './AssistantContext';

/**
 * Premium Kichu Hooks for external control
 */
export function useKichu() {
  const { setEmotion, setBubbleText, setIsOpen } = useAssistant();

  const celebrateOrder = () => {
    setEmotion('celebrate');
    setBubbleText("🎉 Awesome! Your Kerala groceries are on the way!");
  };

  const recommendProduct = (name: string) => {
    setEmotion('happy');
    setBubbleText(`⭐ I think you'll love this ${name}!`);
  };

  return {
    celebrateOrder,
    recommendProduct,
    setEmotion,
    setBubbleText,
    setIsOpen
  };
}
