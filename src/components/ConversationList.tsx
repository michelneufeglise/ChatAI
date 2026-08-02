import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Settings, Trash2, Archive, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useChatStore } from '@store/chatStore';
import { AnimatedCard, SlideIn } from './aceternity/AnimatedElements';
import SettingsModal from './SettingsModal';
import './ConversationList.css';

type Platform = 'telegram' | 'whatsapp' | 'ai';

export default function ConversationList() {
  const {
    conversations,
    selectedConversationId,
    selectConversation,
    addConversation,
    setConversations,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState<Platform>('telegram');
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenFor(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreateConversation = async () => {
    if (!newTitle.trim()) return;
    try {
      const conv = await invoke<{
        id: string; title: string; platforms: string;
        avatar: string | null; unread_count: number;
        created_at: string; updated_at: string;
      }>('create_conversation', {
        title: newTitle.trim(),
        platforms: [newPlatform],
      });
      addConversation({
        id: conv.id,
        title: conv.title,
        platforms: [newPlatform],
        avatar: conv.avatar ?? undefined,
        unreadCount: conv.unread_count,
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at),
      });
      setNewTitle('');
      setNewChatOpen(false);
      selectConversation(conv.id);
    } catch (e) {
      console.error('Failed to create conversation:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_conversation', { id });
      setConversations(conversations.filter((c) => c.id !== id));
      setMenuOpenFor(null);
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await invoke('archive_conversation', { id, archive: true });
      setConversations(conversations.filter((c) => c.id !== id));
      setMenuOpenFor(null);
    } catch (e) {
      console.error('Failed to archive conversation:', e);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };
  const itemVariants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };

  return (
    <>
      <SlideIn direction="left">
        <div className="conversation-list">
          {/* Header */}
          <div className="conversation-list-header">
            <div className="header-top">
              <h2>Messages</h2>
              <div className="header-actions">
                <motion.button
                  className="icon-action-btn"
                  title="New conversation"
                  onClick={() => setNewChatOpen(true)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Plus size={18} />
                </motion.button>
                <motion.button
                  className="icon-action-btn"
                  title="Settings"
                  onClick={() => setSettingsOpen(true)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Settings size={18} />
                </motion.button>
              </div>
            </div>
            <div className="search-container">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Conversation Items */}
          <motion.div
            className="conversation-items"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv, index) => (
                <motion.div key={conv.id} variants={itemVariants} className="conv-item-wrapper">
                  <AnimatedCard
                    delay={index * 0.04}
                    hover={false}
                    className={`conversation-item ${selectedConversationId === conv.id ? 'active' : ''}`}
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
                          <span key={platform} className={`platform-badge platform-${platform}`} title={platform}>
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

                  {/* Context Menu Button */}
                  <div className="conv-menu-wrapper" ref={menuOpenFor === conv.id ? menuRef : null}>
                    <button
                      className="conv-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenFor(menuOpenFor === conv.id ? null : conv.id);
                      }}
                      title="Options"
                    >
                      <MoreVertical size={14} />
                    </button>
                    <AnimatePresence>
                      {menuOpenFor === conv.id && (
                        <motion.div
                          className="conv-context-menu"
                          initial={{ opacity: 0, scale: 0.9, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -8 }}
                          transition={{ duration: 0.15 }}
                        >
                          <button
                            className="context-menu-item"
                            onClick={() => handleArchive(conv.id)}
                          >
                            <Archive size={14} /> Archive
                          </button>
                          <button
                            className="context-menu-item danger"
                            onClick={() => handleDelete(conv.id)}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="no-results">
                <p>{searchQuery ? 'No conversations found' : 'No conversations yet'}</p>
                <button className="new-chat-hint-btn" onClick={() => setNewChatOpen(true)}>
                  + Start a new conversation
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </SlideIn>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* New Chat Modal */}
      <AnimatePresence>
        {newChatOpen && (
          <div className="new-chat-overlay">
            <motion.div
              className="new-chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNewChatOpen(false)}
            />
            <motion.div
              className="new-chat-modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <h3>New Conversation</h3>
              <div className="new-chat-form">
                <label htmlFor="newTitle">Name</label>
                <input
                  id="newTitle"
                  type="text"
                  placeholder="Contact or group name"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateConversation()}
                  autoFocus
                />
                <label>Platform</label>
                <div className="platform-select-group">
                  {(['telegram', 'whatsapp', 'ai'] as Platform[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`platform-select-btn ${newPlatform === p ? 'active' : ''}`}
                      onClick={() => setNewPlatform(p)}
                    >
                      {p === 'telegram' && '✈️ Telegram'}
                      {p === 'whatsapp' && '💬 WhatsApp'}
                      {p === 'ai' && '🤖 AI Chat'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="new-chat-footer">
                <button className="cancel-btn" onClick={() => setNewChatOpen(false)}>Cancel</button>
                <button
                  className="create-btn"
                  onClick={handleCreateConversation}
                  disabled={!newTitle.trim()}
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
