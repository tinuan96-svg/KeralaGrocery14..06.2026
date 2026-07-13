'use client';

import { motion, useAnimation, useMotionValue, useSpring } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useAssistant } from '../AssistantContext';
import { kichuVariants, shadowVariants } from '../AssistantAnimations';

export default function AssistantCharacter() {
  const { emotion, isOpen, setIsOpen, setEmotion, setBubbleText } = useAssistant();
  const controls = useAnimation();
  const [isBlinking, setIsBlinking] = useState(false);
  const characterRef = useRef<HTMLDivElement>(null);

  // Mouse Tracking for "Eyes follow cursor"
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isOpen) return;
      const rect = characterRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distThreshold = 500;

        const dx = (e.clientX - centerX) / distThreshold;
        const dy = (e.clientY - centerY) / distThreshold;

        mouseX.set(Math.max(-10, Math.min(10, dx * 15)));
        mouseY.set(Math.max(-10, Math.min(10, dy * 10)));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen, mouseX, mouseY]);

  // 1. Random Blinking
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, Math.random() * 4000 + 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    setIsOpen(!isOpen);
    setEmotion('happy');
    setBubbleText("🙏 Let's shop together!");
  };

  return (
    <div
      className="relative group cursor-pointer perspective-1000"
      ref={characterRef}
      onClick={handleClick}
      style={{ isolation: 'isolate' }}
    >
      {/* Floor Shadow - Dynamic Scaling */}
      <motion.div
        variants={shadowVariants}
        animate="idle"
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black/15 rounded-[100%] blur-lg z-0"
      />

      {/* Main Character Body - High Fidelity Rigged Style */}
      <motion.div
        variants={kichuVariants}
        animate={emotion === 'idle' ? 'idle' : emotion}
        style={{
          x: springX,
          y: springY,
          height: 'var(--kichu-height)',
          width: 'auto',
          transformStyle: 'preserve-3d',
        }}
        className="relative z-10 [--kichu-height:120px] sm:[--kichu-height:145px] lg:[--kichu-height:170px] aspect-[1/1.3]"
      >
        {/* Layered Character System */}
        <div className="relative w-full h-full">
          {/* Main Body Layer */}
          <Image
            src="/ai-character.png"
            alt="Kichu Mascot"
            fill
            className="object-contain select-none pointer-events-none transition-all duration-500"
            style={{
              filter: emotion === 'happy' ? 'brightness(1.05) contrast(1.05)' : 'none'
            }}
            priority
          />

          {/* Eye & Blink Mask (Procedural) */}
          <AnimatePresence>
            {isBlinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-[28%] left-[30%] w-[40%] h-[12%] bg-emerald-900/40 rounded-full blur-[2px] z-20 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Glow Interaction (Ambient) */}
          <div className="absolute inset-0 bg-gradient-to-t from-green-400/10 to-transparent blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </div>
      </motion.div>

      {/* "AI" Floating Tag - Premium Styling */}
      {!isOpen && (
        <motion.div
          animate={{ y: [0, -6, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute -top-6 right-0 bg-[#0B5D3B] text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-2xl border-2 border-white z-30 flex items-center gap-1 uppercase tracking-tighter"
        >
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Live
        </motion.div>
      )}
    </div>
  );
}
