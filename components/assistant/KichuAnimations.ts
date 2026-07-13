import { Variants } from 'framer-motion';

export const kichuVariants: Variants = {
  idle: {
    y: [0, -3, 0],
    rotate: [0, 0.5, -0.5, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  breathing: {
    scale: [1, 1.01, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  thinking: {
    y: [0, -4, 0],
    rotate: [-1, 2, -1],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: "linear"
    }
  },
  talking: {
    scale: [1, 1.02, 1],
    y: [0, -2, 0],
    transition: {
      duration: 0.4,
      repeat: Infinity
    }
  },
  happy: {
    scale: [1, 1.15, 1],
    y: [0, -20, 0],
    transition: {
      duration: 0.5,
      type: "spring",
      stiffness: 500
    }
  },
  waving: {
    rotate: [0, 10, -10, 10, -10, 0],
    transition: {
      duration: 1.5
    }
  }
};

export const bubbleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, y: 20, x: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    x: 0,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 200
    }
  },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
};
