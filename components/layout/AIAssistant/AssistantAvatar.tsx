'use client';

import { motion, useAnimation } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAssistant } from './AssistantContext';

export default function AssistantAvatar() {
  const { emotion, isOpen, setIsOpen, setEmotion, setBubbleText } = useAssistant();
  const controls = useAnimation();
  const [isBlinking, setIsBlinking] = useState(false);

  // 1. Initial Greeting Wave
  useEffect(() => {
    const greeting = setTimeout(() => {
      setBubbleText("🙏 Namaskaram!\nI'm Kichu.\nYour Kerala Grocery Assistant.");
      setEmotion('waving');
      controls.start({
        rotate: [0, 15, -15, 15, -15, 0],
        transition: { duration: 1.5 }
      });
    }, 2000);
    return () => clearTimeout(greeting);
  }, [setBubbleText, setEmotion, controls]);

  // 2. Natural Idle Loop (Breathing/Floating)
  useEffect(() => {
    const float = async () => {
      await controls.start({
        y: [0, -5, 0],
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
      });
    };
    float();
  }, [controls]);

  // 2. Periodic Blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, Math.random() * 3000 + 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // 3. Periodic Random Animations (Wave/Tilt)
  useEffect(() => {
    const randomAnim = setInterval(() => {
      if (!isOpen) {
        const anims = ['wave', 'tilt', 'bounce'];
        const chosen = anims[Math.floor(Math.random() * anims.length)];

        if (chosen === 'wave') {
          controls.start({ rotate: [0, 10, -10, 10, 0], transition: { duration: 1 } });
        } else if (chosen === 'tilt') {
          controls.start({ rotate: [0, 5, 0], transition: { duration: 2 } });
        } else {
          controls.start({ y: [0, -10, 0], transition: { duration: 0.5 } });
        }
      }
    }, 10000);
    return () => clearInterval(randomAnim);
  }, [isOpen, controls]);

  const handleClick = () => {
    setIsOpen(!isOpen);
    setEmotion('happy');
    controls.start({
      scale: [1, 1.2, 1],
      transition: { duration: 0.3 }
    });
  };

  return (
    <motion.button
      onClick={handleClick}
      animate={controls}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative z-50 group flex items-end justify-center"
      aria-label="Assistant Kichu"
    >
      <div className="relative h-[75px] w-auto sm:h-[90px] lg:h-[110px] aspect-[1/1.4] transition-all duration-300">
        {/* Glow Effect (Soft radial behind) */}
        <div className="absolute inset-0 bg-green-400/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150 pointer-events-none" />

        {/* Main Mascot Image - FULL BODY, NO CROPPING */}
        <Image
          src="/ai-character.png"
          alt="Kichu"
          fill
          className="object-contain transition-transform duration-500 overflow-visible"
          priority
          onError={(e) => {
            (e.currentTarget as any).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E👩‍💼%3C/text%3E%3C/svg%3E";
          }}
        />
      </div>

      {/* Mini "AI" Badge */}
      <span className="absolute top-0 right-0 flex h-6 w-6 z-50">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-6 w-6 bg-yellow-500 text-[10px] items-center justify-center font-black text-green-950 shadow-md">AI</span>
      </span>

      {/* Online Pulse */}
      <div className="absolute bottom-1 left-2 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full z-50 shadow-sm" />
    </motion.button>
  );
}
