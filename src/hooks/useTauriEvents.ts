import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useChatStore } from '@store/chatStore';
import { Message } from '@/types';

interface TauriMessageEvent {
  id: string;
  conversationId: string;
  platform: 'whatsapp' | 'telegram' | 'ai';
  sender: { id: string; name: string; avatar?: string };
  content: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
}

interface StatusUpdateEvent {
  id: string;
  conversationId: string;
  status: Message['status'];
}

interface TypingEvent {
  conversationId: string;
  isTyping: boolean;
}

export function useTauriEvents() {
  const { addMessage, setTypingState } = useChatStore();

  useEffect(() => {
    let unlistenMessage: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;
    let unlistenTyping: (() => void) | undefined;

    const setup = async () => {
      // Listen for new incoming messages
      unlistenMessage = await listen<TauriMessageEvent>('new-message', (event) => {
        const raw = event.payload;
        const message: Message = {
          id: raw.id,
          conversationId: raw.conversationId,
          platform: raw.platform,
          sender: raw.sender,
          content: raw.content,
          timestamp: new Date(raw.timestamp),
          status: raw.status,
        };
        addMessage(message.conversationId, message);
      });

      // Listen for message status updates (sent → delivered → read)
      unlistenStatus = await listen<StatusUpdateEvent>('message-status-update', (event) => {
        const { conversationId, id, status } = event.payload;
        // Update message status in store
        useChatStore.setState((state) => {
          const msgs = state.messages[conversationId];
          if (!msgs) return state;
          return {
            messages: {
              ...state.messages,
              [conversationId]: msgs.map((m) =>
                m.id === id ? { ...m, status } : m
              ),
            },
          };
        });
      });

      // Listen for typing state changes
      unlistenTyping = await listen<TypingEvent>('typing-state', (event) => {
        const { conversationId, isTyping } = event.payload;
        setTypingState(conversationId, isTyping);
      });
    };

    setup().catch(console.error);

    return () => {
      unlistenMessage?.();
      unlistenStatus?.();
      unlistenTyping?.();
    };
  }, [addMessage, setTypingState]);

  // Network online/offline detection
  useEffect(() => {
    const handleOnline = () => useChatStore.setState({ isOffline: false });
    const handleOffline = () => useChatStore.setState({ isOffline: true });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
}
