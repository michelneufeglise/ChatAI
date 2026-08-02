import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useChatStore } from '@store/chatStore';
import { AnimatedCard, SlideIn } from './aceternity/AnimatedElements';
import './ConversationList.css';

export default function ConversationList() {
  const { conversations, selectedConversationId, selectConversation } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <SlideIn direction="left">
      <div className="conversation-list">
        <div className="conversation-list-header">
          <h2>Messages</h2>
          <div className="search-container">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <motion.div
          className="conversation-items"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv, index) => (
              <motion.div key={conv.id} variants={itemVariants}>
                <AnimatedCard
                  delay={index * 0.05}
                  className={`conversation-item ${
                    selectedConversationId === conv.id ? 'active' : ''
                  }`}
                  onClick={() => selectConversation(conv.id)}
                >
                  <div className="conversation-avatar-wrapper">
                    {conv.avatar ? (
                      <img src={conv.avatar} alt={conv.title} className="conversation-avatar" />
                    ) : (
                      <div className="conversation-avatar-placeholder">
                        {conv.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="platform-indicators">
                      {conv.platforms.map((platform) => (
                        <span
                          key={platform}
                          className={`platform-badge platform-${platform}`}
                          title={platform}
                        >
                          {platform === 'whatsapp' && '💬'}
                          {platform === 'telegram' && '✈️'}
                          {platform === 'ai' && '🤖'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="conversation-info">
                    <div className="conversation-header">
                      <h3>{conv.title}</h3>
                      {conv.unreadCount > 0 && (
                        <motion.span
                          className="badge"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          {conv.unreadCount}
                        </motion.span>
                      )}
                    </div>
                    <p className="last-message">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>

                  <div className="conversation-item-bg" />
                </AnimatedCard>
              </motion.div>
            ))
          ) : (
            <div className="no-results">
              <p>No conversations found</p>
            </div>
          )}
        </motion.div>
      </div>
    </SlideIn>
  );
}
