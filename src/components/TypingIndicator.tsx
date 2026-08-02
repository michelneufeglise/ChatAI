import { motion } from 'framer-motion';
import './TypingIndicator.css';

export default function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="typing-avatar-placeholder">AI</div>
      <div className="typing-dots">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="typing-dot"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
