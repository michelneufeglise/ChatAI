import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';
import { Conversation, Message } from '@/types';

interface ChatStore {
  conversations: Conversation[];
  selectedConversationId: string | null;
  messages: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
  settings: Record<string, string>;
  isOffline: boolean;
  offlineQueue: Message[];
  suggestions: Record<string, string[]>;
  typingStates: Record<string, boolean>;

  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  selectConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  setOffline: (offline: boolean) => void;
  addToOfflineQueue: (message: Message) => void;
  clearOfflineQueue: () => void;
  setSuggestions: (conversationId: string, suggestions: string[]) => void;
  setTypingState: (conversationId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  messages: {},
  loading: false,
  error: null,
  settings: {
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'mistral',
    telegramToken: '',
    theme: 'dark',
    whatsappSession: './whatsapp_session',
  },
  isOffline: !navigator.onLine,
  offlineQueue: [],
  suggestions: {},
  typingStates: {},

  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),
  selectConversation: (id) => set({ selectedConversationId: id }),
  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: messages,
      },
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  loadSettings: async () => {
    try {
      const keys = ['ollamaUrl', 'ollamaModel', 'telegramToken', 'theme', 'whatsappSession'];
      const loaded: Record<string, string> = { ...get().settings };
      for (const key of keys) {
        const val = await invoke<string | null>('get_setting', { key });
        if (val) {
          loaded[key] = val;
        }
      }
      set({ settings: loaded });
      // Apply theme class
      const root = window.document.documentElement;
      if (loaded.theme === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
      }
    } catch (e) {
      console.error('Failed to load settings from DB:', e);
    }
  },

  setSetting: async (key, value) => {
    try {
      await invoke('set_setting', { key, value });
      set((state) => {
        const newSettings = { ...state.settings, [key]: value };
        const root = window.document.documentElement;
        if (key === 'theme') {
          if (value === 'light') {
            root.classList.remove('dark');
            root.classList.add('light');
          } else {
            root.classList.remove('light');
            root.classList.add('dark');
          }
        }
        return { settings: newSettings };
      });
    } catch (e) {
      console.error(`Failed to set setting ${key}:`, e);
    }
  },

  setOffline: (offline) => set({ isOffline: offline }),
  addToOfflineQueue: (message) =>
    set((state) => ({ offlineQueue: [...state.offlineQueue, message] })),
  clearOfflineQueue: () => set({ offlineQueue: [] }),
  setSuggestions: (conversationId, suggestions) =>
    set((state) => ({
      suggestions: { ...state.suggestions, [conversationId]: suggestions },
    })),
  setTypingState: (conversationId, isTyping) =>
    set((state) => ({
      typingStates: { ...state.typingStates, [conversationId]: isTyping },
    })),
}));
