import { Variants } from 'framer-motion';

export const avatarVariants: Variants = {
  idle: {
    y: [0, -5, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  thinking: {
    scale: [1, 1.05, 1],
    rotate: [0, 2, -2, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  },
  happy: {
    scale: [1, 1.2, 1],
    y: [0, -10, 0],
    transition: {
      duration: 0.3
    }
  },
  waving: {
    rotate: [0, 15, -15, 15, -15, 0],
    transition: {
      duration: 1.5
    }
  }
};

export const chatVariants: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { opacity: 0, y: 50, scale: 0.95, transition: { duration: 0.2 } }
};
