import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@store/chatStore';
import { invoke } from '@tauri-apps/api/tauri';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import AISuggestionWidget from './AISuggestionWidget';
import { SlideIn } from './aceternity/AnimatedElements';
import './MessageView.css';

interface MessageViewProps {
  conversationId: string;
}

export default function MessageView({ conversationId }: MessageViewProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    conversations,
    typingStates,
    isOffline,
    addMessage,
    addToOfflineQueue,
    clearOfflineQueue,
    offlineQueue,
    settings,
  } = useChatStore();

  const conversationMessages = messages[conversationId] || [];
  const isTyping = typingStates[conversationId] ?? false;
  const conversation = conversations.find((c) => c.id === conversationId);

  // Auto-scroll to bottom on new messages or typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages.length, isTyping]);

  // Retry offline queue when back online
  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0) {
      const retry = async () => {
        const platform = conversation?.platforms[0] || 'ai';
        for (const msg of offlineQueue) {
          try {
            await invoke('send_message', {
              conversationId: msg.conversationId,
              content: msg.content,
              platform,
            });
          } catch (e) {
            console.error('Failed to retry queued message:', e);
          }
        }
        clearOfflineQueue();
      };
      retry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline]);

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    setInputValue('');
    const platform = conversation?.platforms[0] || 'ai';

    // Optimistic message
    const optimistic: Message = {
      id: `local-${Date.now()}`,
      conversationId,
      platform,
      sender: { id: 'user', name: 'You' },
      content: trimmed,
      timestamp: new Date(),
      status: 'sending',
    };
    addMessage(conversationId, optimistic);

    if (isOffline) {
      addToOfflineQueue(optimistic);
      return;
    }

    setIsLoading(true);
    try {
      await invoke('send_message', {
        conversationId,
        content: trimmed,
        platform,
      });

      // If AI platform, also query Ollama
      if (platform === 'ai') {
        const aiText = await invoke<string>('query_ollama', {
          prompt: trimmed,
          model: settings.ollamaModel,
        });
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          conversationId,
          platform: 'ai',
          sender: { id: 'ai', name: 'ChatAI' },
          content: aiText,
          timestamp: new Date(),
          status: 'delivered',
        };
        addMessage(conversationId, aiMsg);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark optimistic as error
      useChatStore.setState((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId]?.map((m) =>
            m.id === optimistic.id ? { ...m, status: 'error' } : m
          ) || [],
        },
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SlideIn direction="right">
      <div className="message-view">
        {/* Chat header */}
        {conversation && (
          <div className="message-view-header">
            <div className="message-view-avatar">
              {conversation.avatar ? (
                <img src={conversation.avatar} alt={conversation.title} />
              ) : (
                <div className="header-avatar-placeholder">
                  {conversation.title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="platform-dots">
                {conversation.platforms.map((p) => (
                  <span key={p} title={p} className={`platform-dot platform-dot-${p}`}>
                    {p === 'whatsapp' && '💬'}
                    {p === 'telegram' && '✈️'}
                    {p === 'ai' && '🤖'}
                  </span>
                ))}
              </div>
            </div>
            <div className="message-view-meta">
              <h3>{conversation.title}</h3>
              <span className="view-platform-label">
                {conversation.platforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' · ')}
              </span>
            </div>
            <AnimatePresence>
              {isOffline && (
                <motion.div
                  className="offline-indicator"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  ⚡ Offline
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Messages */}
        <div className="messages-container">
          <motion.div
            className="messages-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {conversationMessages.length > 0 ? (
              <>
                {conversationMessages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                  >
                    <MessageBubble message={msg} />
                  </motion.div>
                ))}
                {isTyping && <TypingIndicator />}
              </>
            ) : (
              <div className="messages-empty">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="empty-icon">👋</div>
                  <p>No messages yet. Start the conversation!</p>
                </motion.div>
              </div>
            )}
            <div ref={bottomRef} />
          </motion.div>
        </div>

        {/* AI Suggestion Widget */}
        <AISuggestionWidget
          conversationId={conversationId}
          onSuggestionSelect={(text) => setInputValue(text)}
        />

        {/* Input Area */}
        <div className="message-input-area">
          <motion.div
            className="input-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button className="icon-button" title="Attach file">
              <Paperclip size={18} />
            </button>

            <input
              type="text"
              placeholder={isOffline ? 'Offline — message will be queued…' : 'Type a message…'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="message-input"
              disabled={isLoading}
            />

            <button className="icon-button" title="Emoji picker">
              <Smile size={18} />
            </button>

            <motion.button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="send-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send size={18} />
            </motion.button>
          </motion.div>

          {/* Offline queue indicator */}
          <AnimatePresence>
            {offlineQueue.length > 0 && (
              <motion.div
                className="offline-queue-badge"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {offlineQueue.length} message{offlineQueue.length > 1 ? 's' : ''} queued — will send when online
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SlideIn>
  );
}
