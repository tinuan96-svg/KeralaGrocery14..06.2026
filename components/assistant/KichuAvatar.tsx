'use client';

import { motion, useAnimation, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { kichuVariants } from './KichuAnimations';

interface Props {
  emotion: string;
  isOpen: boolean;
  onClick: () => void;
}

export default function KichuAvatar({ emotion, isOpen, onClick }: Props) {
  const controls = useAnimation();
  const [isBlinking, setIsBlinking] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Mouse Tracking for Eye movement
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isOpen) return;
      const rect = avatarRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distThreshold = 600;

        const dx = (e.clientX - centerX) / distThreshold;
        const dy = (e.clientY - centerY) / distThreshold;

        mouseX.set(Math.max(-12, Math.min(12, dx * 20)));
        mouseY.set(Math.max(-12, Math.min(12, dy * 15)));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen, mouseX, mouseY]);

  // Random Blinking
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, Math.random() * 5000 + 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      ref={avatarRef}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative cursor-pointer group"
    >
      {/* Floor Shadow */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/20 rounded-[100%] blur-lg z-0" />

      {/* Main Mascot Container */}
      <motion.div
        variants={kichuVariants}
        animate={emotion}
        style={{
          x: springX,
          y: springY,
          height: 'var(--kichu-height)',
          width: 'auto',
          transformStyle: 'preserve-3d'
        }}
        className="relative z-10 [--kichu-height:100px] sm:[--kichu-height:120px] lg:[--kichu-height:140px] aspect-[1/1.3]"
      >
        <Image
          src="/assistant/kichu.png"
          alt="Kichu"
          fill
          className="object-contain drop-shadow-xl select-none pointer-events-none"
          priority
          unoptimized
        />

        {/* Procedural Blink Effect */}
        <div
          className="absolute top-[30%] left-[32%] w-[36%] h-[10%] bg-emerald-950/40 rounded-full blur-[1.5px] z-20 pointer-events-none transition-opacity duration-100"
          style={{ opacity: isBlinking ? 1 : 0 }}
        />

        {/* Interactive Glow */}
        <div className="absolute inset-0 bg-green-400/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </motion.div>

      {/* Floating Status Tag */}
      {!isOpen && (
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute -top-4 right-0 bg-[#0B5D3B] text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-white z-30 uppercase flex items-center gap-1"
        >
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Kichu
        </motion.div>
      )}
    </motion.div>
  );
}
