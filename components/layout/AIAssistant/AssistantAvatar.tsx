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
      className="relative z-50 group"
      aria-label="Assistant Kichu"
    >
      <div className="relative w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] lg:w-[90px] lg:h-[90px] bg-white rounded-full border-4 border-white shadow-2xl overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-green-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />

        {/* Main Mascot Image */}
        <Image
          src="/ai-character.png"
          alt="Kichu"
          fill
          className={`object-cover transition-transform duration-500 ${
            emotion === 'thinking' ? 'scale-[3.2] -translate-y-2' : 'scale-[2.8]'
          }`}
          style={{ objectPosition: 'center 42%' }}
          priority
        />

        {/* Procedural Blinking Overlay */}
        {isBlinking && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
             <div className="w-full h-full bg-[#0B5D3B]/5 mix-blend-multiply" />
          </div>
        )}

        {/* Thinking / Listening Sparkle */}
        {emotion === 'thinking' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="w-full h-full border-2 border-dashed border-yellow-400 rounded-full opacity-40" />
          </motion.div>
        )}
      </div>

      {/* Mini "AI" Badge */}
      <span className="absolute -top-1 -right-1 flex h-6 w-6 z-50">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-6 w-6 bg-yellow-500 text-[10px] items-center justify-center font-black text-green-950 shadow-md">AI</span>
      </span>

      {/* Online Pulse */}
      <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full z-50 shadow-sm" />
    </motion.button>
  );
}
