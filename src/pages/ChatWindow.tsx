import { useEffect } from 'react';
import { useChatStore } from '@store/chatStore';
import { loadConversations } from '@services/messageService';
import ConversationList from '@components/ConversationList';
import MessageView from '@components/MessageView';
import './ChatWindow.css';

export default function ChatWindow() {
  const { selectedConversationId, setConversations, setLoading } = useChatStore();

  useEffect(() => {
    const initConversations = async () => {
      setLoading(true);
      try {
        const conversations = await loadConversations();
        setConversations(conversations);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    initConversations();
  }, []);

  return (
    <div className="chat-window">
      <div className="chat-sidebar">
        <ConversationList />
      </div>
      <div className="chat-main">
        {selectedConversationId ? (
          <MessageView conversationId={selectedConversationId} />
        ) : (
          <div className="chat-empty">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
