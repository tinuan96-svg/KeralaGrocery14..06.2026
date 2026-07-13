import { Variants } from 'framer-motion';

/**
 * Premium Bone-Rig Style Animations
 */
export const kichuVariants: Variants = {
  idle: {
    y: [0, -3, 0],
    rotate: [-0.5, 0.5, -0.5],
    transition: {
      duration: 5,
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
    y: [0, -5, 0],
    rotate: [0, 2, -2, 0],
    scale: 1.02,
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  },
  happy: {
    scale: [1, 1.1, 1],
    y: [0, -15, 0],
    transition: {
      duration: 0.4,
      type: "spring",
      stiffness: 400
    }
  },
  waving: {
    rotate: [0, 8, -8, 8, -8, 0],
    transition: {
      duration: 1.5,
      ease: "easeInOut"
    }
  }
};

export const shadowVariants: Variants = {
  idle: {
    scale: [1, 1.1, 1],
    opacity: [0.2, 0.1, 0.2],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const bubbleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, y: 20, x: 20 },
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
