import { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatStore } from '@store/chatStore';
import MessageBubble from './MessageBubble';
import { SlideIn } from './aceternity/AnimatedElements';
import './MessageView.css';

interface MessageViewProps {
  conversationId: string;
}

export default function MessageView({ conversationId }: MessageViewProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { messages, addMessage } = useChatStore();

  const conversationMessages = messages[conversationId] || [];

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    try {
      // This will be connected to the backend message service
      const trimmedInput = inputValue.trim();
      setInputValue('');
      // Simulate message addition
      console.log('Sending message:', trimmedInput);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SlideIn direction="right">
      <div className="message-view">
        <div className="messages-container">
          <motion.div
            className="messages-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {conversationMessages.length > 0 ? (
              conversationMessages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <MessageBubble message={msg} />
                </motion.div>
              ))
            ) : (
              <div className="messages-empty">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="empty-icon">👋</div>
                  <p>No messages yet. Start the conversation!</p>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>

        <div className="message-input-area">
          <motion.div
            className="input-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button className="icon-button" title="Attach file">
              <Paperclip size={20} />
            </button>

            <input
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="message-input"
              disabled={isLoading}
            />

            <button className="icon-button" title="Emoji picker">
              <Smile size={20} />
            </button>

            <motion.button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="send-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send size={20} />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </SlideIn>
  );
}
