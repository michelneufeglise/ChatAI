import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  onClick?: () => void;
}

export function AnimatedCard({
  children,
  className = '',
  delay = 0,
  hover = true,
  onClick,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={hover ? { y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' } : {}}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

interface GradientBorderProps {
  children: ReactNode;
  className?: string;
}

export function GradientBorder({ children, className = '' }: GradientBorderProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-lg opacity-20 blur" />
      <div className="relative bg-black rounded-lg border border-white/10">{children}</div>
    </div>
  );
}

interface FadeInProps {
  children: ReactNode;
  duration?: number;
  delay?: number;
}

export function FadeIn({ children, duration = 0.3, delay = 0 }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  );
}

interface SlideInProps {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
}

export function SlideIn({ children, direction = 'left', duration = 0.3 }: SlideInProps) {
  const variants = {
    left: { initial: { opacity: 0, x: -50 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: 50 }, animate: { opacity: 1, x: 0 } },
    up: { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 } },
    down: { initial: { opacity: 0, y: -50 }, animate: { opacity: 1, y: 0 } },
  };

  return (
    <motion.div
      variants={variants[direction]}
      initial="initial"
      animate="animate"
      transition={{ duration }}
    >
      {children}
    </motion.div>
  );
}
