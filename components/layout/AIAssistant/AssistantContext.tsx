'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AssistantEmotion = 'idle' | 'happy' | 'thinking' | 'talking' | 'celebrate' | 'confused' | 'waving' | 'excited';

interface AssistantContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  emotion: AssistantEmotion;
  setEmotion: (emotion: AssistantEmotion) => void;
  bubbleText: string | null;
  setBubbleText: (text: string | null) => void;
  isThinking: boolean;
  setIsThinking: (thinking: boolean) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [emotion, setEmotion] = useState<AssistantEmotion>('idle');
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  return (
    <AssistantContext.Provider value={{
      isOpen, setIsOpen,
      emotion, setEmotion,
      bubbleText, setBubbleText,
      isThinking, setIsThinking
    }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
}
