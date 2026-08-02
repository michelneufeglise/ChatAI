import { Message } from '@types/index';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Clock } from 'lucide-react';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isAI = message.platform === 'ai';
  const isSending = message.status === 'sending';

  const statusIcon = {
    sending: <Clock size={12} />,
    sent: <Check size={12} />,
    delivered: <CheckCheck size={12} />,
    read: <CheckCheck size={12} />,
    error: <span>❌</span>,
  }[message.status];

  return (
    <motion.div
      className={`message-bubble ${isAI ? 'ai' : 'user'}`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {message.sender.avatar && (
        <motion.img
          src={message.sender.avatar}
          alt={message.sender.name}
          className="avatar"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      <motion.div
        className="message-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="sender-info">
          <span className="sender-name">{message.sender.name}</span>
          {message.platform !== 'user' && (
            <span className={`platform-badge platform-${message.platform}`}>
              {message.platform === 'whatsapp' && '💬 WhatsApp'}
              {message.platform === 'telegram' && '✈️ Telegram'}
              {message.platform === 'ai' && '🤖 ChatAI'}
            </span>
          )}
        </div>

        <p className="message-text">{message.content}</p>

        <div className="message-footer">
          <span className="timestamp">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isAI && (
            <span className={`status-icon ${message.status}`}>{statusIcon}</span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
