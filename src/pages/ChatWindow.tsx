import { useEffect } from 'react';
import { useChatStore } from '@store/chatStore';
import { loadConversations } from '@services/messageService';
import { useTauriEvents } from '@hooks/useTauriEvents';
import ConversationList from '@components/ConversationList';
import MessageView from '@components/MessageView';
import './ChatWindow.css';

export default function ChatWindow() {
  const { selectedConversationId, setConversations, setLoading, loadSettings, isOffline } =
    useChatStore();

  // Wire real-time Tauri events (messages, status, typing)
  useTauriEvents();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadSettings();
        const conversations = await loadConversations();
        // Map snake_case from Rust to camelCase for the store
        type RawConversation = {
          id: string; title: string; platforms: string;
          avatar: string | null; unread_count: number;
          created_at: string; updated_at: string;
        };
        const mapped = (conversations as unknown as RawConversation[]).map((c) => ({
          id: c.id,
          title: c.title,
          platforms: (JSON.parse(c.platforms) as string[]) as ('whatsapp' | 'telegram' | 'ai')[],
          avatar: c.avatar ?? undefined,
          unreadCount: c.unread_count,
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at),
        }));
        setConversations(mapped);
      } catch (error) {
        console.error('Failed to initialise ChatAI:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  return (
    <div className="chat-window">
      {/* Offline global banner */}
      {isOffline && (
        <div className="offline-banner">
          ⚡ You are offline — messages will be queued and sent when connectivity is restored
        </div>
      )}

      <div className="chat-sidebar">
        <ConversationList />
      </div>

      <div className="chat-main">
        {selectedConversationId ? (
          <MessageView conversationId={selectedConversationId} />
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-content">
              <div className="chat-empty-icon">💬</div>
              <h2>Welcome to ChatAI</h2>
              <p>Select a conversation to start chatting, or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
