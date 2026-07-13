import { Variants } from 'framer-motion';

/**
 * Premium Bone-Rig Style Animations
 */
export const kichuVariants: Variants = {
  idle: {
    y: [0, -4, 0],
    rotateX: [0, 2, 0],
    rotateY: [-1, 1, -1],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  thinking: {
    y: [0, -3, 0],
    rotate: [-2, 2, -2],
    rotateX: -10,
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: "linear"
    }
  },
  talking: {
    scale: [1, 1.02, 1],
    rotate: [-1, 1, -1],
    y: [0, -2, 0],
    transition: {
      duration: 0.3,
      repeat: Infinity
    }
  },
  happy: {
    scale: [1, 1.1, 1],
    y: [0, -25, 0],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 0.5,
      type: "spring",
      stiffness: 500
    }
  },
  celebrate: {
    y: [0, -40, 0, -40, 0],
    scale: [1, 1.15, 1, 1.15, 1],
    rotate: [0, 10, -10, 10, 0],
    transition: {
      duration: 1.2,
      ease: "easeInOut"
    }
  },
  waving: {
    rotate: [0, 12, -12, 12, -12, 0],
    transition: {
      duration: 1.5,
      ease: "easeInOut"
    }
  },
  lean: {
    rotateY: 10,
    rotateZ: 2,
    x: 5,
    transition: { duration: 0.5 }
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
