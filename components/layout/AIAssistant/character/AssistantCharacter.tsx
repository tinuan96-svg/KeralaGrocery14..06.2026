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
    <div className="relative group cursor-pointer" ref={characterRef} onClick={handleClick}>
      {/* Floor Shadow */}
      <motion.div
        variants={shadowVariants}
        animate="idle"
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/20 rounded-[100%] blur-md z-0"
      />

      {/* Main Character Body (Stand alone) */}
      <motion.div
        variants={kichuVariants}
        animate={emotion === 'idle' ? 'idle' : emotion}
        style={{
          x: springX,
          y: springY,
          height: 'var(--kichu-height)',
          width: 'auto',
        }}
        className="relative z-10 [--kichu-height:100px] sm:[--kichu-height:120px] lg:[--kichu-height:140px] aspect-[1/1.4]"
      >
        <Image
          src="/ai-character.png"
          alt="Kichu Mascot"
          fill
          className="object-contain drop-shadow-md select-none pointer-events-none"
          priority
        />

        {/* Eye Interaction Mask (Procedural Blinking) */}
        {isBlinking && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            {/* Soft darken overlay on the eye region */}
            <div className="w-1/2 h-1/2 bg-[#0B5D3B]/5 mix-blend-multiply rounded-full blur-md" />
          </div>
        )}

        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-green-400/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>

      {/* "AI" floating badge */}
      {!isOpen && (
        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-4 -right-2 bg-yellow-500 text-green-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-white z-30"
        >
          AI
        </motion.span>
      )}
    </div>
  );
}
